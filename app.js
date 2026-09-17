// ===== Calorie Lens — client-side food logger =====
const LS_KEYS = { targets: 'cl_targets', apikey: 'cl_apikey', model: 'cl_model', log: 'cl_log', activityLog: 'cl_activity_log' };
const DEFAULT_MODEL = 'inclusionai/ling-3.0-flash-vl:free';

function loadTargets(){ try{ return JSON.parse(localStorage.getItem(LS_KEYS.targets)) || {cal:2200, prot:150}; }catch(e){ return {cal:2200, prot:150}; } }
function saveTargets(t){ localStorage.setItem(LS_KEYS.targets, JSON.stringify(t)); }
function loadApiKey(){ return localStorage.getItem(LS_KEYS.apikey) || ''; }
function saveApiKey(k){ localStorage.setItem(LS_KEYS.apikey, k); }
function loadModel(){ return localStorage.getItem(LS_KEYS.model) || DEFAULT_MODEL; }
function saveModel(m){ localStorage.setItem(LS_KEYS.model, m); }
function loadLog(){ try{ return JSON.parse(localStorage.getItem(LS_KEYS.log)) || []; }catch(e){ return []; } }
function saveLog(l){ localStorage.setItem(LS_KEYS.log, JSON.stringify(l)); }
function loadActivityLog(){ try{ return JSON.parse(localStorage.getItem(LS_KEYS.activityLog)) || []; }catch(e){ return []; } }
function saveActivityLog(l){ localStorage.setItem(LS_KEYS.activityLog, JSON.stringify(l)); }

function todayStr(d){ d = d || new Date(); return d.toISOString().slice(0,10); }
function dayLabel(dateStr){ const d = new Date(dateStr+'T00:00:00'); return d.toLocaleDateString(undefined,{weekday:'short'}); }

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ t.style.display='none'; }, 2600);
}

