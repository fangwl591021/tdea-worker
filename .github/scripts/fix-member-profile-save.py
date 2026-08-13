from pathlib import Path

p = Path('public/app.js')
s = p.read_text(encoding='utf-8')

old_merge = '''        company: firstValue(remoteRow?.company, remoteRow?.companyName, remoteRow?.unit, localRow?.company, localRow?.companyName, localRow?.unit),
        loginAccess,
        allowLogin: loginAccess,
        canLogin: loginAccess
'''
new_merge = '''        company: firstValue(remoteRow?.company, remoteRow?.companyName, remoteRow?.unit, localRow?.company, localRow?.companyName, localRow?.unit),
        qualification: firstValue(localRow?.qualification, remoteRow?.qualification, "Y"),
        loginAccess,
        allowLogin: loginAccess,
        canLogin: loginAccess
'''
if old_merge in s:
    s = s.replace(old_merge, new_merge, 1)
elif 'qualification: firstValue(localRow?.qualification' not in s:
    raise SystemExit('mergeRosterRows anchor not found')

old_submit = '''    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = async e => { e.preventDefault(); const type = mf.dataset.type; const d = Object.fromEntries(new FormData(mf)); const rows = state.data[type]; const old = rows.find(r => r.id === d.id); const loginAccess = d.loginAccess === "Y"; const item = { ...d, id: d.id || uid(), loginAccess, allowLogin: loginAccess, canLogin: loginAccess }; old ? Object.assign(old, item) : rows.unshift(item); try { await syncRosterMemberToWorker(type, item); await syncAdminAccessForMember(type, item); state.drawer = ""; save(); state.adminWhitelist = null; render(); toast("名冊與管理權限已儲存"); } catch (err) { toast(err?.message || "名冊儲存失敗"); } };
'''
new_submit = '''    const mf = document.querySelector("#drawer-member"); if (mf) mf.onsubmit = e => {
      e.preventDefault();
      const type = mf.dataset.type;
      const d = Object.fromEntries(new FormData(mf));
      const rows = state.data[type];
      const old = rows.find(r => r.id === d.id);
      const loginAccess = d.loginAccess === "Y";
      const item = { ...d, id: d.id || uid(), loginAccess, allowLogin: loginAccess, canLogin: loginAccess };
      old ? Object.assign(old, item) : rows.unshift(item);

      // Explicit CRM edits win immediately in the UI. Persist a local snapshot first,
      // then do the three remote jobs in parallel instead of blocking the drawer.
      persistLocalSnapshot();
      state.drawer = "";
      render();
      toast("會員資料已更新，背景儲存中...");

      const managerSave = saveManagerDataRemoteChecked();
      const rosterSync = syncRosterMemberToWorker(type, item);
      const accessSync = syncAdminAccessForMember(type, item);
      state.adminWhitelist = null;

      Promise.allSettled([managerSave, rosterSync, accessSync]).then((results) => {
        const managerResult = results[0];
        if (managerResult.status === "rejected") {
          console.error("CRM member manager-data save failed", managerResult.reason);
          toast(managerResult.reason?.message || "會員資料背景儲存失敗，請再按一次儲存");
          return;
        }
        toast("會員資料已儲存");
      });
    };
'''
if old_submit in s:
    s = s.replace(old_submit, new_submit, 1)
elif 'toast("會員資料已更新，背景儲存中...")' not in s:
    raise SystemExit('member submit anchor not found')

p.write_text(s, encoding='utf-8', newline='')
