const CONFIG = {
  DRIVE_FOLDER_ID: "1hdZh1kePXuS-KxrGBqQ3oeGCJfNw9tZ3",
  SHARED_SECRET: "",
  SYNC_WEBHOOK_URL: "https://tdeawork.fangwl591021.workers.dev/api/google-forms/submission"
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    if (CONFIG.SHARED_SECRET && body.sharedSecret !== CONFIG.SHARED_SECRET) {
      return jsonOutput({ success: false, code: "invalid_secret", message: "Invalid shared secret" });
    }
    if (body.action !== "CREATE_GOOGLE_FORM") {
      return jsonOutput({ success: false, code: "unknown_action", message: "Unknown action" });
    }
    return jsonOutput(createGoogleForm(body));
  } catch (error) {
    return jsonOutput({
      success: false,
      code: "server_error",
      message: String(error && error.message ? error.message : error)
    });
  }
}

function createGoogleForm(body) {
  const activity = body.activity || {};
  const settings = body.settings || {};
  const title = clean(activity.name) || "TDEA 活動報名";
  const form = FormApp.create(title);

  form.setDescription(buildDescription(activity));
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setAcceptingResponses(true);
  form.setConfirmationMessage("報名資料已送出，謝謝。");

  const fields = normalizeFields(settings);
  if (settings.youtubeUrl) {
    form.addSectionHeaderItem().setTitle("活動影片").setHelpText(settings.youtubeUrl);
  }
  fields.forEach(function(field) {
    addField(form, field);
  });

  const sheet = SpreadsheetApp.create(title + " 回覆");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  storeFormMetadata(form, sheet, activity);
  const triggerResult = installSubmitTrigger(form);
  moveFileToFolder(form.getId(), CONFIG.DRIVE_FOLDER_ID);
  moveFileToFolder(sheet.getId(), CONFIG.DRIVE_FOLDER_ID);

  return {
    success: true,
    formId: form.getId(),
    formUrl: form.getPublishedUrl(),
    responderUri: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sheetId: sheet.getId(),
    sheetUrl: sheet.getUrl(),
    triggerInstalled: triggerResult.success,
    triggerError: triggerResult.message || ""
  };
}

function normalizeFields(settings) {
  if (Array.isArray(settings.fields) && settings.fields.length) {
    return settings.fields
      .map(function(field, index) {
        return {
          key: clean(field.key) || "field_" + (index + 1),
          label: clean(field.label),
          type: normalizeType(field.type),
          options: normalizeOptions(field.options),
          required: Boolean(field.required)
        };
      })
      .filter(function(field) { return field.label; });
  }
  return defaultFields(settings);
}

function defaultFields(settings) {
  const fields = [
    { key: "name", label: "姓名", type: "text", required: true },
    { key: "phone", label: "手機", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "company", label: "公司 / 單位", type: "text", required: false },
    { key: "memberNo", label: "會員編號", type: "text", required: false }
  ];
  if (settings.genderField && settings.genderField !== "none") {
    fields.push({ key: "gender", label: "性別", type: "radio", options: ["男", "女", "不透露"], required: settings.genderField === "required" });
  }
  if (settings.memberField && settings.memberField !== "login" && settings.memberField !== "none") {
    fields.push({ key: "isMember", label: "是否為會員", type: "radio", options: ["是", "否", "不確定"], required: settings.memberField === "required" });
  }
  if (settings.mealField && settings.mealField !== "none") {
    fields.push({ key: "meal", label: "用餐選項", type: "radio", options: ["葷", "素"], required: settings.mealField === "required" });
  }
  if (settings.requireImageUpload === "Y") {
    fields.push({ key: "imageUpload", label: "圖片 / 檔案上傳", type: "file", required: false });
  }
  fields.push({ key: "note", label: "備註", type: "paragraph", required: false });
  return fields;
}

function buildDescription(activity) {
  const lines = [];
  if (activity.activityNo) lines.push("活動編號：" + activity.activityNo);
  if (activity.type) lines.push("活動類型：" + activity.type);
  if (activity.courseTime) lines.push("課程時間：" + activity.courseTime);
  if (activity.deadline) lines.push("報名截止：" + activity.deadline);
  if (activity.capacity) lines.push("人數限制：" + activity.capacity);
  if (activity.detailText) lines.push("", activity.detailText);
  return lines.join("\n");
}