// ---------- Rendering ----------
function render(){
  const targets = loadTargets();
  const log = loadLog();
  const today = todayStr();
  const todaysMeals = log.filter(m => m.date === today);

  const calSum = todaysMeals.reduce((s,m)=>s+m.total_calories,0);
  const protSum = todaysMeals.reduce((s,m)=>s+m.total_protein_g,0);

  document.getElementById('calText').textContent = `${Math.round(calSum)} / ${targets.cal} kcal`;
  document.getElementById('protText').textContent = `${Math.round(protSum)} / ${targets.prot} g`;
  const calPct = Math.min(100, (calSum/targets.cal)*100 || 0);
  const protPct = Math.min(100, (protSum/targets.prot)*100 || 0);
  const calBar = document.getElementById('calBar');
  calBar.querySelector('div').style.width = calPct+'%';
  calBar.classList.toggle('over', calSum > targets.cal);
  document.getElementById('protBar').querySelector('div').style.width = protPct+'%';

  document.getElementById('remainingCal').textContent = Math.max(0, Math.round(targets.cal - calSum));
  document.getElementById('mealsToday').textContent = todaysMeals.length;

  // meals list (today), most recent first
  const listEl = document.getElementById('mealsList');
  listEl.innerHTML = '';
  if(todaysMeals.length === 0){
    listEl.innerHTML = '<div class="empty">No meals logged today. Tap "Log a Meal" to take a photo.</div>';
  } else {
    [...todaysMeals].reverse().forEach(m=>{
      const div = document.createElement('div');
      div.className = 'meal';
      const itemNames = m.items.map(i=>i.name).join(', ');
      const imgTag = m.thumb
        ? `<img src="${m.thumb}" onerror="this.style.display='none'">`
        : `<div style="width:56px;height:56px;border-radius:10px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">✏️</div>`;
      div.innerHTML = `
        ${imgTag}
        <div class="info">
          <div class="name">${itemNames}</div>
          <div class="macros">P ${Math.round(m.total_protein_g)}g · C ${Math.round(m.total_carbs_g)}g · F ${Math.round(m.total_fat_g)}g</div>
        </div>
        <div class="cals">${Math.round(m.total_calories)}</div>
        <button class="del" data-id="${m.id}">✕</button>
      `;
      listEl.appendChild(div);
    });
    listEl.querySelectorAll('.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        const newLog = loadLog().filter(m=>m.id !== id);
        saveLog(newLog);
        render();
        toast('Meal removed');
      });
    });
  }

  // week bars: last 7 days
  const weekEl = document.getElementById('weekBars');
  weekEl.innerHTML = '';
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push(todayStr(d));
  }
  const maxCal = Math.max(targets.cal, ...days.map(ds => log.filter(m=>m.date===ds).reduce((s,m)=>s+m.total_calories,0)), 1);
  days.forEach(ds=>{
    const dayTotal = log.filter(m=>m.date===ds).reduce((s,m)=>s+m.total_calories,0);
    const pct = Math.max(2, (dayTotal / maxCal) * 100);
    const over = dayTotal > targets.cal;
    const colwrap = document.createElement('div');
    colwrap.className = 'colwrap';
    colwrap.innerHTML = `<div class="col ${over?'over':''}"><div style="height:${pct}%"></div></div><div class="lbl">${dayLabel(ds)}</div>`;
    weekEl.appendChild(colwrap);
  });

  document.getElementById('noKeyBanner').style.display = loadApiKey() ? 'none' : 'block';

  // activities
  const actLog = loadActivityLog();
  const todaysActivities = actLog.filter(a => a.date === today);
  const burnedSum = todaysActivities.reduce((s,a)=>s+(Number(a.calories_burned)||0),0);
  document.getElementById('burnedToday').textContent = Math.round(burnedSum);
  document.getElementById('activitiesToday').textContent = todaysActivities.length;

  const actListEl = document.getElementById('activitiesList');
  actListEl.innerHTML = '';
  if(todaysActivities.length === 0){
    actListEl.innerHTML = '<div class="empty">No activities logged today. Tap 🏃 to log a workout.</div>';
  } else {
    [...todaysActivities].reverse().forEach(a=>{
      const div = document.createElement('div');
      div.className = 'meal';
      div.innerHTML = `
        <div style="width:56px;height:56px;border-radius:10px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${activityEmoji(a.type)}</div>
        <div class="info">
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="macros">${a.duration_min ? a.duration_min+' min' : ''}</div>
        </div>
        <div class="cals" style="color:var(--green);">-${Math.round(a.calories_burned)}</div>
        <button class="del" data-id="${a.id}">✕</button>
      `;
      actListEl.appendChild(div);
    });
    actListEl.querySelectorAll('.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        const newLog = loadActivityLog().filter(a=>a.id !== id);
        saveActivityLog(newLog);
        render();
        toast('Activity removed');
      });
    });
  }
}

function activityEmoji(type){
  const t = (type||'').toLowerCase();
  if(t.includes('walk') || t.includes('treadmill') || t.includes('run')) return '🚶';
  if(t.includes('bike') || t.includes('cycl')) return '🚴';
  if(t.includes('swim')) return '🏊';
  if(t.includes('gym') || t.includes('weight') || t.includes('strength')) return '🏋️';
  if(t.includes('yoga')) return '🧘';
  return '🏃';
}

