import { getConfig, validateConfig } from "./app-config.js";
import { createRsvp } from "./api.js";

const config = getConfig();
const PASSWORD_KEY = "WEDDING_ACCESS_PASSWORD";
const STEP1_KEY = "WEDDING_RSVP_STEP1";
const STEP2_KEY = "WEDDING_RSVP_STEP2";

const form = document.getElementById("invite-form");
const submitStatus = document.getElementById("submit-status");
const summaryNode = document.getElementById("step1-summary");
const inviteModeInputs = form?.querySelectorAll('input[name="inviteMode"]') || [];
const inviteRecipientBlock = document.getElementById("invite-recipient-block");
const inviteRecipientInput = form?.querySelector('input[name="inviteRecipientName"]');
const digitalMethodInputs = form?.querySelectorAll('input[name="digitalMethod"]') || [];
const digitalContactInput = form?.querySelector('input[name="digitalContact"]');
const paperAddressInput = form?.querySelector('textarea[name="paperAddress"]');
const digitalMethodBlock = document.getElementById("digital-method-block");
const paperAddressBlock = document.getElementById("paper-address-block");

const step1Data = readStep1Data();

const footerVersion = document.getElementById("footer-version");
if (footerVersion) {
  footerVersion.textContent = config.VERSION || "v1.2.1";
}

if (!form || !submitStatus || !summaryNode || !inviteRecipientBlock || !inviteRecipientInput || !digitalContactInput || !paperAddressInput || !digitalMethodBlock || !paperAddressBlock) {
  console.warn("Invite form elements not found; invite.js initialization skipped.");
} else {
  const configErrors = validateConfig();
  if (configErrors.length) {
    setStatus(submitStatus, configErrors.join("；"), true);
  }

  enforceAccessGate();
  if (step1Data) {
    summaryNode.textContent = `已載入：${step1Data.contactName} / ${step1Data.contactPhone} / 成人人數 ${step1Data.guestCountAdult}`;
  } else {
    setFormDisabled(true);
    setStatus(submitStatus, "找不到第一步資料，請返回上一頁重新填寫", true);
  }

  bindInviteModeEvents();
  restoreStep2Draft();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      if (!step1Data) {
        setStatus(submitStatus, "找不到第一步資料，請返回上一頁重新填寫", true);
        return;
      }

      const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
      if (!accessPassword || accessPassword !== config.WEDDING_ACCESS_PASSWORD) {
        setStatus(submitStatus, "請先回首頁輸入正確入場密碼", true);
        return;
      }

      const inviteInfo = buildInviteInfo();
      saveStep2Draft(inviteInfo);

      const payload = {
        ...step1Data,
        status: "attend",
        specialNeeds: mergeSpecialNeeds(step1Data.specialNeeds || "", inviteInfo),
        source: "github-pages",
        version: config.VERSION || "v1.2.1"
      };

      const result = await createRsvp(accessPassword, payload);
      setStatus(submitStatus, result.message || "送出成功", false);

      sessionStorage.removeItem(STEP1_KEY);
      sessionStorage.removeItem(STEP2_KEY);
      form.reset();
      applyInviteModeVisibility();
    } catch (error) {
      setStatus(submitStatus, error.message, true);
    }
  });

  document.getElementById("back-to-rsvp").addEventListener("click", () => {
    const draft = collectInviteDraft();
    saveStep2Draft(draft);
    globalThis.location.href = "/rsvp.html";
  });
}

function enforceAccessGate() {
  const accessPassword = String(sessionStorage.getItem(PASSWORD_KEY) || "").trim();
  const valid = accessPassword && accessPassword === config.WEDDING_ACCESS_PASSWORD;
  if (!valid) {
    setFormDisabled(true);
    setStatus(submitStatus, "請先回首頁輸入正確入場密碼後，再填寫表單", true);
  }
}

