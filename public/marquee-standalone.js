(() => {
  if (window.__tdeaMarqueeStandaloneInstalled) return;
  window.__tdeaMarqueeStandaloneInstalled = true;

  const params = new URLSearchParams(location.search);
  if (!params.has('marquee')) return;

  const app = document.querySelector('#app');
  if (!app) return;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const trim = (value) => String(value ?? '').trim();
  const adOnly = params.get('adOnly') === '1' || params.get('tdeaSource') === 'tdea-design';
  const LIFF_ID = '2005868456-cfANNVou';
  let uidPromise = null;

  function ensureStyle() {
    if (document.querySelector('#marquee-standalone-style')) return;
    const style = document.createElement('style');
    style.id = 'marquee-standalone-style';
    style.textContent = `body{margin:0;background:#f3f6f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;color:#101828}.mq-shell{max-width:840px;margin:0 auto;background:#fff;min-height:100vh}.mq-stage{width:100%;aspect-ratio:210/297;background:#fff;overflow:hidden;position:relative}.mq-track{display:flex;width:100%;height:100%;transition:transform .35s ease}.mq-slide{flex:0 0 100%;width:100%;height:100%;border:0;padding:0;background:#fff}.mq-slide img{width:100%;height:100%;object-fit:contain;display:block}.mq-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;gap:6px;justify-content:center}.mq-dot{width:8px;height:8px;border:0;border-radius:50%;background:#ffffffaa;padding:0}.mq-dot.active{background:#06c755}.mq-actions{display:grid;grid-template-columns:1fr;gap:12px;padding:14px}.mq-btn{border:1px solid #d0d5dd;background:#fff;border-radius:10px;padding:14px 18px;font-size:18px;font-weight:900}.mq-btn.primary{border-color:#54c665;background:#54c665;color:#fff}.mq-result{margin:0 14px 14px;padding:14px;border:1px solid #abefc6;background:#ecfdf3;border-radius:10px;color:#067647;line-height:1.6}.mq-error{margin:24px;padding:16px;border:1px solid #fecdca;background:#fff3f0;border-radius:10px;color:#b42318;font-weight:800}.mq-loading{margin:24px;padding:16px;border:1px solid #abefc6;background:#ecfdf3;border-radius:10px;color:#067647;font-weight:800}`;
    document.head.appendChild(style);
  }

  function renderLoading() { ensureStyle(); app.innerHTML = '<main class="mq-shell"><div class="mq-loading">載入廣告贈點...</div></main>'; }
  function renderError(message) { ensureStyle(); app.innerHTML = `<main class="mq-shell"><div class="mq-error">${esc(message || '載入失敗')}</div></main>`; }

  function itemsOf(config) {
    const rows = Array.isArray(config?.imageItems) ? config.imageItems : [];
    if (rows.length) return rows.map((item, i) => ({id:trim(item.id)||`image-${i+1}`,imageUrl:trim(item.imageUrl),linkUrl:trim(item.linkUrl),enabled:item.enabled!==false})).filter((item)=>item.imageUrl);
    return [...new Set([...(Array.isArray(config?.imageUrls)?config.imageUrls:[]),config?.imageUrl].map(trim).filter(Boolean))].map((imageUrl,i)=>({id:`legacy-${i+1}`,imageUrl,linkUrl:'',enabled:true}));
  }

  function loadLiffUid() {
    if (uidPromise) return uidPromise;
    uidPromise = new Promise((resolve) => {
      let done = false;
      const finish = (uid='') => { if (done) return; done = true; resolve(uid); };
      const timer = setTimeout(() => finish(''), 5000);
      const init = async () => {
        try {
          await window.liff.init({liffId:LIFF_ID});
          if (!window.liff.isLoggedIn()) {
            clearTimeout(timer);
            try { window.liff.login({redirectUri:location.href}); } catch {}
            return;
          }
          const profile = await window.liff.getProfile();
          clearTimeout(timer);
          finish(profile?.userId || '');
        } catch { clearTimeout(timer); finish(''); }
      };
      if (window.liff) return init();
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = init;
      script.onerror = () => { clearTimeout(timer); finish(''); };
      document.head.appendChild(script);
    });
    return uidPromise;
  }

  async function requireUid() {
    const uid = await loadLiffUid();
    if (!uid) throw new Error('請從 LINE 的「廣告贈點」入口開啟後再操作。');
    return uid;
  }

  function pointHtml(result) {
    const balance = result.balance ?? result.pointBalance ?? result.point_balance ?? '-';
    const rows = Array.isArray(result.logs)&&result.logs.length?result.logs:(Array.isArray(result.list)?result.list:[]);
    const list = rows.slice(0,5).map((row)=>`<li>${esc(row.reason||row.event_name||row.event_content||'點數異動')}｜${esc(row.amount??row.points??row.point??row.get_point??'')} 點</li>`).join('');
    return `<strong>目前點數餘額：${esc(balance)}</strong>${list?`<ul>${list}</ul>`:'<div>目前沒有明細。</div>'}`;
  }

  async function start() {
    renderLoading();
    const response = await fetch('/api/marquee', {cache:'no-store'});
    const result = await response.json().catch(()=>({}));
    if (!response.ok || !result.success) return renderError(result.message || '廣告贈點資料讀取失敗');
    const config = result.data || {};
    if (config.enabled === false) return renderError('廣告贈點尚未啟用。');
    const items = itemsOf(config);
    if (!items.length) return renderError('尚未設定廣告圖片。');

    const left = config.left || {};
    const right = config.right || {};
    const showCheckin = !adOnly && left.enabled !== false;
    const showPoints = right.enabled !== false;
    const actionButtons = [
      showCheckin ? `<button class="mq-btn" data-checkin>${esc(left.label || '系統簽到')}</button>` : '',
      showPoints ? `<button class="mq-btn primary" data-points>${esc(right.label || '查詢點數')}</button>` : '',
    ].filter(Boolean).join('');

    ensureStyle();
    app.innerHTML = `<main class="mq-shell"><section class="mq-stage"><div class="mq-track">${items.map((item)=>`<button type="button" class="mq-slide" data-id="${esc(item.id)}" data-link="${esc(item.linkUrl)}"><img src="${esc(item.imageUrl)}" alt=""></button>`).join('')}</div>${items.length>1?`<div class="mq-dots">${items.map((_,i)=>`<button type="button" class="mq-dot ${i===0?'active':''}" data-dot="${i}"></button>`).join('')}</div>`:''}</section>${actionButtons?`<div class="mq-actions">${actionButtons}</div>`:''}<div class="mq-result" data-result hidden></div></main>`;

    const track = app.querySelector('.mq-track');
    const dots = [...app.querySelectorAll('[data-dot]')];
    let index = 0;
    const go = (i) => { index=(i+items.length)%items.length; if(track) track.style.transform=`translateX(-${index*100}%)`; dots.forEach((d,n)=>d.classList.toggle('active',n===index)); };
    dots.forEach((d)=>d.addEventListener('click',()=>go(Number(d.dataset.dot||0))));
    if (items.length>1) setInterval(()=>{ if(document.visibilityState==='visible') go(index+1); },3500);

    app.querySelectorAll('.mq-slide').forEach((button)=>button.addEventListener('click', async()=>{
      const item = items.find((row)=>row.id===button.dataset.id) || {};
      try {
        const uid = await requireUid();
        const reward = await fetch('/api/marquee/reward',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lineUserId:uid,imageId:item.id||'',imageUrl:item.imageUrl||''})});
        const data = await reward.json().catch(()=>({}));
        if (!reward.ok || !data.success) throw new Error(data.message||'贈點失敗');
        const box=app.querySelector('[data-result]'); if(box){box.hidden=false;box.textContent=data.awarded?`已贈點 +${data.points||1}`:'今日已領取此圖片點數';}
        if (item.linkUrl) setTimeout(()=>{location.href=item.linkUrl;},500);
      } catch(error){ renderError(error?.message||'贈點失敗'); }
    }));

    const pointsBtn=app.querySelector('[data-points]');
    pointsBtn?.addEventListener('click', async()=>{
      const box=app.querySelector('[data-result]');
      if (box && !box.hidden) { box.hidden=true; box.innerHTML=''; pointsBtn.textContent=right.label || '查詢點數'; return; }
      try {
        pointsBtn.disabled=true; pointsBtn.textContent='查詢中...';
        const uid=await requireUid();
        const r=await fetch('/api/marquee/points',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lineUserId:uid})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok||!data.success) throw new Error(data.message||'點數查詢失敗');
        if(box){box.hidden=false;box.innerHTML=pointHtml(data);} pointsBtn.textContent='關閉點數';
      } catch(error){ if(box){box.hidden=false;box.textContent=error?.message||'點數查詢失敗';} pointsBtn.textContent=right.label || '查詢點數'; }
      finally { pointsBtn.disabled=false; }
    });
  }

  window.__tdeaMarqueeStandaloneStart = start;
})();
