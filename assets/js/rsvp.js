import { getConfig, validateConfig } from "./app-config.js";
import { playLogs } from "./log-player.js";

const config = getConfig();
const PASSWORD_KEY = "WEDDING_ACCESS_PASSWORD";
const STEP1_KEY = "WEDDING_RSVP_STEP1";

const form = document.getElementById("rsvp-form");
const submitStatus = document.getElementById("submit-status");
const footerVersion = document.getElementById("footer-version");

if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}

if (form && submitStatus) {
  const configErrors = validateConfig();
  if (configErrors.length) {
    setStatus(submitStatus, configErrors.join("；"), true);
  }

  enforceAccessGate();
  restoreStep1Draft();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
      if (!accessPassword || accessPassword !== config.WEDDING_ACCESS_PASSWORD) {
        setStatus(submitStatus, "請先回首頁輸入正確入場密碼", true);
        return;
      }

      const step1Data = buildStep1Data();
      sessionStorage.setItem(STEP1_KEY, JSON.stringify(step1Data));
      globalThis.location.href = "/invite.html";
    } catch (error) {
      setStatus(submitStatus, error.message, true);
    }
  });
} else {
  console.warn("RSVP form elements not found; rsvp.js initialization skipped.");
}

playLogs("rsvp", {
  consoleNode: document.getElementById("page-log"),
  revealNode: document.querySelector("[data-log-reveal]")
});

function enforceAccessGate() {
  const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
  const valid = accessPassword && accessPassword === config.WEDDING_ACCESS_PASSWORD;
  if (!valid) {
    setFormDisabled(true);
    setStatus(submitStatus, "請先回首頁輸入正確入場密碼後，再填寫表單", true);
    return;
  }
  setFormDisabled(false);
}

function setFormDisabled(disabled) {
  const elements = form.querySelectorAll("input, textarea, button");
  elements.forEach((element) => {
    element.disabled = disabled;
  });
}

function buildStep1Data() {
  const data = new FormData(form);
  const contactName = getTextField(data, "contactName");
  const contactPhone = getTextField(data, "contactPhone");
  const adultCount = toSafeInt(data.get("adultCount"));
  const childCount = toSafeInt(data.get("childCount"));
  const vegetarianCount = toSafeInt(data.get("vegetarianCount"));

  if (!contactName || !contactPhone) {
    throw new Error("請完成必填欄位：聯絡人姓名、聯絡電話");
  }
  if (adultCount > 20 || childCount > 20 || vegetarianCount > 20) {
    throw new Error("人數欄位超出可接受範圍");
  }

  return {
    status: "attend",
    contactName,
    contactPhone,
    guestCountAdult: adultCount,
    guestCountChild: childCount,
    mealPreference: {
      vegetarianCount
    },
    specialNeeds: getTextField(data, "specialNeeds"),
    message: getTextField(data, "message")
  };
}

function restoreStep1Draft() {
  const raw = sessionStorage.getItem(STEP1_KEY);
  if (!raw) {
    return;
  }

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return;
  }

  form.contactName.value = draft.contactName || "";
  form.contactPhone.value = draft.contactPhone || "";
  form.adultCount.value = draft.guestCountAdult ?? 1;
  form.childCount.value = draft.guestCountChild ?? 0;
  form.vegetarianCount.value = draft.mealPreference?.vegetarianCount ?? 0;
  form.specialNeeds.value = draft.specialNeeds || "";
  form.message.value = draft.message || "";
}

function toSafeInt(value) {
  const num = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

function getTextField(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function setStatus(node, message, isError) {
  node.textContent = message;
  node.classList.toggle("error", Boolean(isError));
  node.classList.toggle("success", !isError);
}
