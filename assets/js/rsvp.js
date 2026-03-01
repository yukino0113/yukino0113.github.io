import { getConfig, validateConfig } from "./app-config.js";
import { createRsvp } from "./api.js";

const config = getConfig();
const PASSWORD_KEY = "WEDDING_ACCESS_PASSWORD";

const form = document.getElementById("rsvp-form");
const submitStatus = document.getElementById("submit-status");

document.getElementById("footer-version").textContent = config.VERSION || "v1.2.1";

const configErrors = validateConfig();
if (configErrors.length) {
  setStatus(submitStatus, configErrors.join("；"), true);
}

enforceAccessGate();

document.getElementById("reset-form").addEventListener("click", () => {
  form.reset();
  setStatus(submitStatus, "表單已重設", false);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
    if (!accessPassword || accessPassword !== config.WEDDING_ACCESS_PASSWORD) {
      throw new Error("請先回首頁輸入正確入場密碼");
    }

    const payload = buildPayloadFromForm();
    const result = await createRsvp(accessPassword, payload);

    setStatus(submitStatus, result.message || "送出成功", false);
    form.reset();
  } catch (error) {
    setStatus(submitStatus, error.message, true);
  }
});

function enforceAccessGate() {
  const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
  const valid = accessPassword && accessPassword === config.WEDDING_ACCESS_PASSWORD;

  if (valid) {
    setFormDisabled(false);
    return;
  }

  setFormDisabled(true);
  setStatus(submitStatus, "請先回首頁輸入正確入場密碼後，再填寫表單", true);
}

function setFormDisabled(disabled) {
  const elements = form.querySelectorAll("input, textarea, button");
  elements.forEach((element) => {
    element.disabled = disabled;
  });
}

function buildPayloadFromForm() {
  const data = new FormData(form);
  const status = data.get("status");
  const householdName = getTextField(data, "householdName");
  const contactName = getTextField(data, "contactName");
  const contactPhone = getTextField(data, "contactPhone");
  const contactEmail = getTextField(data, "contactEmail");
  const adultCount = toSafeInt(data.get("adultCount"));
  const childCount = toSafeInt(data.get("childCount"));

  if (!status || !["attend", "decline"].includes(status)) {
    throw new Error("請選擇出席狀態");
  }
  if (!householdName || !contactName || !contactPhone) {
    throw new Error("請完成必填欄位：帖子/家戶名稱、聯絡人姓名、聯絡電話");
  }

  if (adultCount > 20 || childCount > 20) {
    throw new Error("人數欄位超出可接受範圍");
  }

  const guestNames = splitLines(data.get("guestNames"));
  const mealPreference = {
    vegetarianCount: toSafeInt(data.get("vegetarianCount")),
    kidsMealCount: toSafeInt(data.get("kidsMealCount"))
  };

  const phoneLast4 = readPhoneLast4(contactPhone);

  return {
    status,
    householdName,
    contactName,
    contactPhone,
    contactEmail,
    guestCountAdult: adultCount,
    guestCountChild: childCount,
    guestNames,
    mealPreference,
    specialNeeds: getTextField(data, "specialNeeds"),
    message: getTextField(data, "message"),
    phoneLast4,
    source: "github-pages",
    version: config.VERSION || "v1.2.1"
  };
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toSafeInt(value) {
  const num = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

function readPhoneLast4(value) {
  const digits = String(value || "").replaceAll(/\D/g, "");
  if (digits.length < 4) {
    throw new Error("電話需至少 4 碼");
  }
  return digits.slice(-4);
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
