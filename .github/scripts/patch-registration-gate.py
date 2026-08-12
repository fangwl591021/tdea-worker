from pathlib import Path
import re

p = Path('src/monthly-entry.ts')
b = p.read_bytes()

old_type = b'type RegistrationIdentity = { kind: "crm-member" | "mother-registered"; rosterType: "association" | "vendor" | "mother";'
new_type = b'type RegistrationIdentity = { kind: "crm-member" | "mother-registered"; rosterType: "general" | "association" | "vendor" | "mother";'
if old_type in b:
    b = b.replace(old_type, new_type, 1)
elif new_type not in b:
    raise SystemExit('RegistrationIdentity type anchor not found')

old_return = b'return { success: true, balance: numberValue(result.balance), logs, source: "tdea-design-d1", userId: clean(result.userId) };'
new_return = b'return { success: true, balance: numberValue(result.balance), logs, source: "tdea-design-d1", userId: clean(result.userId), registered: result.registered === true, member: asRecord(result.member) };'
if old_return in b:
    b = b.replace(old_return, new_return, 1)
elif new_return not in b:
    raise SystemExit('getUnifiedPointAccount return anchor not found')

helper_marker = b'function registrationIdentityFromTdeaMember('
if helper_marker not in b:
    helper = br'''
function registrationIdentityFromTdeaMember(member: Record<string, unknown>, lineUserId: string): RegistrationIdentity {
  const memberType = ["association", "vendor"].includes(clean(member.memberType)) ? clean(member.memberType) : "general";
  const memberNo = firstClean(member.rosterMemberNumber, member.companyMemberNumber, member.memberNumber);
  const name = firstClean(member.fullName, member.displayName, "TDEA 會員");
  const role = memberType === "association" ? "協會會員" : memberType === "vendor" ? "廠商會員" : "一般會員";
  return {
    kind: "crm-member",
    rosterType: memberType as "general" | "association" | "vendor",
    memberNo,
    name,
    role,
    lineUserId,
    identityKey: `tdea:${firstClean(member.userId, lineUserId)}`,
    source: "tdea-design",
    company: "",
    phone: clean(member.phone),
    email: clean(member.email),
    gender: clean(member.gender),
    raw: member
  };
}

async function resolveTdeaRegisteredIdentity(env: Env, lineUserId: string) {
  const account = await getUnifiedPointAccount(env, lineUserId) as Record<string, unknown>;
  if (account.success !== true) return { success: false, registered: false, message: clean(account.message) || "TDEA 會員服務讀取失敗" };
  const member = asRecord(account.member);
  if (account.registered !== true || !clean(member.profileCompletedAt)) {
    return { success: true, registered: false, member };
  }
  return { success: true, registered: true, member, identity: registrationIdentityFromTdeaMember(member, lineUserId) };
}
'''
    marker = b'async function syncCheckinPoints(env: Env, entry: RegistrationEntry) {'
    if marker not in b:
        raise SystemExit('syncCheckinPoints anchor not found')
    b = b.replace(marker, helper + b'\r\n' + marker, 1)

# Bound replacements to the next known function so nested braces cannot truncate the source.
rx = re.compile(
    rb'async function getNativeLoginMember\(request: Request, env: Env, formId: string\) \{.*?\r?\n\}\r?\n(?=\r?\nfunction validateNativeAnswers)',
    re.S,
)
m = rx.search(b)
if not m:
    raise SystemExit('getNativeLoginMember function not found')
new_get = br'''async function getNativeLoginMember(request: Request, env: Env, formId: string) {
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const url = new URL(request.url);
  const lineUserId = firstClean(url.searchParams.get("lineUserId"), url.searchParams.get("uid"), url.searchParams.get("LINE_user_id"));
  if (!lineUserId) return json({ success: false, message: "缺少 LINE UID" }, 400);
  const resolved = await resolveTdeaRegisteredIdentity(env, lineUserId);
  if (resolved.success !== true) return json({ success: false, code: "member_service_unavailable", message: clean(resolved.message) || "會員服務暫時無法使用" }, 502);
  if (resolved.registered !== true || !resolved.identity) {
    return json({ success: false, code: "registration_required", message: "尚未完成 TDEA 會員註冊，請先註冊後再報名活動。", registerUrl: "https://liff.line.me/2005868456-3Ip8H1Bx" }, 403);
  }
  return json({ success: true, data: publicRegistrationIdentity(resolved.identity), member: resolved.member });
}'''
b = b[:m.start()] + new_get + b[m.end():]

