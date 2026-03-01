import { getConfig } from "/assets/js/app-config.js";

const config = getConfig();

document.getElementById("event-couple").textContent = config.EVENT.COUPLE;
document.getElementById("event-date").textContent = config.EVENT.DATE;
document.getElementById("event-venue").textContent = config.EVENT.VENUE;
document.getElementById("event-deadline").textContent = config.EVENT.DEADLINE;
document.getElementById("footer-version").textContent = config.VERSION || "v1.0.0";
