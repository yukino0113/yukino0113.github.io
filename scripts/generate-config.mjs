import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(projectRoot, ".env");
const outputPath = path.join(projectRoot, "config.js");

const parsedEnv = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};
const env = {
  ...parsedEnv,
  ...pickProcessEnv([
    "APPS_SCRIPT_URL",
    "VERSION",
    "EVENT_COUPLE",
    "EVENT_DATE",
    "EVENT_VENUE",
    "EVENT_DEADLINE"
  ])
};

const requiredKeys = [
  "APPS_SCRIPT_URL",
  "EVENT_COUPLE",
  "EVENT_DATE",
  "EVENT_VENUE",
  "EVENT_DEADLINE"
];

const missing = requiredKeys.filter((k) => !env[k]);
if (missing.length) {
  console.error(`缺少必要設定: ${missing.join(", ")}（請設定 .env 或 GitHub Environment）`);
  process.exit(1);
}

const configContent = `window.APP_CONFIG = ${JSON.stringify(
  {
    APPS_SCRIPT_URL: env.APPS_SCRIPT_URL,
    VERSION: env.VERSION || "v1.2.0",
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

function pickProcessEnv(keys) {
  const out = {};
  keys.forEach((key) => {
    if (process.env[key]) {
      out[key] = process.env[key];
    }
  });
  return out;
}
