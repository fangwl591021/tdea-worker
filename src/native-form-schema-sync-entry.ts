import app from "./registration-attachment-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };
type Row = Record<string, any>;

const clean = (v: unknown, n = 500) => String(v ?? "").trim().slice(0, n);
const systemKeys = new Set(["name","phone","email","company","memberNo","note","gender","isMember","meal","imageUpload","participantUnit"]);
const configurableSystemKeys = new Set(["gender","isMember","meal","imageUpload"]);

function normalizeField(field: Row, index: number) {
  const type = clean(field.type || "text", 40);
  const safeType = ["text","email","paragraph","radio","checkbox","dropdown","file"].includes(type) ? type : "text";
  return {
    key: clean(field.key || `custom_${index + 1}`, 120),
    label: clean(field.label || field.key || `問題 ${index + 1}`, 240),
    type: safeType,
    required: field.required === true,
    ...(Array.isArray(field.options) ? { options: field.options.map((x: unknown) => clean(x, 240)).filter(Boolean) } : {})
  };
}

function isGenderLabel(value: unknown) {
  return ["性別", "gender"].includes(clean(value, 80).toLowerCase());
}

async function syncNativeFormSchema(env: Env, formId: string) {
  if (!env.ASSETS_BUCKET || !formId) return false;
  const formKey = `forms/native/${encodeURIComponent(formId)}.json`;
  const [formObj, managerObj] = await Promise.all([
    env.ASSETS_BUCKET.get(formKey),
    env.ASSETS_BUCKET.get("manager/state.json")
  ]);
  if (!formObj || !managerObj) return false;

  const form = await formObj.json().catch(() => null) as Row | null;
  const manager = await managerObj.json().catch(() => null) as Row | null;
  if (!form || !manager) return false;

  const activity = form.activity && typeof form.activity === "object" ? form.activity as Row : {};
  const settingsMap = manager.formSettings && typeof manager.formSettings === "object" ? manager.formSettings as Row : {};
  const candidateKeys = [activity.id, activity.activityNo, formId].map((x) => clean(x, 160)).filter(Boolean);
  let settings: Row | null = null;
  for (const key of candidateKeys) {
    const hit = settingsMap[key];
    if (hit && typeof hit === "object") { settings = hit as Row; break; }
  }
  if (!settings) return false;

  const currentFields = Array.isArray(form.fields) ? form.fields.filter((x: unknown) => x && typeof x === "object") as Row[] : [];
  const baseFields = currentFields.filter((field) => {
    const key = clean(field.key, 120);
    return systemKeys.has(key) && !configurableSystemKeys.has(key);
  });
  const nextFields: Row[] = [...baseFields];

  const ensure = (field: Row) => {
    const key = clean(field.key, 120);
    if (!key || nextFields.some((x) => clean(x.key, 120) === key)) return;
    nextFields.push(field);
  };

  const customFields = (Array.isArray(settings.customFields) ? settings.customFields : [])
    .map((field: unknown, index: number) => field && typeof field === "object" ? normalizeField(field as Row, index) : null)
    .filter((field): field is Row => Boolean(field));
  const customGenderField = customFields.find((field) => isGenderLabel(field.label));

  // 若管理者把「性別」當作自訂題目編輯，必須以自訂題目為準。
  // 舊邏輯會在每次 GET Native Form 時重新塞回固定「男性/女性」，導致「其他」等新增選項被洗掉。
  if (!customGenderField && clean(settings.genderField) !== "none" && clean(settings.genderField)) {
    ensure({ key:"gender", label:"性別", type:"radio", options:["男性","女性"], required: clean(settings.genderField) === "required" });
  }
  if (clean(settings.memberField) !== "none" && !["", "login"].includes(clean(settings.memberField))) {
    ensure({ key:"isMember", label:"是否為會員", type:"radio", options:["是","否","不確定"], required: clean(settings.memberField) === "required" });
  }
  if (clean(settings.mealField) !== "none" && clean(settings.mealField)) {
    ensure({ key:"meal", label:"用餐選項", type:"radio", options:["葷","素"], required: clean(settings.mealField) === "required" });
  }
  if (["Y","TRUE","1"].includes(clean(settings.requireImageUpload).toUpperCase())) {
    ensure({ key:"imageUpload", label:"附件上傳", type:"file", required:false });
  }

  customFields.forEach((normalized) => {
    ensure(normalized);
  });

  // 備註固定放最後，避免自訂問題被截在它後面或順序錯亂。
  const noteIndex = nextFields.findIndex((f) => clean(f.key, 120) === "note");
  if (noteIndex >= 0) {
    const [note] = nextFields.splice(noteIndex, 1);
    nextFields.push(note);
  }

  const before = JSON.stringify(currentFields);
  const after = JSON.stringify(nextFields);
  if (before === after) return false;

  form.fields = nextFields;
  form.settings = { ...(form.settings || {}), ...settings };
  form.updatedAt = new Date().toISOString();
  await env.ASSETS_BUCKET.put(formKey, JSON.stringify(form, null, 2), {
    httpMetadata: { contentType:"application/json; charset=utf-8", cacheControl:"no-store" }
  });
  return true;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/native-forms\/([^/]+)$/);
    if (match && (request.method === "GET" || request.method === "POST")) {
      const formId = decodeURIComponent(match[1]);
      await syncNativeFormSchema(env, formId).catch(() => false);
    }
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
