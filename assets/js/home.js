import { getConfig, validateConfig } from "./app-config.js";

const config = getConfig();
const PASSWORD_KEY = "WEDDING_ACCESS_PASSWORD";

document.getElementById("event-couple").textContent = config.EVENT.COUPLE;
document.getElementById("event-date").textContent = config.EVENT.DATE;
document.getElementById("event-venue").textContent = config.EVENT.VENUE;
document.getElementById("event-deadline").textContent = config.EVENT.DEADLINE;
document.getElementById("footer-version").textContent = config.VERSION || "v1.2.1";

const passwordInput = document.getElementById("home-access-password");
const authStatus = document.getElementById("home-auth-status");
const goRsvpButton = document.getElementById("go-rsvp");

const configErrors = validateConfig();
if (configErrors.length) {
  setAuthStatus(configErrors.join("；"), true);
  goRsvpButton.classList.add("disabled");
}

const savedPassword = sessionStorage.getItem(PASSWORD_KEY) || "";
if (savedPassword && savedPassword === config.WEDDING_ACCESS_PASSWORD) {
  passwordInput.value = savedPassword;
  setAuthStatus("密碼驗證通過，可前往填寫", false);
} else {
  sessionStorage.removeItem(PASSWORD_KEY);
  setAuthStatus("請輸入正確入場密碼", true);
}

passwordInput.addEventListener("input", () => {
  const value = String(passwordInput.value || "").trim();
  if (!value) {
    sessionStorage.removeItem(PASSWORD_KEY);
    setAuthStatus("請輸入入場密碼", true);
    return;
  }

  if (value !== config.WEDDING_ACCESS_PASSWORD) {
    sessionStorage.removeItem(PASSWORD_KEY);
    setAuthStatus("密碼錯誤，請重新確認", true);
    return;
  }

  sessionStorage.setItem(PASSWORD_KEY, value);
  setAuthStatus("密碼驗證通過，可前往填寫", false);
});

goRsvpButton.addEventListener("click", (event) => {
  const value = String(passwordInput.value || "").trim();
  if (value !== config.WEDDING_ACCESS_PASSWORD) {
    event.preventDefault();
    setAuthStatus("請先輸入正確入場密碼，再前往表單", true);
    passwordInput.focus();
    return;
  }
  sessionStorage.setItem(PASSWORD_KEY, value);
});

function setAuthStatus(message, isError) {
  authStatus.textContent = message;
  authStatus.classList.toggle("error", Boolean(isError));
  authStatus.classList.toggle("success", !isError);
}
