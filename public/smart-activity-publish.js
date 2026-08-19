(() => {
  let latestAnalysis = null;
  let lastResult = null;
  let saving = false;

  const storedValue=(...keys)=>{for(const key of keys){const value=sessionStorage.getItem(key)||localStorage.getItem(key)||"";if(String(value).trim())return String(value).trim();}return "";};
  const adminHeaders=(extra={})=>{const h={...extra};const email=storedValue("tdea-admin-email");const memberNo=storedValue("tdea-admin-member-no","tdea-member-no");const uid=storedValue("tdea-admin-line-user-id","tdea-line-user-id","lineUserId");if(email)h["x-admin-email"]=email;if(memberNo)h["x-admin-member-no"]=memberNo;if(uid)h["x-line-user-id"]=uid;return h;};
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));

  function smartHost(){
    const staged=document.querySelector("[data-smart-final-section]") || document.querySelector("[data-smart-finalize]")?.closest(".smart-builder-section");
    if(staged) return staged;
    const ai=document.querySelector(".smart-ai-section");
    if(ai && getComputedStyle(ai).display!=="none") return ai;
    const generate=document.querySelector("[data-smart-generate]");
    return generate?.closest(".smart-builder-section") || generate?.parentElement || null;
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=async(resource,options={})=>{
    const response=await originalFetch(resource,options);
    try{
      const url=typeof resource==="string"?resource:resource?.url||"";
      if(url.includes("/api/smart-activities/analyze")&&String(options?.method||"GET").toUpperCase()==="POST"){
        const data=await response.clone().json();
        if(data?.success&&data?.data){latestAnalysis=data.data;queueMicrotask(ensureControls);}
      }
    }catch(_){ }
    return response;
  };

  function currentPayload(mode){
    const textarea=document.querySelector("[data-smart-text]");
    const poster=document.querySelector(".smart-preview-poster img");
    return {mode,analysis:latestAnalysis,text:String(textarea?.value||"").trim(),posterDataUrl:poster?.src?.startsWith("data:image/")?poster.src:"",activityId:lastResult?.activityId||undefined,formId:lastResult?.formId||undefined,activityNo:lastResult?.activityNo||undefined};
  }

  function statusBox(){
    let box=document.querySelector("[data-smart-publish-status]");
    if(box && smartHost()?.contains(box)) return box;
    if(box) box.remove();
    const host=smartHost();if(!host)return null;
    box=document.createElement("div");box.dataset.smartPublishStatus="";box.style.marginTop="10px";host.appendChild(box);return box;
  }
  function showStatus(message,type="ok"){
    const box=statusBox();if(!box)return;
    box.innerHTML=`<div style="padding:10px 12px;border-radius:10px;font-weight:800;${type==='error'?'background:#fff3f0;color:#b42318;border:1px solid #fecdca':'background:#ecfdf3;color:#067647;border:1px solid #abefc6'}">${esc(message)}</div>`;
  }

  async function save(mode){
    if(saving)return;
    if(!latestAnalysis){showStatus("請先按『產生報名欄位』，完成後才能儲存或上架。","error");return;}
    if(!String(latestAnalysis.title||"").trim()){showStatus("活動名稱尚未完成，請重新產生報名欄位。","error");return;}
    saving=true;ensureControls();showStatus(mode==="draft"?"正在儲存草稿…":"正在建立正式活動與報名表…");
    try{
      const response=await originalFetch("/api/smart-activities/publish",{method:"POST",headers:adminHeaders({"content-type":"application/json"}),body:JSON.stringify(currentPayload(mode))});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.success)throw new Error(result.message||"儲存失敗");
      lastResult=result;
      if(mode==="draft"){
        showStatus(`草稿已儲存：${result.activityNo||result.activityId}`);
      }else{
        const box=statusBox();
        box.innerHTML=`<div style="padding:12px;border-radius:10px;background:#ecfdf3;color:#067647;border:1px solid #abefc6"><b>上架成功</b><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><a href="${esc(result.registrationUrl)}" target="_blank" style="display:inline-block;padding:8px 12px;border-radius:8px;background:#067647;color:white;text-decoration:none;font-weight:800">前台預覽</a><button type="button" data-copy-smart-link style="padding:8px 12px;border:1px solid #abefc6;border-radius:8px;background:white;color:#067647;font-weight:800;cursor:pointer">複製報名連結</button></div><div style="margin-top:8px;word-break:break-all;font-size:12px">${esc(result.registrationUrl)}</div></div>`;
        box.querySelector("[data-copy-smart-link]")?.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(result.registrationUrl);showStatus("報名連結已複製");}catch(_){showStatus("無法自動複製，請手動複製網址。","error");}});
      }
    }catch(error){showStatus(error instanceof Error?error.message:String(error),"error");}
    finally{saving=false;ensureControls();}
  }

  function ensureControls(){
    const host=smartHost();if(!host)return;
    document.querySelectorAll("[data-smart-publish-actions]").forEach(node=>{if(!host.contains(node))node.remove();});
    document.querySelectorAll("[data-smart-publish-note]").forEach(node=>{if(!host.contains(node))node.remove();});
    let row=host.querySelector("[data-smart-publish-actions]");
    if(!row){
      row=document.createElement("div");row.dataset.smartPublishActions="";row.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px";
      row.innerHTML=`<button type="button" data-smart-save-draft style="border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer">儲存草稿</button><button type="button" data-smart-publish style="border:0;background:#067647;color:#fff;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer">確認並上架</button>`;
      host.appendChild(row);
      row.querySelector("[data-smart-save-draft]")?.addEventListener("click",()=>save("draft"));
      row.querySelector("[data-smart-publish]")?.addEventListener("click",()=>save("published"));
    }
    row.querySelectorAll("button").forEach(button=>{button.disabled=saving||!latestAnalysis;button.style.opacity=button.disabled?".55":"1";});
    if(!host.querySelector("[data-smart-publish-note]")){
      const p=document.createElement("p");p.dataset.smartPublishNote="";p.style.cssText="margin:8px 0 0;color:#667085;font-size:11px;text-align:center";p.textContent="先完成「產生報名欄位」；完成後可儲存草稿或確認並上架。";row.insertAdjacentElement("afterend",p);
    }
  }

  new MutationObserver(ensureControls).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(ensureControls,1000);
  ensureControls();
})();
