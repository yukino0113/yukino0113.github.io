import { getConfig } from "./app-config.js";

async function callApi(action, accessPassword, payload) {
  const { APPS_SCRIPT_URL } = getConfig();
  if (!APPS_SCRIPT_URL) {
    throw new Error("APPS_SCRIPT_URL 尚未設定，請先建立 config.js");
  }

  const requestBody = JSON.stringify({ action, accessPassword, payload });
  const TIMEOUT_MS = 12000;

  try {
    const response = await fetchWithTimeout(APPS_SCRIPT_URL, {
      method: "POST",
      // Keep request simple to avoid preflight when possible.
      body: requestBody
    }, TIMEOUT_MS);

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
    if (isAbortError(error)) {
      throw new Error("連線逾時，請稍後再試");
    }
    const message = String(error?.message || "");
    const looksLikeCors = message.includes("Failed to fetch") || message.includes("CORS");
    if (!looksLikeCors) {
      throw error;
    }

    // Fallback for browsers/environments that block Apps Script CORS preflight.
    try {
      await fetchWithTimeout(
        APPS_SCRIPT_URL,
        {
          method: "POST",
          mode: "no-cors",
          body: requestBody
        },
        TIMEOUT_MS
      );
    } catch (fallbackError) {
      if (isAbortError(fallbackError)) {
        throw new Error("連線逾時，請稍後再試");
      }
      throw new Error("送出失敗，請稍後再試");
    }

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

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function isAbortError(error) {
  return error?.name === "AbortError";
}
