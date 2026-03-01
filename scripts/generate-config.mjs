import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFilePath), "..");
const envPath = path.join(projectRoot, ".env");
const outputPath = path.join(projectRoot, "config.js");
const appEnv = resolveAppEnv();

const keys = [
  "APPS_SCRIPT_URL",
  "WEDDING_ACCESS_PASSWORD",
  "VERSION",
  "EVENT_COUPLE",
  "EVENT_DATE",
  "EVENT_VENUE",
  "EVENT_DEADLINE"
];
const parsedEnv = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};
const processEnv = pickProcessEnv(keys);
const env = appEnv === "production" ? processEnv : { ...parsedEnv, ...processEnv };
if (!env.WEDDING_ACCESS_PASSWORD && env.ACCESS_PASSWORD) {
  env.WEDDING_ACCESS_PASSWORD = env.ACCESS_PASSWORD;
}

const requiredKeys = [
  "APPS_SCRIPT_URL",
  "WEDDING_ACCESS_PASSWORD",
  "EVENT_COUPLE",
  "EVENT_DATE",
  "EVENT_VENUE",
  "EVENT_DEADLINE"
];

const missing = requiredKeys.filter((k) => !env[k]);
if (missing.length) {
  const source = appEnv === "production" ? "GitHub Environment" : ".env 或 process env";
  console.error(`缺少必要設定: ${missing.join(", ")}（請設定 ${source}）`);
  process.exit(1);
}

const configContent = `window.APP_CONFIG = ${JSON.stringify(
  {
    APPS_SCRIPT_URL: env.APPS_SCRIPT_URL,
    WEDDING_ACCESS_PASSWORD: env.WEDDING_ACCESS_PASSWORD,
    VERSION: env.VERSION || "v1.2.1",
    EVENT: {
      COUPLE: env.EVENT_COUPLE,
      DATE: env.EVENT_DATE,
      VENUE: env.EVENT_VENUE,
      DEADLINE: env.EVENT_DEADLINE
    }
  },
  null,
  2
)};\n`;

fs.writeFileSync(outputPath, configContent, "utf8");
console.log(`已產生 ${outputPath} (mode=${appEnv})`);

function resolveAppEnv() {
  const mode = String(process.env.APP_ENV || process.env.NODE_ENV || "").toLowerCase();
  return mode === "production" ? "production" : "local";
}

function parseEnv(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function pickProcessEnv(keys) {
  const out = {};
  keys.forEach((key) => {
    if (process.env[key]) {
      out[key] = process.env[key];
    }
  });
  return out;
}