// ---------- Settings modal ----------
function openSettings(){
  const t = loadTargets();
  document.getElementById('targetCal').value = t.cal;
  document.getElementById('targetProt').value = t.prot;
  document.getElementById('apiKey').value = loadApiKey();
  document.getElementById('modelSelect').value = loadModel();
  document.getElementById('settingsModal').classList.add('show');
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsModal').addEventListener('click', (e)=>{ if(e.target.id==='settingsModal') e.target.classList.remove('show'); });

document.getElementById('saveSettings').addEventListener('click', ()=>{
  const cal = parseInt(document.getElementById('targetCal').value) || 2200;
  const prot = parseInt(document.getElementById('targetProt').value) || 150;
  saveTargets({cal, prot});
  saveApiKey(document.getElementById('apiKey').value.trim());
  saveModel(document.getElementById('modelSelect').value);
  document.getElementById('settingsModal').classList.remove('show');
  render();
  toast('Settings saved');
});

document.getElementById('clearData').addEventListener('click', ()=>{
  if(confirm('Delete all logged meals? This cannot be undone.')){
    saveLog([]);
    render();
    toast('All meal data cleared');
  }
});

// First run: open settings if no targets ever saved
if(!localStorage.getItem(LS_KEYS.targets)){
  setTimeout(openSettings, 300);
}

// ---------- Capture flow ----------
const cameraInput = document.getElementById('cameraInput');
const uploadInput = document.getElementById('uploadInput');
const actionSheet = document.getElementById('actionSheet');
const manualModal = document.getElementById('manualModal');

document.getElementById('addBtn').addEventListener('click', ()=>{
  if(!loadApiKey()){ openSettings(); toast('Add your API key first'); return; }
  actionSheet.classList.add('show');
});
document.getElementById('actionCancel').addEventListener('click', ()=> actionSheet.classList.remove('show'));
actionSheet.addEventListener('click', (e)=>{ if(e.target.id==='actionSheet') e.target.classList.remove('show'); });

document.getElementById('actionTakePhoto').addEventListener('click', ()=>{
  actionSheet.classList.remove('show');
  cameraInput.value = '';
  cameraInput.click();
});
document.getElementById('actionUploadPhoto').addEventListener('click', ()=>{
  actionSheet.classList.remove('show');
  uploadInput.value = '';
  uploadInput.click();
});
document.getElementById('actionManual').addEventListener('click', ()=>{
  actionSheet.classList.remove('show');
  document.getElementById('manualText').value = '';
  manualModal.classList.add('show');
  setTimeout(()=> document.getElementById('manualText').focus(), 100);
});
document.getElementById('manualCancel').addEventListener('click', ()=> manualModal.classList.remove('show'));
manualModal.addEventListener('click', (e)=>{ if(e.target.id==='manualModal') e.target.classList.remove('show'); });

document.getElementById('manualSubmit').addEventListener('click', async ()=>{
  const text = document.getElementById('manualText').value.trim();
  if(!text){ toast('Describe what you ate first'); return; }
  manualModal.classList.remove('show');
  showCaptureModal('loading', {dataUrl: null, manualText: text});
  try{
    const result = await analyzeFoodText(text);
    showCaptureModal('review', {dataUrl: null, result});
  }catch(err){
    showCaptureModal('error', {dataUrl: null, error: err.message || String(err), manualText: text});
  }
});

async function handlePhotoFile(file){
  const dataUrl = await fileToDataUrl(file);
  showCaptureModal('loading', {dataUrl});
  try{
    const result = await analyzeFood(dataUrl);
    showCaptureModal('review', {dataUrl, result});
  }catch(err){
    showCaptureModal('error', {dataUrl, error: err.message || String(err)});
  }
}
cameraInput.addEventListener('change', (e)=>{ const f=e.target.files[0]; if(f) handlePhotoFile(f); });
uploadInput.addEventListener('change', (e)=>{ const f=e.target.files[0]; if(f) handlePhotoFile(f); });

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale image client-side to keep payload small & fast
function fileToDataUrl_compressed(dataUrl, maxDim=900, quality=0.82){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.width, h = img.height;
      if(w > h && w > maxDim){ h = h*(maxDim/w); w = maxDim; }
      else if(h > maxDim){ w = w*(maxDim/h); h = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

const PROMPT = `Identify each distinct food item visible on the plate/bowl in this photo and estimate its portion size and nutrition. Respond ONLY with valid JSON, no markdown formatting, no code fences, no explanation — just the raw JSON object in exactly this schema:
{"items":[{"name":"string","estimated_grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number,"confidence":"low|medium|high"}
Make total_calories/total_protein_g/total_carbs_g/total_fat_g the sum of the items. Be realistic about portion sizes based on typical plate/bowl dimensions visible in the photo.`;

async function analyzeFood(dataUrl){
  const compressed = await fileToDataUrl_compressed(dataUrl);
  const apiKey = loadApiKey();
  const model = loadModel();
  const body = {
    model,
    messages: [{
      role: 'user',
      content: [
        {type:'text', text: PROMPT},
        {type:'image_url', image_url:{url: compressed}}
      ]
    }]
  };
  return callOpenRouter(body);
}

const TEXT_PROMPT = `The user is logging a meal they already ate, described in their own words (item names and quantities). Parse the description and estimate nutrition for each item. Respond ONLY with valid JSON, no markdown formatting, no code fences, no explanation — just the raw JSON object in exactly this schema:
{"items":[{"name":"string","estimated_grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number,"confidence":"low|medium|high"}
Make total_calories/total_protein_g/total_carbs_g/total_fat_g the sum of the items. If a quantity isn't given for an item, assume a typical single serving. User description: `;

async function analyzeFoodText(text){
  const apiKey = loadApiKey();
  const model = loadModel();
  const body = {
    model,
    messages: [{ role:'user', content: TEXT_PROMPT + text }]
  };
  return callOpenRouter(body);
}

async function callOpenRouter(body){
  const apiKey = loadApiKey();
  const FALLBACK_MODEL = 'inclusionai/ling-3.0-flash-vl:free';
  async function doCall(model){
    const b = {...body, model};
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':'application/json',
        'HTTP-Referer': location.origin,
        'X-Title':'Calorie Lens'
      },
      body: JSON.stringify(b)
    });
    if(!resp.ok){
      const errBody = await resp.text();
      let msg = `API error ${resp.status}`;
      let isRateLimit = resp.status === 429;
      try{
        const j = JSON.parse(errBody);
        if(j.error && j.error.message) msg = j.error.message;
        if(j.error && j.error.metadata && j.error.metadata.raw && /rate.?limit/i.test(j.error.metadata.raw)) isRateLimit = true;
      }catch(e){}
      const err = new Error(msg);
      err.isRateLimit = isRateLimit;
      throw err;
    }
    const data = await resp.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'');
    let parsed;
    try{ parsed = JSON.parse(content); }
    catch(e){
      const match = content.match(/\{[\s\S]*\}/);
      if(match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse model response as JSON');
    }
    return parsed;
  }

  try{
    return await doCall(body.model);
  }catch(err){
    // If the chosen free model is rate-limited/unavailable upstream, silently retry once with a known-reliable free model
    if(err.isRateLimit && body.model !== FALLBACK_MODEL){
      try{
        return await doCall(FALLBACK_MODEL);
      }catch(err2){
        throw new Error(`${err.message} (fallback also failed: ${err2.message})`);
      }
    }
    throw err;
  }
}

