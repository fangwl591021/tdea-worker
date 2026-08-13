from pathlib import Path

p = Path('public/native-form.js')
s = p.read_text(encoding='utf-8')
old = '''    async function runLoginQuery() {
      const box = app.querySelector("[data-my-query-result]");
      const uid = await loadLiff({ login: true });
      if (!uid) {
        box.innerHTML = `<div class="nf-alert">無法取得 LINE UID，請從 LINE LIFF 開啟查詢頁。</div>`;
        return;
      }
'''
new = '''    async function runLoginQuery() {
      const box = app.querySelector("[data-my-query-result]");
      const passedUid = trim(params.get("lineUserId") || params.get("uid") || params.get("LINE_user_id"));
      const uid = passedUid || await loadLiff({ login: true });
      if (!uid) {
        box.innerHTML = `<div class="nf-alert">無法取得 LINE UID，請從已登入的 TDEA 會員中心重新開啟活動紀錄。</div>`;
        return;
      }
'''
if old in s:
    s = s.replace(old, new, 1)
elif 'const passedUid = trim(params.get("lineUserId")' not in s:
    raise SystemExit('runLoginQuery anchor not found')
p.write_text(s, encoding='utf-8', newline='')
