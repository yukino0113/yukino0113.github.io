import { getConfig } from "./app-config.js";
import { createGuestbook } from "./api.js";
import { playLogs } from "./log-player.js";

const config = getConfig();
const DONATE_DRAFT_KEY = "WEDDING_DONATE_DRAFT";

const form = document.getElementById("donate-form");
const statusNode = document.getElementById("submit-status");
const footerVersion = document.getElementById("footer-version");
const loadingOverlay = document.getElementById("loading-overlay");
const submitButton = form?.querySelector('button[type="submit"]');
const bankCodeNode = document.getElementById("bank-code");
const bankAccountNode = document.getElementById("bank-account");
const bankQrPanel = document.getElementById("bank-qr-panel");
const bankQrImage = document.getElementById("bank-qr-image");
const giftRecipientInput = form?.querySelector('input[name="giftRecipient"]');
const giftRecipientSameCheckbox = form?.querySelector('input[name="giftRecipientSameAsPlayer"]');
let donateDraft = null;
let isSubmitting = false;

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}
if (bankCodeNode) {
  bankCodeNode.textContent = config.BANK?.CODE || "-";
}
if (bankAccountNode) {
  bankAccountNode.textContent = config.BANK?.ACCOUNT || "-";
}
if (bankQrPanel && bankQrImage) {
  const qr = String(config.BANK?.QR || "").trim();
  if (qr) {
    bankQrImage.src = qr;
    bankQrPanel.hidden = false;
    bankQrImage.addEventListener("load", syncBankQrSize);
    globalThis.addEventListener("resize", syncBankQrSize);
  } else {
    bankQrPanel.hidden = true;
  }
}

if (form && statusNode) {
  restoreDraft();
  if (!toText(donateDraft?.playerName)) {
    setStatus("找不到前一頁的留言資料，請先回留言板填寫", true);
    setFormDisabled(true);
  }
  bindGiftRecipientSync();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    submitDonation().catch((error) => {
      setStatus(error.message || "送出失敗，請稍後再試", true);
    });
  });
}

playLogs("donate", {
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
    donateDraft = JSON.parse(raw);
  } catch {
    donateDraft = null;
  }
}

function bindGiftRecipientSync() {
  giftRecipientSameCheckbox?.addEventListener("change", applyGiftRecipientSync);
  applyGiftRecipientSync();
}

function applyGiftRecipientSync() {
  const playerName = toText(donateDraft?.playerName);
  const recipientSame = Boolean(giftRecipientSameCheckbox?.checked);

  if (giftRecipientInput) {
    if (recipientSame) {
      giftRecipientInput.value = playerName;
    }
    giftRecipientInput.disabled = recipientSame;
  }
}

async function submitDonation() {
  let isRedirecting = false;
  try {
    const playerName = toText(donateDraft?.playerName);
    if (!playerName) {
      throw new Error("找不到前一頁的玩家名稱，請返回留言板重新填寫");
    }
    const message = toText(donateDraft?.message);
    if (!message) {
      throw new Error("找不到前一頁的祝福留言，請返回留言板重新填寫");
    }

    const data = new FormData(form);
    const sponsor = {
      contactMethod: toText(data.get("contactMethod")),
      contactValue: toText(data.get("contactValue")),
      accountLast5: toDigits(data.get("accountLast5")),
      giftRecipient: toText(data.get("giftRecipient")),
      giftAddress: toText(data.get("giftAddress"))
    };

    if (!["phone", "line", "email"].includes(sponsor.contactMethod) || !sponsor.contactValue) {
      throw new Error("請填寫聯絡方式與聯絡資訊");
    }
    if (sponsor.accountLast5 && sponsor.accountLast5.length !== 5) {
      throw new Error("匯款帳號後五碼需為 5 位數字");
    }

    isSubmitting = true;
    setLoading(true);
    const result = await createGuestbook({
      playerName,
      mode: "sponsor",
      message,
      sponsor
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
  setFormDisabled(isLoading);
  if (submitButton) {
    submitButton.textContent = isLoading ? "送出中..." : "送出贊助資訊";
  }
}

function setFormDisabled(disabled) {
  if (!form) {
    return;
  }
  const elements = form.querySelectorAll("input, textarea, button");
  elements.forEach((element) => {
    element.disabled = disabled;
  });
}

function syncBankQrSize() {
  if (!bankQrImage || !bankQrImage.naturalWidth) {
    return;
  }

  const quarterWidth = Math.round((bankQrImage.naturalWidth / 4) * 1.15);
  const viewportWidth = Math.max(120, globalThis.innerWidth - 32);
  bankQrImage.style.width = `${Math.min(quarterWidth, viewportWidth)}px`;
}
