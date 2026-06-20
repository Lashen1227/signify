import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_FILES = [".env", ".env.local"];

function parseEnv(content: string) {
  const entries: Array<[string, string]> = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return entries;
}

export function loadServerEnv() {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const serverRoot = join(moduleDir, "..");
  const cwd = process.cwd();
  const searchRoots = [cwd, serverRoot];
  const seen = new Set<string>();

  for (const root of searchRoots) {
    for (const file of ENV_FILES) {
      const path = join(root, file);
      if (seen.has(path)) continue;
      seen.add(path);

      try {
        const raw = readFileSync(path, "utf8");
        for (const [key, value] of parseEnv(raw)) {
          if (process.env[key] == null) {
            process.env[key] = value;
          }
        }
      } catch {
        // Ignore missing env files.
      }
    }
  }
}

loadServerEnv();
