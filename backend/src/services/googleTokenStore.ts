import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Credentials } from "google-auth-library";

const TOKEN_DIRECTORY = join(process.cwd(), ".tokens");
const TOKEN_FILE = join(TOKEN_DIRECTORY, "google.json");

export async function saveGoogleTokens(tokens: Credentials) {
  await mkdir(TOKEN_DIRECTORY, {
    recursive: true,
  });

  await Bun.write(
    TOKEN_FILE,
    JSON.stringify(tokens, null, 2)
  );
}

export async function getGoogleTokens(): Promise<Credentials | null> {
  const file = Bun.file(TOKEN_FILE);

  if (!(await file.exists())) {
    return null;
  }

  return (await file.json()) as Credentials;
}