import { getConfig } from "./app-config.js";

async function callApi(action, accessPassword, payload) {
  const { APPS_SCRIPT_URL } = getConfig();
  if (!APPS_SCRIPT_URL) {
    throw new Error("APPS_SCRIPT_URL 尚未設定，請先建立 config.js");
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, accessPassword, payload })
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
}

export function createRsvp(accessPassword, payload) {
  return callApi("create_rsvp", accessPassword, payload);
}
