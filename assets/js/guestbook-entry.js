import { createGuestbook } from "./api.js";
import { getConfig } from "./app-config.js";
import { playLogs } from "./log-player.js";

const config = getConfig();
const DONATE_DRAFT_KEY = "WEDDING_DONATE_DRAFT";

const form = document.getElementById("guestbook-entry-form");
const statusNode = document.getElementById("submit-status");
const footerVersion = document.getElementById("footer-version");
const loadingOverlay = document.getElementById("loading-overlay");
const submitButton = form?.querySelector('button[type="submit"]');
const donateButton = document.getElementById("go-donate");
let isSubmitting = false;

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}

if (form && statusNode) {
  restoreDraft();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    submitGuestbook().catch((error) => {
      setStatus(error.message || "送出失敗，請稍後再試", true);
    });
  });
}

donateButton?.addEventListener("click", () => {
  saveDraft();
  globalThis.location.href = "/donate.html";
});

playLogs("guestbookEntry", {
  consoleNode: document.getElementById("page-log"),
  revealNode: document.querySelector("[data-log-reveal]"),
  subtitleNode: document.querySelector("[data-log-subtitle]"),
  finishNode: document.querySelector("[data-log-finish]")
});

function restoreDraft() {
  const raw = sessionStorage.getItem(DONATE_DRAFT_KEY);
  if (!raw) {
    return;
  }
  try {
    const draft = JSON.parse(raw);
    form.playerName.value = draft.playerName || "";
    form.blessingMessage.value = draft.message || "";
  } catch {
    // ignore invalid draft
  }
}

function saveDraft() {
  if (!form) {
    return;
  }
  const data = new FormData(form);
  sessionStorage.setItem(
    DONATE_DRAFT_KEY,
    JSON.stringify({
      playerName: toText(data.get("playerName")),
      message: toText(data.get("blessingMessage"))
    })
  );
}

async function submitGuestbook() {
  let isRedirecting = false;
  try {
    const data = new FormData(form);
    const playerName = toText(data.get("playerName"));
    if (!playerName) {
      throw new Error("請填寫玩家名稱");
    }

    isSubmitting = true;
    setLoading(true);
    const result = await createGuestbook({
      playerName,
      mode: "blessing",
      message: toText(data.get("blessingMessage")),
      sponsor: {}
    });
    sessionStorage.removeItem(DONATE_DRAFT_KEY);
    const submissionId = encodeURIComponent(String(result?.submissionId || ""));
    isRedirecting = true;
    globalThis.location.href = `/guestbook-thanks.html${submissionId ? `?id=${submissionId}` : ""}`;
  } finally {
    if (!isRedirecting) {
      setLoading(false);
    }
    isSubmitting = false;
  }
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function setStatus(message, isError) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", Boolean(isError));
  statusNode.classList.toggle("success", !isError);
}

function setLoading(isLoading) {
  if (!loadingOverlay || !form) {
    return;
  }
  loadingOverlay.hidden = !isLoading;
  const elements = form.querySelectorAll("input, textarea, button");
  elements.forEach((element) => {
    element.disabled = isLoading;
  });
  if (submitButton) {
    submitButton.textContent = isLoading ? "送出中..." : "送出留言";
  }
}
