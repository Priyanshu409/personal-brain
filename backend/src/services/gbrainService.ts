import { spawn } from "node:child_process";

export interface GBrainSearchResult {
  raw: string;
}

export class GBrainService {
  private readonly gbrainCommand = "gbrain";

  private run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.gbrainCommand, args, {
        shell: true,
        windowsHide: true,
        env: {
          ...process.env,
        },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `GBrain command failed (${code}): ${stderr || stdout}`
            )
          );

          return;
        }

        resolve(stdout);
      });
    });
  }

  async search(query: string): Promise<GBrainSearchResult> {
    const output = await this.run([
      "search",
      query,
    ]);

    return {
      raw: output,
    };
  }
}