export type BrainSource = "gmail" | "drive" | "slack";

export interface BrainDocument {
  id: string;
  source: BrainSource;

  title: string;
  content: string;

  url?: string;

  mimeType?: string;

  createdAt?: string;
  updatedAt?: string;

  metadata: Record<string, unknown>;
}

export interface BrainSearchResult {
  score: number;
  id: string;
  source: BrainSource;
  title: string;
  content: string;
}