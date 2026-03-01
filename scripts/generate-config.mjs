import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(projectRoot, ".env");
const outputPath = path.join(projectRoot, "config.js");

if (!fs.existsSync(envPath)) {
  console.error("找不到 .env，請先建立 .env（可由 .env.example 複製）");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));

const requiredKeys = [
  "APPS_SCRIPT_URL",
  "ACCESS_PASSWORD",
  "EVENT_COUPLE",
  "EVENT_DATE",
  "EVENT_VENUE",
  "EVENT_DEADLINE"
];

const missing = requiredKeys.filter((k) => !env[k]);
if (missing.length) {
  console.error(`.env 缺少必要欄位: ${missing.join(", ")}`);
  process.exit(1);
}

const configContent = `window.APP_CONFIG = ${JSON.stringify(
  {
    APPS_SCRIPT_URL: env.APPS_SCRIPT_URL,
    ACCESS_PASSWORD: env.ACCESS_PASSWORD,
    VERSION: env.VERSION || "v1.1.0",
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
console.log(`已產生 ${outputPath}`);

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
