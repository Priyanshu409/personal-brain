import {
  BrainSearchService,
  type BrainSearchResult,
} from "./brainSearchService";

export interface BrainSource {
  id: string;
  source: "gmail" | "drive";
  title: string;
  score: number;
}

export interface BrainAnswerResponse {
  query: string;
  answer: string;
  sources: BrainSource[];
}

export class BrainAnswerService {
  constructor(
    private readonly searchService = new BrainSearchService()
  ) {}

  async ask(query: string): Promise<BrainAnswerResponse> {
    if (!query.trim()) {
      throw new Error("Question is required");
    }

    /*
     * Search Personal Brain
     */
    const search =
      await this.searchService.search(query);

    /*
     * Only use results that actually contain content.
     */
    const results =
      search.results
        .filter(
          (result) =>
            result.content.trim().length > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 5);

    /*
     * Nothing useful was found.
     */
    if (results.length === 0) {
      return {
        query,
        answer:
          "I couldn't find enough relevant information in your Personal Brain to answer that.",
        sources: [],
      };
    }

    /*
     * Decide which documents should be given
     * to the local LLM.
     *
     * Small local models such as llama3.2:3b
     * can get distracted when unrelated documents
     * are included.
     *
     * If the first result is clearly better than
     * the second result, use ONLY the first result.
     */
    const answerResults =
      this.selectAnswerResults(results);

    console.log(
      "Brain answer sources:",
      answerResults.map(
        (result) => ({
          title: result.title,
          source: result.source,
          score: result.score,
        })
      )
    );

    const context =
      this.buildContext(answerResults);

    const answer =
      await this.generateAnswer(
        query,
        context
      );

    return {
      query,
      answer,
      sources: results.map(
        (result) => ({
          id: result.id,
          source: result.source,
          title: result.title,
          score: result.score,
        })
      ),
    };
  }

  /*
   * Select the most useful sources for the LLM.
   */
  private selectAnswerResults(
    results: BrainSearchResult[]
  ): BrainSearchResult[] {
    if (results.length === 1) {
      return results;
    }

    const first =
      results[0];

    const second =
      results[1];

    if (!first || !second) {
      return results.slice(0, 1);
    }

    const scoreGap =
      first.score - second.score;

    /*
     * If the top result is significantly more
     * relevant than the next result, trust it.
     *
     * Example:
     *
     * Noida Jobs       0.9257
     * Gmail            0.6513
     *
     * Gap = 0.2744
     *
     * Therefore only Noida Jobs is sent to Ollama.
     */
    if (scoreGap >= 0.15) {
      return [first];
    }

    /*
     * Otherwise allow several relevant sources.
     */
    return results.slice(0, 5);
  }

  /*
   * Build a very explicit context for Ollama.
   */
  private buildContext(
    results: BrainSearchResult[]
  ): string {
    return results
      .map(
        (result, index) =>
          `
SOURCE ${index + 1}

Relevance score: ${result.score}

Title:
${result.title}

Source type:
${result.source}

Content:
${result.content}
`
      )
      .join(
        "\n\n==============================\n\n"
      );
  }

  /*
   * Generate answer using local Ollama.
   */
  private async generateAnswer(
    query: string,
    context: string
  ): Promise<string> {
    const model =
      process.env.OLLAMA_MODEL ??
      "llama3.2:3b";

    const prompt = `
You are the Personal Brain assistant.

Your job is to answer the user's question using ONLY
the information contained in the Personal Brain source
provided below.

IMPORTANT RULES:

1. Answer the USER QUESTION directly.

2. Use ONLY the supplied Personal Brain source.

3. The highest-scoring source is the primary source.

4. Ignore unrelated sources when the highest-scoring source
   clearly answers the question.

5. Do not summarize unrelated emails.

6. If the source contains a list of companies and jobs,
   extract the company names and their corresponding roles.

7. If the same company appears multiple times with different
   roles, COMBINE those roles into ONE company entry.

8. Never repeat the same company name multiple times.

9. Preserve the roles associated with each company.

10. Do not invent jobs or companies.

11. If the source says companies "might be hiring", preserve
    that uncertainty by saying "might be hiring" rather than
    claiming they definitely have open positions.

12. Do not mention relevance scores.

13. Do not mention internal source IDs.

14. Do not discuss the source itself unless necessary.

15. Answer the user's actual question, not a question contained
    inside an email.

16. Keep the answer concise and readable.

17. When listing companies, use this format:

    1. Company Name — Role 1, Role 2
    2. Company Name — Role 1
    3. Company Name — Role 1, Role 2

18. Do not add unnecessary commentary after the list.

USER QUESTION:
${query}

PERSONAL BRAIN SOURCE:
${context}

Now answer the USER QUESTION directly.
`;

    const response =
      await fetch(
        "http://localhost:11434/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
              temperature: 0.1,
            },
          }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Ollama API failed (${response.status}): ${errorText}`
      );
    }

    const data =
      await response.json() as {
        response?: string;
      };

    if (
      !data.response ||
      !data.response.trim()
    ) {
      throw new Error(
        "Ollama returned an empty answer"
      );
    }

    return data.response.trim();
  }
}