import { GBrainService } from "./gbrainService";

export interface BrainSearchResult {
  score: number;
  id: string;
  source: "gmail" | "drive" | "slack";
  title: string;
  content: string;
}

export interface BrainSearchResponse {
  query: string;
  count: number;
  results: BrainSearchResult[];
}

export interface BrainSearchPort {
  search(query: string): Promise<BrainSearchResponse>;
}

export class BrainSearchService {
  constructor(
    private readonly brain: BrainSearchPort =
      new GBrainService()
  ) {}

  async search(
    query: string
  ): Promise<BrainSearchResponse> {
    if (!query.trim()) {
      throw new Error(
        "Search query is required"
      );
    }

    return this.brain.search(query);
  }
}