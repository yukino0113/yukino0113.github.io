import { getConfig, validateConfig } from "/assets/js/app-config.js";
import { createRsvp } from "/assets/js/api.js";

const config = getConfig();

const form = document.getElementById("rsvp-form");
const submitStatus = document.getElementById("submit-status");
const authStatus = document.getElementById("auth-status");
const passwordInput = document.getElementById("access-password");

document.getElementById("footer-version").textContent = config.VERSION || "v1.1.0";

const configErrors = validateConfig();
if (configErrors.length) {
  setStatus(submitStatus, configErrors.join("；"), true);
}

passwordInput.addEventListener("input", () => {
  if (passwordInput.value === config.ACCESS_PASSWORD) {
    authStatus.textContent = "密碼驗證通過";
  } else {
    authStatus.textContent = "尚未驗證";
  }
});

document.getElementById("reset-form").addEventListener("click", () => {
  form.reset();
  authStatus.textContent = "尚未驗證";
  setStatus(submitStatus, "表單已重設", false);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const accessPassword = String(passwordInput.value || "").trim();
    if (!accessPassword) {
      throw new Error("請輸入入場密碼");
    }
    if (accessPassword !== config.ACCESS_PASSWORD) {
      throw new Error("密碼錯誤，請確認後再送出");
    }

    const payload = buildPayloadFromForm();
    const result = await createRsvp(accessPassword, payload);

    setStatus(submitStatus, result.message || "送出成功", false);
    form.reset();
    authStatus.textContent = "尚未驗證";
  } catch (error) {
    setStatus(submitStatus, error.message, true);
  }
});

function buildPayloadFromForm() {
  const data = new FormData(form);
  const status = data.get("status");
  const householdName = String(data.get("householdName") || "").trim();
  const contactName = String(data.get("contactName") || "").trim();
  const contactPhone = String(data.get("contactPhone") || "").trim();
  const contactEmail = String(data.get("contactEmail") || "").trim();
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
    specialNeeds: String(data.get("specialNeeds") || "").trim(),
    message: String(data.get("message") || "").trim(),
    phoneLast4,
    source: "github-pages",
    version: config.VERSION || "v1.1.0"
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
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) {
    throw new Error("電話需至少 4 碼");
  }
  return digits.slice(-4);
}

function setStatus(node, message, isError) {
  node.textContent = message;
  node.classList.toggle("error", Boolean(isError));
  node.classList.toggle("success", !isError);
}