function normalizeType(type) {
  const value = clean(type).toLowerCase();
  if (value === "choice") return "radio";
  if (["text", "email", "paragraph", "radio", "checkbox", "dropdown", "file"].indexOf(value) >= 0) return value;
  return "text";
}

function normalizeOptions(options) {
  if (Array.isArray(options)) return options.map(clean).filter(Boolean);
  return String(options || "").split(/\n|,/).map(clean).filter(Boolean);
}

function addTextItem(form, title, required) {
  form.addTextItem().setTitle(title).setRequired(Boolean(required));
}

function addChoiceItem(form, title, choices, required) {
  const item = form.addMultipleChoiceItem();
  item.setTitle(title);
  item.setChoiceValues(choices);
  item.setRequired(Boolean(required));
}

function addFileUploadItem(form, title, required) {
  try {
    form.addFileUploadItem()
      .setTitle(title)
      .setHelpText("請上傳活動要求的檔案。")
      .setRequired(Boolean(required));
  } catch (error) {
    form.addParagraphTextItem()
      .setTitle(title + "連結")
      .setHelpText("此 Google 帳號無法建立檔案上傳題，請填寫雲端檔案連結。")
      .setRequired(Boolean(required));
  }
}

function addField(form, field) {
  const title = clean(field && field.label);
  if (!title) return;
  const type = normalizeType(field.type || "text");
  const required = Boolean(field.required);
  const options = normalizeOptions(field.options);
  const choiceValues = options.length ? options : ["選項 1", "選項 2"];

  if (type === "file") {
    addFileUploadItem(form, title, required);
    return;
  }
  if (type === "paragraph") {
    form.addParagraphTextItem().setTitle(title).setRequired(required);
    return;
  }
  if (type === "radio") {
    addChoiceItem(form, title, choiceValues, required);
    return;
  }
  if (type === "checkbox") {
    const item = form.addCheckboxItem();
    item.setTitle(title);
    item.setChoiceValues(choiceValues);
    item.setRequired(required);
    return;
  }
  if (type === "dropdown") {
    const item = form.addListItem();
    item.setTitle(title);
    item.setChoiceValues(choiceValues);
    item.setRequired(required);
    return;
  }
  addTextItem(form, title, required);
}

function storeFormMetadata(form, sheet, activity) {
  const payload = {
    formId: form.getId(),
    sheetId: sheet.getId(),
    activity: {
      id: clean(activity.id),
      activityNo: clean(activity.activityNo),
      name: clean(activity.name)
    }
  };
  PropertiesService.getScriptProperties().setProperty("FORM_" + form.getId(), JSON.stringify(payload));
}

function installSubmitTrigger(form) {
  try {
    ScriptApp.newTrigger("handleFormSubmit").forForm(form).onFormSubmit().create();
    return { success: true };
  } catch (error) {
    return { success: false, message: String(error && error.message ? error.message : error) };
  }
}

function handleFormSubmit(e) {
  const form = e.source;
  const formId = form.getId();
  const metadata = JSON.parse(PropertiesService.getScriptProperties().getProperty("FORM_" + formId) || "{}");
  const answers = {};
  (e.response ? e.response.getItemResponses() : []).forEach(function(itemResponse) {
    answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  UrlFetchApp.fetch(CONFIG.SYNC_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      action: "FORM_SUBMISSION",
      sharedSecret: CONFIG.SHARED_SECRET,
      formId: formId,
      activity: metadata.activity || {},
      submittedAt: new Date().toISOString(),
      answers: answers
    })
  });
}

function authorizeTriggerScope() {
  const triggers = ScriptApp.getProjectTriggers();
  return "Trigger permission OK. Current triggers: " + triggers.length;
}

function moveFileToFolder(fileId, folderId) {
  if (!folderId) return;
  const file = DriveApp.getFileById(fileId);
  const folder = DriveApp.getFolderById(folderId);
  folder.addFile(file);
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (error) {
    // Shared Drive or permission-limited accounts may not allow root removal.
  }
}

function clean(value) {
  return String(value || "").trim();
}

function jsonOutput(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
