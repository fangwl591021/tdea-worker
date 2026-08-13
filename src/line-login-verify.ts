export type VerifiedLineIdentity = {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  email: string;
};

type LineLoginVerifyEnv = {
  LINE_LOGIN_CHANNEL_ID?: string;
};

const clean = (value: unknown, max = 2048) =>
  String(value ?? "").trim().slice(0, max);

export async function verifyLineIdToken(
  env: LineLoginVerifyEnv,
  idTokenInput: unknown
): Promise<VerifiedLineIdentity> {
  const idToken = clean(idTokenInput, 8192);
  const clientId = clean(
    env.LINE_LOGIN_CHANNEL_ID,
    100
  );

  if (!idToken) {
    throw new Error("缺少 LINE ID Token");
  }

  if (!clientId) {
    throw new Error(
      "LINE_LOGIN_CHANNEL_ID is not configured"
    );
  }

  const body = new URLSearchParams({
    id_token: idToken,
    client_id: clientId
  });

  const response = await fetch(
    "https://api.line.me/oauth2/v2.1/verify",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/x-www-form-urlencoded"
      },
      body
    }
  );

  const result = await response
    .json()
    .catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      clean(
        result.error_description ||
        result.error ||
        "LINE Login 驗證失敗"
      )
    );
  }

  const lineUserId = clean(result.sub, 200);

  if (!/^U[0-9a-f]{32}$/i.test(lineUserId)) {
    throw new Error(
      "LINE Login 回傳的使用者身份無效"
    );
  }

  return {
    lineUserId,
    displayName: clean(result.name, 200),
    pictureUrl: clean(result.picture, 2048),
    email: clean(result.email, 320)
  };
}
