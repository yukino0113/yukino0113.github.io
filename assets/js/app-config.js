const defaultConfig = {
  APPS_SCRIPT_URL: "",
  VERSION: "v1.2.0",
  EVENT: {
    COUPLE: "請在 config.js 設定新人名稱",
    DATE: "請在 config.js 設定婚宴日期",
    VENUE: "請在 config.js 設定婚宴地點",
    DEADLINE: "請在 config.js 設定回覆截止時間"
  }
};

const mergedConfig = {
  ...defaultConfig,
  ...(window.APP_CONFIG || {}),
  EVENT: {
    ...defaultConfig.EVENT,
    ...((window.APP_CONFIG && window.APP_CONFIG.EVENT) || {})
  }
};

export function getConfig() {
  return mergedConfig;
}

export function validateConfig() {
  const errors = [];
  if (!mergedConfig.APPS_SCRIPT_URL) {
    errors.push("APPS_SCRIPT_URL 尚未設定");
  }
  return errors;
}
