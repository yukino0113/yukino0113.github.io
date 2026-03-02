import { getConfig } from "./app-config.js";

async function callApi(action, accessPassword, payload) {
  const { APPS_SCRIPT_URL } = getConfig();
  if (!APPS_SCRIPT_URL) {
    throw new Error("APPS_SCRIPT_URL 尚未設定，請先建立 config.js");
  }

  const requestBody = JSON.stringify({ action, accessPassword, payload });

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      // Keep request simple to avoid preflight when possible.
      body: requestBody
    });

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("API 回應不是合法 JSON");
    }

    if (!response.ok || !body.ok) {
      const message = body?.message || "提交失敗";
      const code = body?.code ? ` (${body.code})` : "";
      throw new Error(`${message}${code}`);
    }

    return body;
  } catch (error) {
    const message = String(error?.message || "");
    const looksLikeCors = message.includes("Failed to fetch") || message.includes("CORS");
    if (!looksLikeCors) {
      throw error;
    }

    // Fallback for browsers/environments that block Apps Script CORS preflight.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: requestBody
    });

    return {
      ok: true,
      code: "ACCEPTED",
      message: "已送出（跨網域限制，請稍後確認資料是否入表）"
    };
  }
}

export function createRsvp(accessPassword, payload) {
  return callApi("create_rsvp", accessPassword, payload);
}
