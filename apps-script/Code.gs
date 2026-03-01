const TZ = "Asia/Taipei";
const RSVP_SHEET = "rsvps";
const CONFIG_SHEET = "config";
const RSVP_HEADERS = [
  "submission_id",
  "created_at",
  "updated_at",
  "status",
  "household_name",
  "contact_name",
  "contact_phone",
  "contact_email",
  "guest_count_adult",
  "guest_count_child",
  "guest_names_json",
  "meal_preference_json",
  "special_needs",
  "message",
  "google_sub",
  "google_email",
  "last4_phone",
  "source",
  "version"
];

function doGet() {
  return jsonResponse({
    ok: true,
    code: "OK",
    message: "RSVP API running"
  });
}

function doPost(e) {
  try {
    ensureSheets_();

    const req = parseRequest_(e);
    const identity = verifyGoogleIdToken_(req.idToken);

    if (req.action === "create_rsvp") {
      return jsonResponse(handleCreate_(req.payload, identity));
    }
    if (req.action === "get_rsvp") {
      return jsonResponse(handleGet_(req.payload));
    }
    if (req.action === "update_rsvp") {
      return jsonResponse(handleUpdate_(req.payload, identity));
    }

    return jsonResponse({
      ok: false,
      code: "INVALID_INPUT",
      message: "Unknown action"
    });
  } catch (error) {
    return jsonResponse(normalizeError_(error));
  }
}

function handleCreate_(payload, identity) {
  validateBasePayload_(payload);

  const cfg = readConfigMap_();
  validateGuestLimit_(payload, cfg);

  const sheet = getSheet_(RSVP_SHEET);
  const nowIso = nowIso_();
  const submissionId = generateSubmissionId_();

  const row = [
    submissionId,
    nowIso,
    nowIso,
    payload.status,
    payload.householdName,
    payload.contactName,
    payload.contactPhone,
    payload.contactEmail || "",
    num_(payload.guestCountAdult),
    num_(payload.guestCountChild),
    stringifyJson_(payload.guestNames || []),
    stringifyJson_(payload.mealPreference || {}),
    payload.specialNeeds || "",
    payload.message || "",
    identity.sub,
    identity.email,
    payload.phoneLast4,
    payload.source || "github-pages",
    payload.version || "v1.0.0"
  ];

  sheet.appendRow(row);

  return {
    ok: true,
    code: "OK",
    message: "RSVP 建立成功",
    submissionId: submissionId
  };
}

function handleGet_(payload) {
  if (!payload || !payload.submissionId || !payload.phoneLast4) {
    throw createError_("INVALID_INPUT", "submissionId 與 phoneLast4 為必填");
  }

  const found = findBySubmissionAndPhone_(payload.submissionId, payload.phoneLast4);
  if (!found) {
    throw createError_("NOT_FOUND", "查無資料，請確認回覆編號與電話末 4 碼");
  }

  return {
    ok: true,
    code: "OK",
    message: "資料載入成功",
    data: mapRowToPayload_(found.row)
  };
}

function handleUpdate_(payload, identity) {
  if (!payload || !payload.submissionId || !payload.phoneLast4) {
    throw createError_("INVALID_INPUT", "更新需提供 submissionId 與 phoneLast4");
  }

  const cfg = readConfigMap_();
  enforceDeadline_(cfg);
  validateBasePayload_(payload);
  validateGuestLimit_(payload, cfg);

  const found = findBySubmissionAndPhone_(payload.submissionId, payload.phoneLast4);
  if (!found) {
    throw createError_("NOT_FOUND", "找不到可更新資料");
  }

  const oldRow = found.row;
  const updated = [
    oldRow[0],
    oldRow[1],
    nowIso_(),
    payload.status,
    payload.householdName,
    payload.contactName,
    payload.contactPhone,
    payload.contactEmail || "",
    num_(payload.guestCountAdult),
    num_(payload.guestCountChild),
    stringifyJson_(payload.guestNames || []),
    stringifyJson_(payload.mealPreference || {}),
    payload.specialNeeds || "",
    payload.message || "",
    identity.sub,
    identity.email,
    payload.phoneLast4,
    payload.source || oldRow[17] || "github-pages",
    payload.version || oldRow[18] || "v1.0.0"
  ];

  const sheet = getSheet_(RSVP_SHEET);
  sheet.getRange(found.rowIndex, 1, 1, RSVP_HEADERS.length).setValues([updated]);

  return {
    ok: true,
    code: "OK",
    message: "RSVP 更新成功",
    submissionId: oldRow[0]
  };
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw createError_("INVALID_INPUT", "Request body 不存在");
  }

  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (error) {
    throw createError_("INVALID_INPUT", "Request body 不是合法 JSON");
  }

  if (!req.action || !req.idToken) {
    throw createError_("INVALID_INPUT", "action 與 idToken 為必填");
  }
  if (!req.payload || typeof req.payload !== "object") {
    throw createError_("INVALID_INPUT", "payload 必須是 object");
  }

  return req;
}

