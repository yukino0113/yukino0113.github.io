import { LOG_DELAY_MAX_MS, LOG_DELAY_MIN_MS, PAGE_LOGS } from "./log-config.js";

export async function playLogs(pageKey, options = {}) {
  const consoleNode = options.consoleNode || document.querySelector(".console-log");
  const revealNode = options.revealNode || document.querySelector("[data-log-reveal]");
  const subtitleNode = options.subtitleNode || document.querySelector("[data-log-subtitle]");
  const finishNode = options.finishNode || document.querySelector("[data-log-finish]");

  if (!consoleNode || !revealNode) {
    return;
  }

  const logs = Array.isArray(PAGE_LOGS[pageKey]) ? PAGE_LOGS[pageKey] : [];
  consoleNode.textContent = "";
  revealNode.hidden = true;
  revealNode.classList.remove("is-visible");
  if (subtitleNode) {
    subtitleNode.hidden = true;
    subtitleNode.classList.remove("is-visible");
  }
  if (finishNode) {
    finishNode.hidden = true;
    finishNode.classList.remove("is-visible");
  }

  if (!logs.length) {
    revealWithFade(revealNode);
    revealWithFade(subtitleNode);
    revealWithFade(finishNode);
    return;
  }

  let revealed = false;
  for (const line of logs) {
    await sleep(randomDelayMs());
    const level = parseLevel(line);
    appendLine(consoleNode, line, level);
    if (!revealed && level === "error") {
      revealWithFade(revealNode);
      revealed = true;
    }
  }

  if (!revealed) {
    revealWithFade(revealNode);
  }
  revealWithFade(subtitleNode);
  revealWithFade(finishNode);
}

function appendLine(consoleNode, line, level) {
  const row = document.createElement("span");
  row.className = levelClass(level);
  row.textContent = withRealtimeTimestamp(line);
  consoleNode.appendChild(row);
}

function parseLevel(line) {
  const match = String(line || "").match(/\[[^\]]*\/(INFO|WARN|ERROR)\]/i);
  const value = match?.[1]?.toLowerCase();
  if (value === "warn") {
    return "warn";
  }
  if (value === "error") {
    return "error";
  }
  return "info";
}

function levelClass(level) {
  if (level === "warn") {
    return "log-warn";
  }
  if (level === "error") {
    return "log-error";
  }
  return "log-info";
}

function randomDelayMs() {
  const min = Math.max(0, Number(LOG_DELAY_MIN_MS) || 0);
  const max = Math.max(min, Number(LOG_DELAY_MAX_MS) || min);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function revealWithFade(node) {
  if (!node) {
    return;
  }
  node.hidden = false;
  globalThis.requestAnimationFrame(() => {
    node.classList.add("is-visible");
  });
}

function withRealtimeTimestamp(line) {
  const current = `[${formatNowTaipei()}]`;
  const text = String(line || "").trim();
  if (!text) {
    return current;
  }
  if (/^\[[^\]]+\]/.test(text)) {
    return text.replace(/^\[[^\]]+\]/, current);
  }
  return `${current} ${text}`;
}

function formatNowTaipei() {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei"
  }).format(new Date());
}
