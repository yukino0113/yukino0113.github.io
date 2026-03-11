import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(currentFilePath), "..");
const outDir = path.join(root, "public");

const entries = [
  "index.html",
  "rsvp.html",
  "invite.html",
  "submitted.html",
  "guestbook.html",
  "donate.html",
  "guestbook-thanks.html",
  "config.js",
  "assets"
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of entries) {
  const src = path.join(root, entry);
  const dst = path.join(outDir, entry);

  if (!fs.existsSync(src)) {
    console.error(`缺少必要檔案: ${src}`);
    process.exit(1);
  }

  fs.cpSync(src, dst, { recursive: true });
}

console.log(`已產生部署目錄: ${outDir}`);
