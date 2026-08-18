import app from "./roster-contact-entry";

type Env = { [key: string]: unknown };

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/manager-data") {
      const managerResponse = await app.fetch(request, env as never, ctx);
      if (!managerResponse.ok) return managerResponse;

      const managerPayload = await managerResponse.clone().json().catch(() => null) as Record<string, any> | null;
      if (!managerPayload || managerPayload.success !== true) return managerResponse;

      const activitiesUrl = new URL(request.url);
      activitiesUrl.pathname = "/api/activities";
      activitiesUrl.search = "";
      const activitiesRequest = new Request(activitiesUrl.toString(), {
        method: "GET",
        headers: request.headers
      });
      const activitiesResponse = await app.fetch(activitiesRequest, env as never, ctx);
      const activitiesPayload = activitiesResponse.ok
        ? await activitiesResponse.json().catch(() => null) as Record<string, any> | null
        : null;
      const activities = Array.isArray(activitiesPayload?.data?.activities)
        ? activitiesPayload.data.activities
        : Array.isArray(activitiesPayload?.activities)
          ? activitiesPayload.activities
          : [];

      const data = managerPayload.data && typeof managerPayload.data === "object"
        ? { ...managerPayload.data, activities }
        : { activities };

      return new Response(JSON.stringify({
        ...managerPayload,
        data,
        activitiesRestored: true,
        activitiesCount: activities.length
      }), {
        status: managerResponse.status,
        headers: jsonHeaders
      });
    }

    return app.fetch(request, env as never, ctx);
  }
};
