import {
  getIdentityProfile,
  registerIdentityProfile,
  type TdeaIdentityInput
} from "./identity-profile";

type IdentityApiEnv = {
  ASSETS_BUCKET?: R2Bucket;
};

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers":
    "content-type,x-line-user-id,x-line-uid"
};

function json(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "cache-control": "no-store",
        ...headers
      }
    }
  );
}

function clean(value: unknown, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function requestLineUserId(
  request: Request,
  url?: URL
) {
  const target = url || new URL(request.url);

  return clean(
    request.headers.get("x-line-user-id") ||
    request.headers.get("x-line-uid") ||
    target.searchParams.get("lineUserId") ||
    target.searchParams.get("uid"),
    200
  );
}

function publicIdentity(profile: Awaited<
  ReturnType<typeof getIdentityProfile>
>) {
  if (!profile) return null;

  return {
    lineUserId: profile.lineUserId,
    lineDisplayName: profile.lineDisplayName,
    pictureUrl: profile.pictureUrl,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    memberType: profile.memberType,
    memberNo: profile.memberNo,
    verified: profile.verified,
    verifiedSource: profile.verifiedSource,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

export async function getIdentityMeApi(
  request: Request,
  env: IdentityApiEnv
) {
  if (!env.ASSETS_BUCKET) {
    return json(
      {
        success: false,
        message: "R2 bucket is not configured"
      },
      503
    );
  }

  const lineUserId = requestLineUserId(request);

  if (!lineUserId) {
    return json(
      {
        success: false,
        code: "missing_line_user_id",
        message: "缺少 LINE 使用者身份"
      },
      400
    );
  }

  const profile = await getIdentityProfile(
    env,
    lineUserId
  );

  if (!profile) {
    return json(
      {
        success: false,
        code: "identity_not_found",
        message: "尚未完成 TDEA 身分登錄"
      },
      404
    );
  }

  return json({
    success: true,
    data: publicIdentity(profile)
  });
}

export async function registerIdentityApi(
  request: Request,
  env: IdentityApiEnv
) {
  if (!env.ASSETS_BUCKET) {
    return json(
      {
        success: false,
        message: "R2 bucket is not configured"
      },
      503
    );
  }

  const input = await request
    .json()
    .catch(() => ({})) as TdeaIdentityInput;

  const headerUid = requestLineUserId(request);
  const bodyUid = clean(input.lineUserId, 200);

  if (
    headerUid &&
    bodyUid &&
    headerUid.toLowerCase() !==
      bodyUid.toLowerCase()
  ) {
    return json(
      {
        success: false,
        code: "line_user_id_mismatch",
        message: "LINE 使用者身份不一致"
      },
      403
    );
  }

  const lineUserId =
    headerUid || bodyUid;

  if (!lineUserId) {
    return json(
      {
        success: false,
        code: "missing_line_user_id",
        message: "請先完成 LINE Login"
      },
      400
    );
  }

  try {
    const profile =
      await registerIdentityProfile(
        env,
        {
          ...input,
          lineUserId
        }
      );

    return json(
      {
        success: true,
        data: publicIdentity(profile)
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "身分登錄失敗";

    const conflict =
      message.includes("已綁定其他 LINE");

    return json(
      {
        success: false,
        code: conflict
          ? "member_already_bound"
          : "identity_registration_failed",
        message
      },
      conflict ? 409 : 400
    );
  }
}

export async function handleIdentityApi(
  request: Request,
  env: IdentityApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);

  if (
    request.method === "OPTIONS" &&
    url.pathname.startsWith("/api/identity/")
  ) {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/identity/me"
  ) {
    return getIdentityMeApi(
      request,
      env
    );
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/identity/register"
  ) {
    return registerIdentityApi(
      request,
      env
    );
  }

  return null;
}