function readStep1Data() {
  const raw = sessionStorage.getItem(STEP1_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function bindInviteModeEvents() {
  inviteModeInputs.forEach((input) => {
    input.addEventListener("change", applyInviteModeVisibility);
  });
  applyInviteModeVisibility();
}

function applyInviteModeVisibility() {
  const selectedMode = form.querySelector('input[name="inviteMode"]:checked')?.value || "";
  const needsDigital = selectedMode === "digital" || selectedMode === "both";
  const needsPaper = selectedMode === "paper" || selectedMode === "both";
  const noInvite = selectedMode === "none";

  inviteRecipientBlock.hidden = noInvite;
  digitalMethodBlock.hidden = !needsDigital;
  paperAddressBlock.hidden = !needsPaper;

  inviteRecipientInput.disabled = noInvite;
  inviteRecipientInput.required = !noInvite;
  if (noInvite) {
    inviteRecipientInput.value = "";
  }

  digitalMethodInputs.forEach((input) => {
    input.disabled = !needsDigital;
    input.required = needsDigital;
    if (!needsDigital) {
      input.checked = false;
    }
  });

  digitalContactInput.disabled = !needsDigital;
  digitalContactInput.required = needsDigital;
  if (!needsDigital) {
    digitalContactInput.value = "";
  }

  paperAddressInput.disabled = !needsPaper;
  paperAddressInput.required = needsPaper;
  if (!needsPaper) {
    paperAddressInput.value = "";
  }
}

function buildInviteInfo() {
  const data = new FormData(form);
  const inviteMode = getTextField(data, "inviteMode");
  const inviteRecipientName = getTextField(data, "inviteRecipientName");
  const digitalMethod = getTextField(data, "digitalMethod");
  const digitalContact = getTextField(data, "digitalContact");
  const paperAddress = getTextField(data, "paperAddress");

  if (!inviteMode || !["digital", "paper", "both", "none"].includes(inviteMode)) {
    throw new Error("請選擇伺服器推播（喜帖）接受方式");
  }
  if (inviteMode !== "none" && !inviteRecipientName) {
    throw new Error("請填寫收件人姓名");
  }
  if ((inviteMode === "digital" || inviteMode === "both") && (!digitalMethod || !digitalContact)) {
    throw new Error("請填寫電子喜帖寄送方式與聯絡資訊");
  }
  if ((inviteMode === "paper" || inviteMode === "both") && !paperAddress) {
    throw new Error("請填寫紙本喜帖寄送地址");
  }

  return {
    inviteMode,
    inviteRecipientName,
    digitalMethod: inviteMode === "digital" || inviteMode === "both" ? digitalMethod : "",
    digitalContact: inviteMode === "digital" || inviteMode === "both" ? digitalContact : "",
    paperAddress: inviteMode === "paper" || inviteMode === "both" ? paperAddress : ""
  };
}

function collectInviteDraft() {
  const data = new FormData(form);
  return {
    inviteMode: getTextField(data, "inviteMode"),
    inviteRecipientName: getTextField(data, "inviteRecipientName"),
    digitalMethod: getTextField(data, "digitalMethod"),
    digitalContact: getTextField(data, "digitalContact"),
    paperAddress: getTextField(data, "paperAddress")
  };
}

function saveStep2Draft(draft) {
  sessionStorage.setItem(STEP2_KEY, JSON.stringify(draft));
}

function restoreStep2Draft() {
  const raw = sessionStorage.getItem(STEP2_KEY);
  if (!raw) {
    return;
  }

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return;
  }

  if (draft.inviteMode) {
    const input = form.querySelector(`input[name="inviteMode"][value="${draft.inviteMode}"]`);
    if (input) {
      input.checked = true;
    }
  }

  inviteRecipientInput.value = draft.inviteRecipientName || "";
  digitalContactInput.value = draft.digitalContact || "";
  paperAddressInput.value = draft.paperAddress || "";

  if (draft.digitalMethod) {
    const input = form.querySelector(`input[name="digitalMethod"][value="${draft.digitalMethod}"]`);
    if (input) {
      input.checked = true;
    }
  }

  applyInviteModeVisibility();
}

function getTextField(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mergeSpecialNeeds(specialNeeds, inviteInfo) {
  const inviteSummary = `推播資訊: ${JSON.stringify(inviteInfo)}`;
  if (!specialNeeds) {
    return inviteSummary;
  }
  return `${specialNeeds}\n${inviteSummary}`;
}

function setFormDisabled(disabled) {
  const elements = form.querySelectorAll("input, textarea, button");
  elements.forEach((element) => {
    element.disabled = disabled;
  });
}

function setStatus(node, message, isError) {
  node.textContent = message;
  node.classList.toggle("error", Boolean(isError));
  node.classList.toggle("success", !isError);
}
