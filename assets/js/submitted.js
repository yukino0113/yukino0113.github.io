import { getConfig } from "./app-config.js";
import { playLogs } from "./log-player.js";

const config = getConfig();

const footerVersion = document.getElementById("footer-version");
const eventDate = document.getElementById("submitted-event-date");
const eventPort = document.getElementById("submitted-event-port");

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}
if (eventDate) {
  eventDate.textContent = config.EVENT?.DATE || "-";
}
if (eventPort) {
  eventPort.textContent = config.EVENT?.DEADLINE || "-";
}

playLogs("submitted", {
  consoleNode: document.getElementById("page-log"),
  revealNode: document.querySelector("[data-log-reveal]")
});
