const TZ = "Asia/Taipei";
const RSVP_SHEET = "rsvps";
const CONFIG_SHEET = "config";
const RSVP_HEADERS = [
  "submission_id",
  "填表時間",
  "狀態",
  "聯絡人",
  "聯絡點話",
  "大人數量",
  "孩童數量",
  "素食數量",
  "特殊需求",
  "活動許願",
  "祝福留言",
  "喜帖接收方式",
  "收件人",
  "電子接收途徑",
  "電子喜帖接收位置",
  "地址"
];

function doGet() {
  return jsonResponse({
    ok: true,
    code: "OK",
    message: "Wedding form API running"
  });
}

function doPost(e) {
  try {
    ensureSheets_();

    const req = parseRequest_(e);
    verifyAccessPassword_(req.accessPassword);

    if (req.action === "create_rsvp") {
      return jsonResponse(handleCreate_(req.payload));
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

function handleCreate_(payload) {
  validateBasePayload_(payload);

  const cfg = readConfigMap_();
  enforceDeadline_(cfg);
  validateGuestLimit_(payload, cfg);

  const sheet = getSheet_(RSVP_SHEET);
  const headers = ensureRsvpHeaders_(sheet);
  const nowIso = nowIso_();
  const submissionId = generateSubmissionId_();

  const inviteInfo = payload.inviteInfo || {};
  const mealPreference = payload.mealPreference || {};
  const status = String(payload.status || "").trim();
  const contactPhone = String(payload.contactPhone || "");
  const adultCount = num_(payload.guestCountAdult);
  const childCount = num_(payload.guestCountChild);
  const vegetarianCount = num_(mealPreference.vegetarianCount);
  const record = {
    submission_id: submissionId,
    created_at: nowIso,
    status: status,
    contact_name: payload.contactName,
    // Preserve leading zeros in Google Sheets.
    contact_phone: "'" + contactPhone,
    guest_count_adult: adultCount,
    guest_count_child: childCount,
    vegetarianCount: vegetarianCount,
    special_needs: payload.specialNeeds || "",
    activity_wish: payload.activityWish || "",
    message: payload.message || "",
    invite_mode: inviteInfo.inviteMode || "",
    invite_recipient_name: inviteInfo.inviteRecipientName || "",
    digital_method: inviteInfo.digitalMethod || "",
    digital_contact: inviteInfo.digitalContact || "",
    paper_address: inviteInfo.paperAddress || "",
    "填表時間": nowIso,
    "狀態": status,
    "聯絡人": payload.contactName,
    "聯絡點話": "'" + contactPhone,
    "大人數量": adultCount,
    "孩童數量": childCount,
    "素食數量": vegetarianCount,
    "特殊需求": payload.specialNeeds || "",
    "活動許願": payload.activityWish || "",
    "祝福留言": payload.message || "",
    "喜帖接收方式": inviteInfo.inviteMode || "",
    "收件人": inviteInfo.inviteRecipientName || "",
    "電子接收途徑": inviteInfo.digitalMethod || "",
    "電子喜帖接收位置": inviteInfo.digitalContact || "",
    "地址": inviteInfo.paperAddress || ""
  };
  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  });

  sheet.appendRow(row);

  return {
    ok: true,
    code: "OK",
    message: "回覆送出成功",
    submissionId: submissionId
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

  if (!req.action || !req.accessPassword) {
    throw createError_("INVALID_INPUT", "action 與 accessPassword 為必填");
  }
  if (!req.payload || typeof req.payload !== "object") {
    throw createError_("INVALID_INPUT", "payload 必須是 object");
  }

  return req;
}

function verifyAccessPassword_(accessPassword) {
  const expected = PropertiesService.getScriptProperties().getProperty("WEDDING_ACCESS_PASSWORD");
  if (!expected) {
    throw createError_("UNAUTHORIZED", "後端未設定 WEDDING_ACCESS_PASSWORD");
  }
  if (String(accessPassword) !== String(expected)) {
    throw createError_("UNAUTHORIZED", "密碼驗證失敗");
  }
}

function validateBasePayload_(payload) {
  if (!payload || !payload.contactName || !payload.contactPhone) {
    throw createError_("INVALID_INPUT", "contactName/contactPhone 為必填");
  }
  if (!payload.status || (payload.status !== "attend" && payload.status !== "decline")) {
    throw createError_("INVALID_INPUT", "status 必須是 attend 或 decline");
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
    throw createError_("INVALID_INPUT", "同行總人數超過限制，上限：" + maxGuest);
  }
}

function enforceDeadline_(cfg) {
  if (!cfg.deadline_at) {
    return;
  }

  const deadline = new Date(cfg.deadline_at);
  if (!isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
    throw createError_("DEADLINE_PASSED", "已超過截止日期，暫停收件");
  }
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
  } else {
    ensureRsvpHeaders_(rsvp);
  }

  let config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
  }
  if (config.getLastRow() === 0) {
    config.appendRow(["key", "value"]);
    config.appendRow(["deadline_at", "2026-11-20T23:59:00+08:00"]);
    config.appendRow(["event_name", "婚宴賓客表單"]);
    config.appendRow(["event_date", "2026-12-20T18:00:00+08:00"]);
    config.appendRow(["max_guest_per_household", "10"]);
    config.appendRow(["sheet_version", "v1.2.1"]);
  }
}

function ensureRsvpHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  headers = headers.map(function (h) {
    return String(h || "").trim();
  });

  if (headers.length === 1 && headers[0] === "") {
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]);
    return RSVP_HEADERS.slice();
  }
  sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]);
  if (lastCol > RSVP_HEADERS.length) {
    sheet.getRange(1, RSVP_HEADERS.length + 1, 1, lastCol - RSVP_HEADERS.length).clearContent();
  }
  return RSVP_HEADERS.slice();
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
  return "FORM-" + Utilities.formatDate(new Date(), TZ, "yyyyMMdd") + "-" + Utilities.getUuid().slice(0, 8);
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
