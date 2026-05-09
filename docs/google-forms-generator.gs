const CONFIG = {
  DRIVE_FOLDER_ID: "1hdZh1kePXuS-KxrGBqQ3oeGCJfNw9tZ3",
  SHARED_SECRET: ""
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    if (CONFIG.SHARED_SECRET && body.sharedSecret !== CONFIG.SHARED_SECRET) {
      return jsonOutput({ success: false, code: "invalid_secret", message: "Invalid shared secret" }, 403);
    }
    if (body.action !== "CREATE_GOOGLE_FORM") {
      return jsonOutput({ success: false, code: "unknown_action", message: "Unknown action" }, 400);
    }
    return jsonOutput(createGoogleForm(body), 200);
  } catch (error) {
    return jsonOutput({ success: false, code: "server_error", message: String(error && error.message ? error.message : error) }, 500);
  }
}

function createGoogleForm(body) {
  const activity = body.activity || {};
  const settings = body.settings || {};
  const title = clean(activity.name) || "TDEA 活動報名表";
  const form = FormApp.create(title);

  form.setDescription(buildDescription(activity));
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setAcceptingResponses(true);
  form.setConfirmationMessage("報名資料已送出，感謝您。");

  addTextItem(form, "姓名", true);
  addTextItem(form, "手機", true);
  addTextItem(form, "Email", true);
  addTextItem(form, "公司 / 單位", false);
  addTextItem(form, "會員編號", false);

  if (settings.genderField !== "none") {
    addChoiceItem(form, "性別", ["男", "女", "不便透露"], settings.genderField !== "optional");
  }
  if (settings.memberField !== "login") {
    addChoiceItem(form, "是否為會員", ["是", "否", "不確定"], settings.memberField !== "optional");
  }
  if (settings.mealField !== "none") {
    addChoiceItem(form, "用餐選項", ["葷", "素"], settings.mealField !== "optional");
  }
  if (settings.youtubeUrl) {
    form.addSectionHeaderItem().setTitle("活動影片").setHelpText(settings.youtubeUrl);
  }
  if (settings.requireImageUpload === "Y") {
    addFileUploadItem(form);
  }
  form.addParagraphTextItem().setTitle("備註").setRequired(false);
  (settings.customFields || []).forEach(function(field) {
    addCustomField(form, field);
  });

  const sheet = SpreadsheetApp.create(title + " 回覆");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  moveFileToFolder(form.getId(), CONFIG.DRIVE_FOLDER_ID);
  moveFileToFolder(sheet.getId(), CONFIG.DRIVE_FOLDER_ID);

  return {
    success: true,
    formId: form.getId(),
    formUrl: form.getPublishedUrl(),
    responderUri: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sheetId: sheet.getId(),
    sheetUrl: sheet.getUrl()
  };
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

function addTextItem(form, title, required) {
  form.addTextItem().setTitle(title).setRequired(Boolean(required));
}

function addChoiceItem(form, title, choices, required) {
  const item = form.addMultipleChoiceItem();
  item.setTitle(title);
  item.setChoiceValues(choices);
  item.setRequired(Boolean(required));
}

function addFileUploadItem(form) {
  try {
    form.addFileUploadItem()
      .setTitle("圖片 / 附件上傳")
      .setHelpText("請上傳活動指定資料。")
      .setRequired(false);
  } catch (error) {
    form.addParagraphTextItem()
      .setTitle("圖片 / 附件連結")
      .setHelpText("此 Google 帳號目前無法建立檔案上傳欄位，請貼上雲端檔案連結。")
      .setRequired(false);
  }
}

function addCustomField(form, field) {
  const title = clean(field && field.label);
  if (!title) return;
  const type = clean(field.type || "text");
  const required = Boolean(field.required);
  const options = Array.isArray(field.options) ? field.options.map(clean).filter(Boolean) : [];

  if (type === "paragraph") {
    form.addParagraphTextItem().setTitle(title).setRequired(required);
    return;
  }
  if (type === "radio") {
    addChoiceItem(form, title, options.length ? options : ["選項一", "選項二"], required);
    return;
  }
  if (type === "checkbox") {
    const item = form.addCheckboxItem();
    item.setTitle(title);
    item.setChoiceValues(options.length ? options : ["選項一", "選項二"]);
    item.setRequired(required);
    return;
  }
  if (type === "dropdown") {
    const item = form.addListItem();
    item.setTitle(title);
    item.setChoiceValues(options.length ? options : ["選項一", "選項二"]);
    item.setRequired(required);
    return;
  }
  addTextItem(form, title, required);
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

function jsonOutput(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