function verifyGoogleIdToken_(idToken) {
  try {
    const response = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );

    if (response.getResponseCode() !== 200) {
      throw createError_("UNAUTHORIZED", "Google 驗證失敗");
    }

    const tokenData = JSON.parse(response.getContentText());
    const expectedAud = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");

    if (expectedAud && tokenData.aud !== expectedAud) {
      throw createError_("UNAUTHORIZED", "Google Client ID 不符合");
    }

    if (!tokenData.sub) {
      throw createError_("UNAUTHORIZED", "無法識別使用者");
    }

    if (tokenData.exp && Number(tokenData.exp) * 1000 < Date.now()) {
      throw createError_("UNAUTHORIZED", "登入憑證已過期");
    }

    return {
      sub: tokenData.sub,
      email: tokenData.email || ""
    };
  } catch (error) {
    if (error && error.code) {
      throw error;
    }
    throw createError_("UNAUTHORIZED", "Google 驗證過程發生錯誤");
  }
}

function validateBasePayload_(payload) {
  if (!["attend", "decline"].includes(payload.status)) {
    throw createError_("INVALID_INPUT", "status 必須是 attend 或 decline");
  }

  if (!payload.householdName || !payload.contactName || !payload.contactPhone) {
    throw createError_("INVALID_INPUT", "householdName/contactName/contactPhone 為必填");
  }

  if (!payload.phoneLast4 || String(payload.phoneLast4).length !== 4) {
    throw createError_("INVALID_INPUT", "phoneLast4 必須是 4 碼");
  }

  const adult = num_(payload.guestCountAdult);
  const child = num_(payload.guestCountChild);
  if (adult < 0 || child < 0 || adult > 20 || child > 20) {
    throw createError_("INVALID_INPUT", "人數不在允許範圍");
  }
}

function validateGuestLimit_(payload, cfg) {
  const maxGuest = Number(cfg.max_guest_per_household || "0");
  if (!maxGuest || maxGuest <= 0) {
    return;
  }

  const total = num_(payload.guestCountAdult) + num_(payload.guestCountChild);
  if (total > maxGuest) {
    throw createError_(
      "INVALID_INPUT",
      "同行總人數超過限制，上限：" + maxGuest
    );
  }
}

function enforceDeadline_(cfg) {
  if (!cfg.deadline_at) {
    return;
  }

  const deadline = new Date(cfg.deadline_at);
  if (!isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
    throw createError_("DEADLINE_PASSED", "已超過截止日期，無法修改");
  }
}

function findBySubmissionAndPhone_(submissionId, phoneLast4) {
  const sheet = getSheet_(RSVP_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, RSVP_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (String(row[0]) === String(submissionId) && String(row[16]) === String(phoneLast4)) {
      return {
        rowIndex: i + 2,
        row: row
      };
    }
  }

  return null;
}

function mapRowToPayload_(row) {
  return {
    submissionId: row[0],
    createdAt: row[1],
    updatedAt: row[2],
    status: row[3],
    householdName: row[4],
    contactName: row[5],
    contactPhone: row[6],
    contactEmail: row[7],
    guestCountAdult: row[8],
    guestCountChild: row[9],
    guestNames: parseJson_(row[10], []),
    mealPreference: parseJson_(row[11], {}),
    specialNeeds: row[12],
    message: row[13],
    source: row[17],
    version: row[18]
  };
}

function readConfigMap_() {
  const sheet = getSheet_(CONFIG_SHEET);
  const lastRow = sheet.getLastRow();
  const out = {};

  if (lastRow < 2) {
    return out;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  rows.forEach(function (r) {
    const k = String(r[0] || "").trim();
    const v = String(r[1] || "").trim();
    if (k) {
      out[k] = v;
    }
  });

  return out;
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let rsvp = ss.getSheetByName(RSVP_SHEET);
  if (!rsvp) {
    rsvp = ss.insertSheet(RSVP_SHEET);
  }
  if (rsvp.getLastRow() === 0) {
    rsvp.appendRow(RSVP_HEADERS);
  }

  let config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
  }
  if (config.getLastRow() === 0) {
    config.appendRow(["key", "value"]);
    config.appendRow(["deadline_at", "2026-11-20T23:59:00+08:00"]);
    config.appendRow(["event_name", "婚宴 RSVP"]);
    config.appendRow(["event_date", "2026-12-20T18:00:00+08:00"]);
    config.appendRow(["max_guest_per_household", "10"]);
    config.appendRow(["sheet_version", "v1.0.0"]);
  }
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw createError_("INTERNAL_ERROR", "找不到工作表: " + name);
  }
  return sheet;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function generateSubmissionId_() {
  return "RSVP-" + Utilities.formatDate(new Date(), TZ, "yyyyMMdd") + "-" + Utilities.getUuid().slice(0, 8);
}

function stringifyJson_(value) {
  return JSON.stringify(value || {});
}

function parseJson_(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function num_(value) {
  const n = Number(value);
  if (!isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.floor(n));
}

function createError_(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function normalizeError_(error) {
  const code = error && error.code ? error.code : "INTERNAL_ERROR";
  return {
    ok: false,
    code: code,
    message: error && error.message ? error.message : "未知錯誤"
  };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
