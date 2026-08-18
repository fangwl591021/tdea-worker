(() => {
  const rawFetch = window.fetch.bind(window);
  let ocrText = '';
  let ruleText = '';
  let finalPayload = null;
  let busy = false;

  function storedValue(...keys){ for(const key of keys){ const v=sessionStorage.getItem(key)||localStorage.getItem(key)||''; if(String(v).trim()) return String(v).trim(); } return ''; }
  function adminHeaders(extra={}){ const h={...extra}; const email=storedValue('tdea-admin-email'); const memberNo=storedValue('tdea-admin-member-no','tdea-member-no'); const lineUserId=storedValue('tdea-admin-line-user-id','tdea-line-user-id','lineUserId'); if(email)h['x-admin-email']=email;if(memberNo)h['x-admin-member-no']=memberNo;if(lineUserId)h['x-line-user-id']=lineUserId;return h; }
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
  function posterDataUrl(){ return document.querySelector('.smart-preview-poster img')?.src || ''; }
  function userNote(){ return document.querySelector('[data-smart-text]')?.value?.trim() || ''; }
  function setStatus(msg,isError=false){ const n=document.querySelector('[data-smart-stage-status]'); if(n){ n.textContent=msg; n.style.color=isError?'#b42318':'#475467'; } }

  function inject(){
    const panel=document.querySelector('[data-smart-activity-root] .smart-builder-panel'); if(!panel || panel.querySelector('[data-smart-staged-workflow]')) return;
    const sections=[...panel.querySelectorAll('.smart-builder-section')];
    const upload=sections.find(s=>s.textContent?.includes('上傳活動海報'));
    const textSection=sections.find(s=>s.querySelector('[data-smart-text]'));
    const oldAi=panel.querySelector('.smart-ai-section');
    if(!upload||!textSection||!oldAi) return;

    const textLabel=textSection.querySelector('.smart-builder-label'); if(textLabel) textLabel.textContent='5. 與 AI 溝通修正';
    const hint=textSection.querySelector('.smart-builder-count span:first-child'); if(hint) hint.textContent='像跟顧問說明一樣補充或修正規則；不會重新讀圖片。';
    const ta=textSection.querySelector('[data-smart-text]'); if(ta) ta.setAttribute('placeholder','例如：一個人可能報2桿或3桿，桿數與人數要分開；只餐敘600元/人；比賽者餐費500元/人。');

    const box=document.createElement('div');
    box.dataset.smartStagedWorkflow='1';
    box.className='smart-builder-section';
    box.innerHTML=`
      <label class="smart-builder-label">3. 圖片轉文字</label>
      <button type="button" data-smart-ocr-only class="smart-ai-button" style="background:#2563eb">先辨識海報文字</button>
      <textarea data-smart-ocr-output readonly placeholder="按下後先顯示海報 OCR 文字" style="width:100%;min-height:170px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:12px;line-height:1.6"></textarea>
      <label class="smart-builder-label" style="margin-top:4px">4. AI 規則解析</label>
      <button type="button" data-smart-rule-analyze class="smart-ai-button" style="background:#7c3aed">解析報名規則</button>
      <textarea data-smart-rule-output readonly placeholder="這裡會先整理計價、數量、限制與待確認事項；還不產生欄位" style="width:100%;min-height:210px;box-sizing:border-box;border:1px solid #c4b5fd;border-radius:12px;background:#faf5ff;padding:12px;line-height:1.6"></textarea>
      <button type="button" data-smart-rule-refine class="smart-ai-button" style="background:#475467">用上方說明更新規則</button>
      <div data-smart-stage-status style="font-size:12px;color:#475467">先 OCR，再解析規則；確認後才產生欄位。</div>`;
    upload.insertAdjacentElement('afterend',box);

    oldAi.style.display='none';
    const final=document.createElement('div'); final.className='smart-builder-section'; final.dataset.smartFinalSection='1';
    final.innerHTML=`<label class="smart-builder-label">6. 確認後產生報名欄位</label><button type="button" data-smart-finalize class="smart-ai-button">產生報名欄位</button><p style="margin:0;color:#667085;font-size:11px;text-align:center">只使用已辨識文字＋已確認規則，不會再重算圖片。</p>`;
    oldAi.insertAdjacentElement('afterend',final);

    box.querySelector('[data-smart-ocr-only]').onclick=runOcr;
    box.querySelector('[data-smart-rule-analyze]').onclick=runRules;
    box.querySelector('[data-smart-rule-refine]').onclick=refineRules;
    final.querySelector('[data-smart-finalize]').onclick=finalizeFields;
  }

  async function runOcr(){
    if(busy)return; const poster=posterDataUrl(); if(!poster){setStatus('請先上傳活動海報',true);return;}
    busy=true;setStatus('正在辨識圖片文字…');
    try{
      const r=await rawFetch('/api/smart-activities/ocr',{method:'POST',headers:adminHeaders({'content-type':'application/json'}),body:JSON.stringify({posterDataUrl:poster})});
      const j=await r.json().catch(()=>({})); if(!r.ok||!j.success)throw new Error(j.message||`OCR HTTP ${r.status}`);
      ocrText=String(j.ocrText||''); ruleText='';
      const o=document.querySelector('[data-smart-ocr-output]'); if(o)o.value=ocrText;
      const q=document.querySelector('[data-smart-rule-output]'); if(q)q.value='';
      setStatus('文字辨識完成。下一步按「解析報名規則」。');
    }catch(e){setStatus(e?.message||'OCR 失敗',true);}finally{busy=false;}
  }

  async function runRules(){
    if(busy)return; if(!ocrText){setStatus('請先完成圖片轉文字',true);return;}
    busy=true;setStatus('正在解析計價與報名規則…');
    try{
      const r=await rawFetch('/api/smart-activities/rules',{method:'POST',headers:adminHeaders({'content-type':'application/json'}),body:JSON.stringify({ocrText,note:userNote()})});
      const j=await r.json().catch(()=>({})); if(!r.ok||!j.success)throw new Error(j.message||`規則解析 HTTP ${r.status}`);
      ruleText=String(j.ruleText||''); const q=document.querySelector('[data-smart-rule-output]'); if(q)q.value=ruleText;
      setStatus('規則解析完成。可在「與 AI 溝通修正」補充，再按更新規則。');
    }catch(e){setStatus(e?.message||'規則解析失敗',true);}finally{busy=false;}
  }

  async function refineRules(){
    if(busy)return; const msg=userNote(); if(!ocrText||!ruleText){setStatus('請先完成 OCR 與規則解析',true);return;} if(!msg){setStatus('請先在「與 AI 溝通修正」輸入要修正的內容',true);return;}
    busy=true;setStatus('AI 正在依你的說明修正規則…');
    try{
      const r=await rawFetch('/api/smart-activities/rules/refine',{method:'POST',headers:adminHeaders({'content-type':'application/json'}),body:JSON.stringify({ocrText,currentRules:ruleText,message:msg})});
      const j=await r.json().catch(()=>({})); if(!r.ok||!j.success)throw new Error(j.message||`規則修正 HTTP ${r.status}`);
      ruleText=String(j.ruleText||''); const q=document.querySelector('[data-smart-rule-output]'); if(q)q.value=ruleText;
      setStatus('規則已更新。若確認無誤，就按「產生報名欄位」。');
    }catch(e){setStatus(e?.message||'規則修正失敗',true);}finally{busy=false;}
  }

  function finalizeFields(){
    if(!ocrText||!ruleText){setStatus('請先完成 OCR 與規則確認',true);return;}
    finalPayload=`【海報OCR原文】\n${ocrText}\n\n【已確認報名規則】\n${ruleText}\n\n【管理者補充】\n${userNote()}`;
    setStatus('正在依確認規則產生欄位…');
    const btn=document.querySelector('[data-smart-generate]'); if(btn)btn.click(); else setStatus('找不到原始生成器',true);
  }

  window.fetch=async(resource,options={})=>{
    const url=typeof resource==='string'?resource:resource?.url||'';
    if(finalPayload && url.includes('/api/smart-activities/analyze') && String(options?.method||'GET').toUpperCase()==='POST' && typeof options.body==='string'){
      let payload={}; try{payload=JSON.parse(options.body)}catch(_){}
      payload.posterDataUrl=''; payload.text=finalPayload; finalPayload=null;
      const response=await rawFetch(resource,{...options,body:JSON.stringify(payload)});
      if(response.ok)setStatus('報名欄位已生成；如規則還要調整，可繼續修改後再產生。');
      else setStatus('欄位生成失敗，請查看錯誤訊息。',true);
      return response;
    }
    return rawFetch(resource,options);
  };

  const observer=new MutationObserver(()=>inject()); observer.observe(document.documentElement,{childList:true,subtree:true}); inject();
})();
