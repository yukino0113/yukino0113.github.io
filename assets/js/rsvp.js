import { getConfig, validateConfig } from "/assets/js/app-config.js";
import { createRsvp, getRsvp, updateRsvp } from "/assets/js/api.js";

const config = getConfig();

const form = document.getElementById("rsvp-form");
const lookupForm = document.getElementById("lookup-form");
const submitStatus = document.getElementById("submit-status");
const lookupStatus = document.getElementById("lookup-status");
const authStatus = document.getElementById("auth-status");
const submissionIdNode = document.getElementById("submission-id");

document.getElementById("footer-version").textContent = config.VERSION || "v1.0.0";

let idToken = "";
let googleProfile = null;
let loadedSubmissionId = "";

const configErrors = validateConfig();
if (configErrors.length) {
  setStatus(submitStatus, configErrors.join("；"), true);
}

document.getElementById("reset-form").addEventListener("click", () => {
  form.reset();
  loadedSubmissionId = "";
  submissionIdNode.textContent = "";
  setStatus(submitStatus, "表單已重設", false);
});

document.getElementById("update-rsvp").addEventListener("click", async () => {
  if (!loadedSubmissionId) {
    setStatus(lookupStatus, "請先使用回覆編號載入資料", true);
    return;
  }
  if (!idToken) {
    setStatus(submitStatus, "更新前請先完成 Google 驗證", true);
    return;
  }

  try {
    const payload = buildPayloadFromForm();
    payload.submissionId = loadedSubmissionId;
    payload.phoneLast4 = readPhoneLast4(lookupForm.phoneLast4.value);

    const result = await updateRsvp(idToken, payload);
    setStatus(submitStatus, result.message || "更新成功", false);
  } catch (error) {
    setStatus(submitStatus, error.message, true);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!idToken) {
    setStatus(submitStatus, "送出前請先完成 Google 驗證", true);
    return;
  }

  try {
    const payload = buildPayloadFromForm();
    const result = await createRsvp(idToken, payload);

    loadedSubmissionId = result.submissionId || "";
    setStatus(submitStatus, result.message || "送出成功", false);

    if (loadedSubmissionId) {
      submissionIdNode.textContent = `你的回覆編號：${loadedSubmissionId}`;
      lookupForm.submissionId.value = loadedSubmissionId;
      lookupForm.phoneLast4.value = payload.phoneLast4;
    }
  } catch (error) {
    setStatus(submitStatus, error.message, true);
  }
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!idToken) {
    setStatus(lookupStatus, "查詢前請先完成 Google 驗證", true);
    return;
  }

  try {
    const payload = {
      submissionId: lookupForm.submissionId.value.trim(),
      phoneLast4: readPhoneLast4(lookupForm.phoneLast4.value)
    };

    if (!payload.submissionId) {
      throw new Error("請輸入 submissionId");
    }

    const result = await getRsvp(idToken, payload);
    fillForm(result.data);
    loadedSubmissionId = payload.submissionId;
    setStatus(lookupStatus, result.message || "資料已載入，可編修後按更新", false);
  } catch (error) {
    setStatus(lookupStatus, error.message, true);
  }
});

window.addEventListener("load", () => {
  initGoogleSignIn();
});

function initGoogleSignIn() {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    setStatus(submitStatus, "Google 登入載入失敗，請稍後重整", true);
    return;
  }
  if (!config.GOOGLE_CLIENT_ID) {
    setStatus(submitStatus, "GOOGLE_CLIENT_ID 未設定，暫時無法登入", true);
    return;
  }

  window.google.accounts.id.initialize({
    client_id: config.GOOGLE_CLIENT_ID,
    callback: onGoogleCredential
  });

  window.google.accounts.id.renderButton(document.getElementById("google-signin"), {
    theme: "filled_blue",
    size: "large",
    shape: "rectangular",
    text: "signin_with",
    width: 280
  });
}

function onGoogleCredential(response) {
  idToken = response.credential || "";
  googleProfile = parseJwtPayload(idToken);
  if (googleProfile && googleProfile.email) {
    authStatus.textContent = `已驗證：${googleProfile.email}`;
  } else {
    authStatus.textContent = "已完成 Google 驗證";
  }
}

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

  if (adultCount + childCount < 0 || adultCount > 20 || childCount > 20) {
    throw new Error("人數欄位超出可接受範圍");
  }

  const guestNames = splitLines(data.get("guestNames"));
  const mealPreference = {
    vegetarianCount: toSafeInt(data.get("vegetarianCount")),
    noBeefCount: toSafeInt(data.get("noBeefCount")),
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
    version: config.VERSION || "v1.0.0"
  };
}

function fillForm(data) {
  if (!data) {
    return;
  }

  if (data.status === "attend" || data.status === "decline") {
    const input = form.querySelector(`input[name="status"][value="${data.status}"]`);
    if (input) {
      input.checked = true;
    }
  }

  form.householdName.value = data.householdName || "";
  form.contactName.value = data.contactName || "";
  form.contactPhone.value = data.contactPhone || "";
  form.contactEmail.value = data.contactEmail || "";
  form.adultCount.value = data.guestCountAdult ?? 0;
  form.childCount.value = data.guestCountChild ?? 0;
  form.guestNames.value = Array.isArray(data.guestNames) ? data.guestNames.join("\n") : "";

  const meals = data.mealPreference || {};
  form.vegetarianCount.value = meals.vegetarianCount ?? 0;
  form.noBeefCount.value = meals.noBeefCount ?? 0;
  form.kidsMealCount.value = meals.kidsMealCount ?? 0;

  form.specialNeeds.value = data.specialNeeds || "";
  form.message.value = data.message || "";
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseJwtPayload(token) {
  if (!token || token.split(".").length !== 3) {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
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