rx = re.compile(
    rb'async function submitNativeForm\(request: Request, env: Env, formId: string\) \{.*?\r?\n\}\r?\n(?=\r?\nasync function createNativeRegistration)',
    re.S,
)
m = rx.search(b)
if not m:
    raise SystemExit('submitNativeForm function not found')
new_submit = br'''async function submitNativeForm(request: Request, env: Env, formId: string) {
  if (!env.ASSETS_BUCKET) return json({ success: false, message: "R2 bucket is not configured" }, 503);
  const form = await readNativeForm(env, formId);
  if (!form) return json({ success: false, message: "找不到報名表" }, 404);
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const rawAnswers = asRecord(input.answers);
  const answers = normalizeAnswersRecord(rawAnswers);
  const lineUserId = firstClean(input.lineUserId, rawAnswers.LINE_user_id, rawAnswers.lineUserId, rawAnswers.line_user_id, rawAnswers.uid, rawAnswers.UID);
  if (!lineUserId) return json({ success: false, code: "line_login_required", message: "請先使用 LINE 登入後再報名活動。" }, 401);
  const resolved = await resolveTdeaRegisteredIdentity(env, lineUserId);
  if (resolved.success !== true) return json({ success: false, code: "member_service_unavailable", message: clean(resolved.message) || "會員服務暫時無法使用" }, 502);
  if (resolved.registered !== true || !resolved.identity) {
    return json({ success: false, code: "registration_required", message: "尚未完成 TDEA 會員註冊，請先註冊後再報名活動。", registerUrl: "https://liff.line.me/2005868456-3Ip8H1Bx" }, 403);
  }
  const identity = resolved.identity as RegistrationIdentity;
  const sessionId = clean(input.sessionId || "default");
  const finalAnswers = normalizeAnswersRecord({ ...answers, ...registrationIdentityAnswers(identity) });
  const errors = validateNativeLoginAnswers(form, finalAnswers, sessionId);
  if (errors.length) return json({ success: false, message: errors[0], errors }, 400);
  return createNativeRegistration(env, form, finalAnswers, lineUserId, sessionId, "tdea_registered", identity);
}'''
b = b[:m.start()] + new_submit + b[m.end():]
p.write_bytes(b)

p = Path('public/native-form.js')
s = p.read_text(encoding='utf-8')

helper = '''  function isRegistrationProfileField(field) {
    const key = trim(field?.key || "").toLowerCase().replace(/[\\s_-]+/g, "");
    const label = trim(field?.label || "").toLowerCase().replace(/[\\s_-]+/g, "");
    const text = key + "|" + label;
    return [
      "name", "fullname", "membername", "姓名", "全名",
      "phone", "mobile", "tel", "telephone", "手機", "電話", "行動電話",
      "email", "mail", "電子郵件", "信箱",
      "company", "companyname", "unit", "公司", "單位", "公司單位",
      "memberno", "membernumber", "rostermemberno", "會員編號",
      "membertype", "role", "身分", "身份",
      "lineuserid", "lineuid", "lineid", "uid"
    ].some((token) => text.includes(token));
  }

'''
marker = '  async function showRegister(id) {'
if 'function isRegistrationProfileField' not in s:
    if marker not in s:
        raise SystemExit('showRegister anchor not found')
    s = s.replace(marker, helper + marker, 1)

rx = re.compile(r'  async function showRegister\(id\) \{.*?\n  \}\n\n  function registrationStatus', re.S)
m = rx.search(s)
if not m:
    raise SystemExit('showRegister function block not found')
