type Env = {
  DB?: D1Database;
  ADMIN_EMAILS: string;
  ASSETS: Fetcher;
  ASSETS_BUCKET?: R2Bucket;
};

type ActivityInput = {
  name?: string;
  type?: string;
  courseTime?: string;
  deadline?: string;
  capacity?: number;
  status?: string;
  formUrl?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,x-admin-email"
    }
  });

const notFound = () => json({ success: false, message: "Not found" }, 404);

const getId = () => crypto.randomUUID();

async function requireAdmin(request: Request, env: Env) {
  const adminEmails = env.ADMIN_EMAILS.split(",").map((item) => item.trim().toLowerCase());
  const email = request.headers.get("x-admin-email")?.trim().toLowerCase();

  if (!email || !adminEmails.includes(email)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }

  return null;
}

function extensionFromType(type: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf"
  };
  return map[type] ?? "bin";
}

async function uploadFile(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.ASSETS_BUCKET) {
    return json({ success: false, message: "R2 bucket is not configured" }, 503);
  }

  const form = await request.formData();
  const file = form.get("file");
  const purpose = String(form.get("purpose") || "activity").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "activity";
  const activityId = String(form.get("activityId") || "draft").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "draft";

  if (!(file instanceof File)) {
    return json({ success: false, message: "File is required" }, 400);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return json({ success: false, message: "Unsupported file type" }, 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    return json({ success: false, message: "File is larger than 10MB" }, 400);
  }

  const key = `${purpose}/${activityId}/${crypto.randomUUID()}.${extensionFromType(file.type)}`;
  await env.ASSETS_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000"
    },
    customMetadata: {
      originalName: file.name
    }
  });

  return json({
    success: true,
    key,
    url: `/api/uploads/${encodeURIComponent(key)}`,
    contentType: file.type,
    size: file.size
  }, 201);
}

async function getUploadedFile(env: Env, key: string) {
  if (!env.ASSETS_BUCKET) {
    return notFound();
  }

  const object = await env.ASSETS_BUCKET.get(key);
  if (!object) {
    return notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");
  return new Response(object.body, { headers });
}

async function listActivities(env: Env, activeOnly = false) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const query = activeOnly
    ? "SELECT * FROM activities WHERE status = 'published' ORDER BY created_at DESC"
    : "SELECT * FROM activities ORDER BY created_at DESC";

  const { results } = await env.DB.prepare(query).all();
  return json({ success: true, data: results ?? [] });
}

async function createActivity(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = (await request.json()) as ActivityInput;
  const name = input.name?.trim();
  const type = input.type?.trim() || "lecture";

  if (!name) {
    return json({ success: false, message: "Activity name is required" }, 400);
  }

  const id = getId();
  await env.DB.prepare(
    `INSERT INTO activities
      (id, name, type, course_time, deadline, capacity, status, form_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      type,
      input.courseTime ?? "",
      input.deadline ?? "",
      Number(input.capacity ?? 0),
      input.status ?? "draft",
      input.formUrl ?? ""
    )
    .run();

  return json({ success: true, id }, 201);
}

async function listAssociationMembers(env: Env) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM association_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function listVendorMembers(env: Env) {
  if (!env.DB) {
    return json({ success: true, data: [] });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM vendor_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function updateAssociationMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(
    `UPDATE association_members
     SET identity = ?, name = ?, gender = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.identity ?? "",
      input.name ?? "",
      input.gender ?? "",
      input.qualification ?? "Y",
      input.note ?? "",
      id
    )
    .run();

  return json({ success: true });
}

async function updateVendorMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

  if (!env.DB) {
    return json({ success: false, message: "Database is not configured" }, 503);
  }

  const input = await request.json() as Record<string, string>;
  await env.DB.prepare(
    `UPDATE vendor_members
     SET company_name = ?, tax_id = ?, owner = ?, contact = ?, qualification = ?, note = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      input.companyName ?? "",
      input.taxId ?? "",
      input.owner ?? "",
      input.contact ?? "",
      input.qualification ?? "Y",
      input.note ?? "",
      id
    )
    .run();

  return json({ success: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
          "access-control-allow-headers": "content-type,x-admin-email"
        }
      });
    }

    if (request.method === "POST" && pathname === "/api/uploads") {
      return uploadFile(request, env);
    }

    const uploadMatch = pathname.match(/^\/api\/uploads\/(.+)$/);
    if (request.method === "GET" && uploadMatch) {
      return getUploadedFile(env, decodeURIComponent(uploadMatch[1]));
    }

    if (request.method === "GET" && pathname === "/api/activities") {
      return listActivities(env);
    }

    if (request.method === "GET" && pathname === "/api/activities/active") {
      return listActivities(env, true);
    }

    if (request.method === "POST" && pathname === "/api/activities") {
      return createActivity(request, env);
    }

    if (request.method === "GET" && pathname === "/api/members/association") {
      return listAssociationMembers(env);
    }

    if (request.method === "GET" && pathname === "/api/members/vendor") {
      return listVendorMembers(env);
    }

    const assocMatch = pathname.match(/^\/api\/members\/association\/([^/]+)$/);
    if (request.method === "PUT" && assocMatch) {
      return updateAssociationMember(request, env, assocMatch[1]);
    }

    const vendorMatch = pathname.match(/^\/api\/members\/vendor\/([^/]+)$/);
    if (request.method === "PUT" && vendorMatch) {
      return updateVendorMember(request, env, vendorMatch[1]);
    }

    if (pathname.startsWith("/api/")) {
      return notFound();
    }

    return env.ASSETS.fetch(request);
  }
};
