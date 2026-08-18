import app from "./dynamic-payment-hotfix-entry";

type Env = { ASSETS_BUCKET?: R2Bucket; [key:string]: unknown };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (v: unknown, n = 240) => String(v ?? "").trim().slice(0, n);
const allowedTypes = new Set(["image/jpeg","image/png","image/webp","image/gif","application/pdf"]);

function safeName(name: string) {
  return clean(name, 160).replace(/[^a-zA-Z0-9._-]+/g, "-") || "attachment";
}

async function uploadRegistrationAttachment(request: Request, env: Env) {
  if (!env.ASSETS_BUCKET) return json({ success:false, message:"Attachment storage unavailable" }, 503);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ success:false, message:"Invalid upload" }, 400);
  const file = form.get("file");
  const formId = clean(form.get("formId"), 120);
  if (!(file instanceof File) || !file.size) return json({ success:false, message:"請選擇附件" }, 400);
  if (!formId) return json({ success:false, message:"缺少活動表單識別" }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ success:false, message:"附件不可超過 8MB" }, 413);
  const type = clean(file.type, 120).toLowerCase();
  if (!allowedTypes.has(type)) return json({ success:false, message:"僅支援 JPG、PNG、WEBP、GIF、PDF" }, 415);

  const token = crypto.randomUUID();
  const key = `registration-attachments/${encodeURIComponent(formId)}/${token}-${safeName(file.name)}`;
  await env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: type, cacheControl: "private, max-age=0, no-store" },
    customMetadata: { originalName: clean(file.name, 180), formId, uploadedAt: new Date().toISOString() }
  });
  return json({ success:true, url:`/api/registration-attachments/${encodeURIComponent(key)}`, key, name:file.name, type, size:file.size });
}

async function serveRegistrationAttachment(request: Request, env: Env, encodedKey: string) {
  if (!env.ASSETS_BUCKET) return new Response("Not Found", { status:404 });
  const key = decodeURIComponent(encodedKey);
  if (!key.startsWith("registration-attachments/")) return new Response("Not Found", { status:404 });
  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) return new Response("Not Found", { status:404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=0, no-store");
  headers.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(object.customMetadata?.originalName || "attachment")}`);
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/registration-attachments") {
      return uploadRegistrationAttachment(request, env);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/registration-attachments/")) {
      return serveRegistrationAttachment(request, env, url.pathname.slice("/api/registration-attachments/".length));
    }
    return app.fetch(request, env as never, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return (app as any).scheduled?.(controller, env, ctx);
  }
};
