export type BrainSource = "gmail" | "drive";

export interface BrainDocument {
  id: string;
  source: BrainSource;

  title: string;
  content: string;

  url?: string;

  createdAt?: string;
  updatedAt?: string;

  metadata: Record<string, unknown>;
}