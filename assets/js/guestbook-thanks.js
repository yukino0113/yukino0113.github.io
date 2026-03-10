import { getConfig } from "./app-config.js";
import { playLogs } from "./log-player.js";

const config = getConfig();
const footerVersion = document.getElementById("footer-version");

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}

playLogs("guestbookThanks", {
  consoleNode: document.getElementById("page-log"),
  revealNode: document.querySelector("[data-log-reveal]"),
  subtitleNode: document.querySelector("[data-log-subtitle]"),
  finishNode: document.querySelector("[data-log-finish]")
});
