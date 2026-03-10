import { getConfig } from "./app-config.js";
import { createGuestbook } from "./api.js";
import { playLogs } from "./log-player.js";

const config = getConfig();

const form = document.getElementById("guestbook-entry-form");
const statusNode = document.getElementById("submit-status");
const footerVersion = document.getElementById("footer-version");
const sponsorPanel = document.getElementById("sponsor-panel");
const loadingOverlay = document.getElementById("loading-overlay");
const submitButton = form?.querySelector('button[type="submit"]');
const playerNameInput = form?.querySelector('input[name="playerName"]');
const contactMethodInputs = form?.querySelectorAll('input[name="contactMethod"]') || [];
const contactValueInput = form?.querySelector('input[name="contactValue"]');
const giftRecipientInput = form?.querySelector('input[name="giftRecipient"]');
const giftRecipientSameCheckbox = form?.querySelector('input[name="giftRecipientSameAsPlayer"]');
let isSubmitting = false;

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}

if (form && statusNode) {
  bindModeVisibility();
  bindGiftRecipientSync();

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

playLogs("guestbookEntry", {
  consoleNode: document.getElementById("page-log"),
  revealNode: document.querySelector("[data-log-reveal]"),
  subtitleNode: document.querySelector("[data-log-subtitle]"),
  finishNode: document.querySelector("[data-log-finish]")
});

function bindModeVisibility() {
  const modeInputs = form.querySelectorAll('input[name="guestbookMode"]');
  modeInputs.forEach((input) => {
    input.addEventListener("change", applyModeVisibility);
  });
  applyModeVisibility();
}

function applyModeVisibility() {
  const mode = selectedMode();
  const sponsorMode = mode === "sponsor";
  sponsorPanel.hidden = !sponsorMode;

  const accountLast5 = form.querySelector('input[name="accountLast5"]');
  const giftRecipient = form.querySelector('input[name="giftRecipient"]');
  const giftAddress = form.querySelector('textarea[name="giftAddress"]');
  if (contactValueInput) {
    contactValueInput.disabled = !sponsorMode;
    if (!sponsorMode) {
      contactValueInput.value = "";
    }
  }
  contactMethodInputs.forEach((input) => {
    input.disabled = !sponsorMode;
    if (!sponsorMode) {
      input.checked = false;
    }
  });
  if (accountLast5) {
    accountLast5.disabled = !sponsorMode;
    if (!sponsorMode) {
      accountLast5.value = "";
    }
  }
  if (giftRecipient && !sponsorMode) {
    giftRecipient.value = "";
  }
  if (giftAddress && !sponsorMode) {
    giftAddress.value = "";
  }
  if (!sponsorMode && giftRecipientSameCheckbox) {
    giftRecipientSameCheckbox.checked = false;
  }
  applyGiftRecipientSync();
}

function bindGiftRecipientSync() {
  giftRecipientSameCheckbox?.addEventListener("change", applyGiftRecipientSync);
  if (playerNameInput) {
    playerNameInput.addEventListener("input", applyGiftRecipientSync);
  }
  applyGiftRecipientSync();
}

function applyGiftRecipientSync() {
  const playerName = toText(playerNameInput?.value);
  const sponsorMode = selectedMode() === "sponsor";
  const recipientSame = Boolean(giftRecipientSameCheckbox?.checked);

  if (giftRecipientInput) {
    if (sponsorMode && recipientSame) {
      giftRecipientInput.value = playerName;
    }
    giftRecipientInput.disabled = !sponsorMode || recipientSame;
  }
  if (giftRecipientSameCheckbox) {
    giftRecipientSameCheckbox.disabled = !sponsorMode;
  }
}

async function submitGuestbook() {
  let isRedirecting = false;
  try {
    const mode = selectedMode();
    if (mode !== "blessing" && mode !== "sponsor") {
      throw new Error("請先選擇一種留言方式");
    }

    const data = new FormData(form);
    const playerName = toText(data.get("playerName"));
    if (!playerName) {
      throw new Error("請填寫玩家名稱");
    }
    const message = toText(data.get("blessingMessage"));
    if (!message) {
      throw new Error("請填寫祝福留言");
    }

    const sponsor = {
      contactMethod: toText(data.get("contactMethod")),
      contactValue: toText(data.get("contactValue")),
      accountLast5: toDigits(data.get("accountLast5")),
      giftRecipient: toText(data.get("giftRecipient")),
      giftAddress: toText(data.get("giftAddress"))
    };

    if (mode === "sponsor") {
      if (!["phone", "line", "email"].includes(sponsor.contactMethod) || !sponsor.contactValue) {
        throw new Error("請填寫聯絡方式與聯絡資訊");
      }
      if (sponsor.accountLast5 && sponsor.accountLast5.length !== 5) {
        throw new Error("匯款帳號後五碼需為 5 位數字");
      }
    }

    isSubmitting = true;
    setLoading(true);
    const result = await createGuestbook({
      playerName,
      mode,
      message,
      sponsor
    });
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

function selectedMode() {
  return String(form.querySelector('input[name="guestbookMode"]:checked')?.value || "").trim();
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toDigits(value) {
  return toText(value).replace(/[^\d]/g, "");
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
