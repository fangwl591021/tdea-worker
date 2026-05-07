type Env = {
  DB: D1Database;
  ADMIN_EMAILS: string;
  ASSETS: Fetcher;
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

async function listActivities(env: Env, activeOnly = false) {
  const query = activeOnly
    ? "SELECT * FROM activities WHERE status = 'published' ORDER BY created_at DESC"
    : "SELECT * FROM activities ORDER BY created_at DESC";

  const { results } = await env.DB.prepare(query).all();
  return json({ success: true, data: results ?? [] });
}

async function createActivity(request: Request, env: Env) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

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
  const { results } = await env.DB.prepare(
    "SELECT * FROM association_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function listVendorMembers(env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM vendor_members ORDER BY created_at DESC"
  ).all();
  return json({ success: true, data: results ?? [] });
}

async function updateAssociationMember(request: Request, env: Env, id: string) {
  const guard = await requireAdmin(request, env);
  if (guard) return guard;

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