function showCaptureModal(state, data){
  const modalBg = document.getElementById('captureModal');
  const inner = document.getElementById('captureModalInner');
  modalBg.classList.add('show');

  const previewHtml = data.dataUrl
    ? `<img class="preview-img" src="${data.dataUrl}">`
    : `<div class="preview-img" style="display:flex;align-items:center;justify-content:center;background:var(--card2);font-size:14px;color:var(--muted);">✏️ ${data.manualText ? escapeHtml(data.manualText) : 'Manual entry'}</div>`;

  if(state === 'loading'){
    inner.innerHTML = `
      ${previewHtml}
      <div class="loading"><div class="spinner"></div><div>Analyzing${data.dataUrl ? ' your plate' : ' your meal'}…</div></div>
    `;
  } else if(state === 'error'){
    inner.innerHTML = `
      ${previewHtml}
      <h3>Couldn't analyze meal</h3>
      <p style="color:var(--muted);font-size:14px;">${escapeHtml(data.error)}</p>
      <div class="btn-row">
        <button class="btn ghost" id="closeCaptureBtn">Close</button>
        <button class="btn primary" id="retryCaptureBtn">↻ Retry</button>
      </div>
    `;
    document.getElementById('closeCaptureBtn').addEventListener('click', ()=> modalBg.classList.remove('show'));
    document.getElementById('retryCaptureBtn').addEventListener('click', async ()=>{
      if(data.manualText){
        showCaptureModal('loading', {dataUrl: null, manualText: data.manualText});
        try{
          const result = await analyzeFoodText(data.manualText);
          showCaptureModal('review', {dataUrl: null, result});
        }catch(err){
          showCaptureModal('error', {dataUrl: null, error: err.message || String(err), manualText: data.manualText});
        }
      } else if(data.dataUrl){
        showCaptureModal('loading', {dataUrl: data.dataUrl});
        try{
          const result = await analyzeFood(data.dataUrl);
          showCaptureModal('review', {dataUrl: data.dataUrl, result});
        }catch(err){
          showCaptureModal('error', {dataUrl: data.dataUrl, error: err.message || String(err)});
        }
      }
    });
  } else if(state === 'review'){
    const r = data.result;
    inner.innerHTML = `
      ${previewHtml}
      <h3>Confirm your meal</h3>
      <div id="itemsEditor"></div>
      <div class="totals-strip">
        <div><b id="tCal">0</b>kcal</div>
        <div><b id="tProt">0</b>protein</div>
        <div><b id="tCarb">0</b>carbs</div>
        <div><b id="tFat">0</b>fat</div>
      </div>
      <div class="btn-row">
        <button class="btn ghost" id="discardBtn">Discard</button>
        <button class="btn primary" id="confirmBtn">✓ Log this meal</button>
      </div>
    `;
    const itemsEditor = document.getElementById('itemsEditor');
    (r.items || []).forEach((item, idx)=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="iname">${escapeHtml(item.name)}</div>
        <input type="number" class="small" data-idx="${idx}" data-field="calories" value="${Math.round(item.calories)}">
      `;
      itemsEditor.appendChild(row);
    });
    function recalcTotals(){
      let cal=0, prot=0, carb=0, fat=0;
      (r.items||[]).forEach(i=>{ cal+=Number(i.calories)||0; prot+=Number(i.protein_g)||0; carb+=Number(i.carbs_g)||0; fat+=Number(i.fat_g)||0; });
      document.getElementById('tCal').textContent = Math.round(cal);
      document.getElementById('tProt').textContent = Math.round(prot)+'g';
      document.getElementById('tCarb').textContent = Math.round(carb)+'g';
      document.getElementById('tFat').textContent = Math.round(fat)+'g';
      r.total_calories = cal; r.total_protein_g = prot; r.total_carbs_g = carb; r.total_fat_g = fat;
    }
    itemsEditor.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const idx = inp.getAttribute('data-idx');
        r.items[idx].calories = Number(inp.value)||0;
        recalcTotals();
      });
    });
    recalcTotals();

    document.getElementById('discardBtn').addEventListener('click', ()=> modalBg.classList.remove('show'));
    document.getElementById('confirmBtn').addEventListener('click', ()=>{
      const log = loadLog();
      log.push({
        id: 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
        date: todayStr(),
        ts: Date.now(),
        thumb: data.dataUrl || '',
        items: r.items || [],
        total_calories: r.total_calories || 0,
        total_protein_g: r.total_protein_g || 0,
        total_carbs_g: r.total_carbs_g || 0,
        total_fat_g: r.total_fat_g || 0
      });
      saveLog(log);
      modalBg.classList.remove('show');
      render();
      toast('Meal logged ✓');
    });
  }
}
document.getElementById('captureModal').addEventListener('click', (e)=>{ if(e.target.id==='captureModal') e.target.classList.remove('show'); });

function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ---------- Activity logging flow ----------
const activityModal = document.getElementById('activityModal');
const activityReviewModal = document.getElementById('activityReviewModal');

document.getElementById('addActivityBtn').addEventListener('click', ()=>{
  if(!loadApiKey()){ openSettings(); toast('Add your API key first'); return; }
  document.getElementById('activityText').value = '';
  activityModal.classList.add('show');
  setTimeout(()=> document.getElementById('activityText').focus(), 100);
});
document.getElementById('activityCancel').addEventListener('click', ()=> activityModal.classList.remove('show'));
activityModal.addEventListener('click', (e)=>{ if(e.target.id==='activityModal') e.target.classList.remove('show'); });
activityReviewModal.addEventListener('click', (e)=>{ if(e.target.id==='activityReviewModal') e.target.classList.remove('show'); });

const ACTIVITY_PROMPT = `The user is logging physical activity/exercise they did, described in their own words. There may be multiple separate activities in one description. Parse each distinct activity and its duration and calories burned. If calories burned is stated by the user, use that number. If not stated, estimate realistically based on activity type and duration for an average adult. Respond ONLY with valid JSON, no markdown, no code fences, no explanation — just the raw JSON object in exactly this schema:
{"activities":[{"name":"string (short label, e.g. 'Treadmill walk')","type":"string (walking|running|gym|swimming|biking|yoga|other)","duration_min":number,"calories_burned":number}]}
User description: `;

async function analyzeActivityText(text){
  const model = loadModel();
  const body = { model, messages: [{ role:'user', content: ACTIVITY_PROMPT + text }] };
  return callOpenRouter(body);
}

document.getElementById('activitySubmit').addEventListener('click', async ()=>{
  const text = document.getElementById('activityText').value.trim();
  if(!text){ toast('Describe your activity first'); return; }
  activityModal.classList.remove('show');
  showActivityModal('loading', {text});
  try{
    const result = await analyzeActivityText(text);
    showActivityModal('review', {text, result});
  }catch(err){
    showActivityModal('error', {text, error: err.message || String(err)});
  }
});

function showActivityModal(state, data){
  activityReviewModal.classList.add('show');
  const inner = document.getElementById('activityReviewInner');

  if(state === 'loading'){
    inner.innerHTML = `
      <div style="background:var(--card2);border-radius:14px;padding:14px;margin-bottom:14px;font-size:14px;color:var(--muted);">🏃 ${escapeHtml(data.text)}</div>
      <div class="loading"><div class="spinner"></div><div>Analyzing your activity…</div></div>
    `;
  } else if(state === 'error'){
    inner.innerHTML = `
      <div style="background:var(--card2);border-radius:14px;padding:14px;margin-bottom:14px;font-size:14px;color:var(--muted);">🏃 ${escapeHtml(data.text)}</div>
      <h3>Couldn't analyze activity</h3>
      <p style="color:var(--muted);font-size:14px;">${escapeHtml(data.error)}</p>
      <div class="btn-row">
        <button class="btn ghost" id="actCloseBtn">Close</button>
        <button class="btn primary" id="actRetryBtn">↻ Retry</button>
      </div>
    `;
    document.getElementById('actCloseBtn').addEventListener('click', ()=> activityReviewModal.classList.remove('show'));
    document.getElementById('actRetryBtn').addEventListener('click', async ()=>{
      showActivityModal('loading', {text: data.text});
      try{
        const result = await analyzeActivityText(data.text);
        showActivityModal('review', {text: data.text, result});
      }catch(err){
        showActivityModal('error', {text: data.text, error: err.message || String(err)});
      }
    });
  } else if(state === 'review'){
    const r = data.result;
    const activities = r.activities || [];
    inner.innerHTML = `
      <h3>Confirm your activities</h3>
      <div id="activitiesEditor"></div>
      <div class="totals-strip">
        <div><b id="aTotalBurned">0</b>kcal burned</div>
      </div>
      <div class="btn-row">
        <button class="btn ghost" id="actDiscardBtn">Discard</button>
        <button class="btn primary" id="actConfirmBtn">✓ Log activities</button>
      </div>
    `;
    const editor = document.getElementById('activitiesEditor');
    activities.forEach((a, idx)=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="iname">${escapeHtml(a.name)} ${a.duration_min ? `(${a.duration_min}min)` : ''}</div>
        <input type="number" class="small" data-idx="${idx}" value="${Math.round(a.calories_burned)||0}">
      `;
      editor.appendChild(row);
    });
    function recalc(){
      let total = 0;
      activities.forEach(a=> total += Number(a.calories_burned)||0);
      document.getElementById('aTotalBurned').textContent = Math.round(total);
    }
    editor.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const idx = inp.getAttribute('data-idx');
        activities[idx].calories_burned = Number(inp.value)||0;
        recalc();
      });
    });
    recalc();

    document.getElementById('actDiscardBtn').addEventListener('click', ()=> activityReviewModal.classList.remove('show'));
    document.getElementById('actConfirmBtn').addEventListener('click', ()=>{
      const actLog = loadActivityLog();
      activities.forEach(a=>{
        actLog.push({
          id: 'a_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
          date: todayStr(),
          ts: Date.now(),
          name: a.name,
          type: a.type || 'other',
          duration_min: a.duration_min || 0,
          calories_burned: a.calories_burned || 0
        });
      });
      saveActivityLog(actLog);
      activityReviewModal.classList.remove('show');
      render();
      toast('Activity logged ✓');
    });
  }
}

// ---------- init ----------
render();