new_show = '''  async function showRegister(id) {
    renderLoading("載入報名表...");
    const response = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return renderError(result.message || "找不到報名表");
    const form = result.data || {};
    const activity = form.activity || {};
    const sessions = Array.isArray(form.sessions) ? form.sessions : [];
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const activityFields = fields.filter((field) => !isRegistrationProfileField(field));
    const image = activity.posterUrl || activity.imageUrl || "";

    renderLoading("確認 TDEA 會員註冊狀態...");
    const uid = await loadLiff({ login: true });
    if (!uid) return renderError("無法取得 LINE UID，請從 LINE 開啟活動報名頁並完成登入。");

    const memberResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}/login-member?lineUserId=${encodeURIComponent(uid)}`, { cache: "no-store" });
    const memberResult = await memberResponse.json().catch(() => ({}));
    if (!memberResponse.ok || !memberResult.success) {
      if (memberResult.code === "registration_required") {
        const registerUrl = memberResult.registerUrl || "https://liff.line.me/2005868456-3Ip8H1Bx";
        renderShell(`<section class="nf-card">
          ${image ? `<img class="nf-hero" src="${esc(image)}" alt="">` : ""}
          <div class="nf-body">
            <h1 class="nf-title">${esc(activity.name || "活動報名")}</h1>
            <div class="nf-alert">${esc(memberResult.message || "尚未完成 TDEA 會員註冊，請先註冊後再報名活動。")}</div>
            <div class="nf-detail">活動報名採 TDEA 會員制。完成註冊後，系統會自動辨識一般會員、協會會員或廠商會員，不需要再次填寫身份資料。</div>
            <div class="nf-actions"><a class="nf-btn primary" href="${esc(registerUrl)}">立即註冊</a><button class="nf-btn" type="button" data-reload-registration>我已完成註冊</button></div>
          </div>
        </section>`);
        app.querySelector("[data-reload-registration]")?.addEventListener("click", () => showRegister(id));
        return;
      }
      return renderError(memberResult.message || "會員資料讀取失敗");
    }

    const member = memberResult.data || {};
    renderShell(`<section class="nf-card">
      ${image ? `<img class="nf-hero" src="${esc(image)}" alt="">` : ""}
      <div class="nf-body">
        <h1 class="nf-title">${esc(activity.name || "活動報名")}</h1>
        <div class="nf-meta">${activity.courseTime ? `<span class="nf-pill">${esc(activity.courseTime)}</span>` : ""}${activity.deadline ? `<span class="nf-pill">截止 ${esc(activity.deadline)}</span>` : ""}</div>
        ${activity.detailText ? `<div class="nf-detail">${esc(activity.detailText)}</div>` : ""}
        <div class="nf-ok">已完成會員驗證，以下身份資料由 TDEA 會員中心自動帶入。</div>
        ${memberSummary(member)}
        <form class="nf-form" data-native-register novalidate>
          ${sessionFieldHtml(sessions)}
          ${activityFields.map(fieldHtml).join("")}
          <div class="nf-actions"><button class="nf-btn primary" type="submit">確認報名</button><a class="nf-btn" href="?query=1">報名查詢/取消</a></div>
        </form>
      </div>
    </section>`);

    const registerForm = app.querySelector("[data-native-register]");
    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const requiredError = validateVisibleRequired(registerForm);
      if (requiredError) return alert(requiredError);
      const submit = registerForm.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "報名中...";
      const answers = collectAnswers(registerForm, activityFields);
      const sessionId = registerForm.elements.sessionId?.value || sessions[0]?.id || "default";
      const submitResponse = await fetch(`${api}/api/native-forms/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, lineUserId: uid, answers })
      });
      const submitResult = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok || !submitResult.success) {
        submit.disabled = false;
        submit.textContent = "確認報名";
        if (submitResult.code === "registration_required") return showRegister(id);
        return alert(submitResult.message || "報名失敗");
      }
      renderReceipt(submitResult);
    });
  }

  function registrationStatus'''
s = s[:m.start()] + new_show + s[m.end():]
p.write_text(s, encoding='utf-8', newline='')
