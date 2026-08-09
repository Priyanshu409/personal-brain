import type { BrainDocument } from "../types/brain";

export interface PersonalDataConnector {
  getName(): string;

  sync(): Promise<BrainDocument[]>;

  search(query: string): Promise<BrainDocument[]>;
}