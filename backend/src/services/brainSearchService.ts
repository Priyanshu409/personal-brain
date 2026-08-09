import { GBrainService } from "./gbrainService";

export interface BrainSearchPort {
  search(query: string): Promise<string>;
}

export class BrainSearchService {
  constructor(
    private readonly brain: BrainSearchPort = new GBrainService()
  ) {}

  async search(query: string): Promise<string> {
    if (!query.trim()) {
      throw new Error("Search query is required");
    }

    return this.brain.search(query);
  }
}