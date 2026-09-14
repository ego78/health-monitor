const S={PRESSURE:[],WEIGHT:[],LABS:[],DIETS:[],MEDS:[],EVENTS:[]};
const charts={};
const cfg=()=>({url:localStorage.getItem('hm_api_url')||'',token:localStorage.getItem('hm_api_token')||''});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toISOString().slice(0,10);
const nowLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const n=v=>v===''||v==null?null:Number(v);
const avg=a=>a.length?a.reduce((x,y)=>x+Number(y||0),0)/a.length:null;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const tabMeta={
  dashboard:['Dashboard','Panoramica dei tuoi dati di salute'],
  pressure:['Pressione','Misurazioni e andamento pressorio'],
  weight:['Peso corporeo','Peso e circonferenza vita'],
  labs:['Analisi','Valori di laboratorio nel tempo'],
  diets:['Diete','Periodi alimentari e variazioni'],
  meds:['Farmaci / integratori','Terapie e integrazione'],
  compare:['Confronta','Relazioni temporali tra i tuoi dati'],
  data:['Gestione dati','Sincronizzazione ed esportazione']
};
function applyTheme(mode){
  const dark=mode==='dark';document.body.classList.toggle('dark',dark);localStorage.setItem('hm_theme',mode);
  const b=$('#themeBtn');if(b)b.textContent=dark?'☀':'☾';
  if(window.Chart){Chart.defaults.color=dark?'#a9bad1':'#66758f';Chart.defaults.borderColor=dark?'rgba(145,164,192,.18)':'rgba(100,116,139,.14)'}
  if(Object.values(S).some(a=>a.length))renderAll();
}
function openTab(tab){
  $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  $$('.view').forEach(x=>x.classList.toggle('active',x.id===tab));
  const meta=tabMeta[tab]||[tab,''];if($('#pageTitle'))$('#pageTitle').textContent=meta[0];if($('#pageSubtitle'))$('#pageSubtitle').textContent=meta[1];
  window.scrollTo({top:0,behavior:'smooth'});if(tab==='compare')renderCompare();
}


async function apiGet(action='bootstrap',params={}){const c=cfg();if(!c.url||!c.token)throw new Error('Configurazione API mancante');const u=new URL(c.url);u.searchParams.set('action',action);u.searchParams.set('token',c.token);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u.toString(),{redirect:'follow'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Errore API');return j}
async function apiPost(body){const c=cfg();if(!c.url||!c.token)throw new Error('Configurazione API mancante');const formBody=new URLSearchParams();formBody.set('payload',JSON.stringify({...body,token:c.token}));const r=await fetch(c.url,{method:'POST',body:formBody,redirect:'follow'});if(!r.ok)throw new Error('Errore di collegamento API ('+r.status+')');let j;try{j=await r.json()}catch(_){throw new Error('Risposta non valida da Apps Script')};if(!j.ok)throw new Error(j.error||'Errore API');return j}

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function dateFmt(v){if(!v)return '—';const d=new Date(String(v).length===10?v+'T12:00:00':v);return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})}
function dtFmt(v){if(!v)return '—';return new Date(v).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function destroyChart(k){if(charts[k])charts[k].destroy()}
function chart(k,el,config){destroyChart(k);charts[k]=new Chart($(el),config)}

async function refresh(){try{const j=await apiGet();Object.keys(S).forEach(k=>S[k]=j.data[k]||[]);renderAll();$('#setupBanner').classList.add('hidden');toast('Dati sincronizzati')}catch(e){$('#setupBanner').classList.remove('hidden');console.error(e);toast(e.message)}}

function renderAll(){renderDashboard();renderPressure();renderWeight();renderLabs();renderDiets();renderMeds();renderCompareSelectors();}
function renderDashboard(){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);const p7=S.PRESSURE.filter(x=>new Date(x.datetime)>=cutoff);const sy=avg(p7.map(x=>x.systolic)),di=avg(p7.map(x=>x.diastolic)),pu=avg(p7.map(x=>x.pulse).filter(Boolean));$('#bp7').textContent=sy?`${Math.round(sy)}/${Math.round(di)} mmHg`:'—';$('#bp7pulse').textContent=pu?`${Math.round(pu)} bpm`:'Nessun dato';const ws=[...S.WEIGHT].sort((a,b)=>String(a.date).localeCompare(String(b.date)));const lw=ws.at(-1);$('#lastWeight').textContent=lw?`${Number(lw.weightKg).toFixed(1)} kg`:'—';$('#weightChange').textContent=ws.length>1?`${(Number(lw.weightKg)-Number(ws[0].weightKg)).toFixed(1)} kg dal primo dato`:'—';const c30=new Date();c30.setDate(c30.getDate()-30);$('#count30').textContent=S.PRESSURE.filter(x=>new Date(x.datetime)>=c30).length;const active=S.DIETS.filter(d=>d.startDate<=today()&&(!d.endDate||d.endDate>=today())).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)))[0];$('#currentDiet').textContent=active?.name||'Nessuno';$('#dietSince').textContent=active?`dal ${dateFmt(active.startDate)}`:'—';renderTrend();renderRecent()}
function renderTrend(){const days=Number($('#dashboardRange').value||30);const cut=new Date();cut.setDate(cut.getDate()-days);const p=S.PRESSURE.filter(x=>new Date(x.datetime)>=cut).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));const panel=$('#trendChart')?.closest('.chart-panel');panel?.classList.toggle('is-empty',!p.length);panel?.querySelector('.chart-empty')?.remove();if(!p.length){destroyChart('trend');const box=panel?.querySelector('.chart-box');if(box){const e=document.createElement('div');e.className='chart-empty';e.innerHTML='<strong>Nessuna misurazione nel periodo</strong><br>Inserisci la prima pressione per vedere il grafico.';box.appendChild(e)}return}chart('trend','#trendChart',{type:'line',data:{labels:p.map(x=>dtFmt(x.datetime)),datasets:[{label:'Sistolica',data:p.map(x=>n(x.systolic)),tension:.25},{label:'Diastolica',data:p.map(x=>n(x.diastolic)),tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}}})}
function renderRecent(){const items=[...S.PRESSURE.map(x=>({d:x.datetime,t:'Pressione',v:`${x.systolic}/${x.diastolic} mmHg`})),...S.WEIGHT.map(x=>({d:x.date,t:'Peso',v:`${x.weightKg} kg`})),...S.LABS.map(x=>({d:x.date,t:x.parameter,v:`${x.value} ${x.unit||''}`}))].sort((a,b)=>new Date(b.d)-new Date(a.d)).slice(0,8);$('#recentList').innerHTML=items.length?items.map(x=>`<div class="listRow"><span><strong>${esc(x.t)}</strong><small class="muted"> ${dateFmt(x.d)}</small></span><span>${esc(x.v)}</span></div>`).join(''):'<p class="muted">Nessun dato inserito.</p>'}
function renderPressure(){const p=[...S.PRESSURE].sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));chart('pressure','#pressureChart',{type:'line',data:{labels:p.map(x=>dtFmt(x.datetime)),datasets:[{label:'Sistolica',data:p.map(x=>n(x.systolic)),tension:.2},{label:'Diastolica',data:p.map(x=>n(x.diastolic)),tension:.2},{label:'Battiti',data:p.map(x=>n(x.pulse)),tension:.2,hidden:true}]},options:{responsive:true,maintainAspectRatio:false}});table('#pressureTable',p.slice().reverse(),[{k:'datetime',h:'Data/ora',f:dtFmt},{k:'systolic',h:'SYS'},{k:'diastolic',h:'DIA'},{k:'pulse',h:'BPM'},{k:'context',h:'Contesto'},{k:'notes',h:'Note'}],'PRESSURE')}
function renderWeight(){const w=[...S.WEIGHT].sort((a,b)=>String(a.date).localeCompare(String(b.date)));chart('weight','#weightChart',{type:'line',data:{labels:w.map(x=>dateFmt(x.date)),datasets:[{label:'Peso kg',data:w.map(x=>n(x.weightKg)),tension:.25}]},options:{responsive:true,maintainAspectRatio:false}});table('#weightTable',w.slice().reverse(),[{k:'date',h:'Data',f:dateFmt},{k:'weightKg',h:'Kg'},{k:'waistCm',h:'Vita cm'},{k:'notes',h:'Note'}],'WEIGHT')}
function labNames(){return [...new Set(S.LABS.map(x=>x.parameter).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function renderLabs(){const names=labNames();const sel=$('#labParameter'),current=sel.value;sel.innerHTML='<option value="">Tutti i parametri</option>'+names.map(x=>`<option>${esc(x)}</option>`).join('');if(names.includes(current))sel.value=current;const q=$('#labSearch').value.toLowerCase();let rows=S.LABS.filter(x=>(!sel.value||x.parameter===sel.value)&&(!q||String(x.parameter).toLowerCase().includes(q))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));table('#labTable',rows,[{k:'date',h:'Data',f:dateFmt},{k:'parameter',h:'Parametro'},{k:'value',h:'Valore'},{k:'unit',h:'Unità'},{k:'refMin',h:'Min'},{k:'refMax',h:'Max'},{k:'notes',h:'Note'}],'LABS');const target=sel.value||names[0];const lr=S.LABS.filter(x=>x.parameter===target).sort((a,b)=>String(a.date).localeCompare(String(b.date)));chart('lab','#labChart',{type:'line',data:{labels:lr.map(x=>dateFmt(x.date)),datasets:[{label:target||'Analisi',data:lr.map(x=>n(x.value)),tension:.25}]},options:{responsive:true,maintainAspectRatio:false}})}
function renderDiets(){const d=[...S.DIETS].sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)));$('#dietCards').innerHTML=d.length?d.map(x=>`<article class="timelineCard"><header><div><span class="badge">${x.endDate?'Concluso':'In corso'}</span><h3>${esc(x.name)}</h3></div>${actions(x.id,'DIETS')}</header><p>${dateFmt(x.startDate)} → ${x.endDate?dateFmt(x.endDate):'oggi'}</p><p class="muted">${x.kcal?esc(x.kcal)+' kcal/giorno · ':''}${x.carbsG?esc(x.carbsG)+' g carbo · ':''}${x.proteinG?esc(x.proteinG)+' g proteine · ':''}${x.fatG?esc(x.fatG)+' g grassi · ':''}${x.weightStart?esc(x.weightStart)+' kg iniziali':''}</p>${x.notes?`<p>${esc(x.notes)}</p>`:''}</article>`).join(''):'<p class="muted">Nessun periodo inserito.</p>'}
function renderMeds(){const type=$('#medTypeFilter').value,act=$('#medActiveFilter').value;const rows=S.MEDS.filter(x=>(!type||x.type===type)&&(act===''||String(x.active)===act)).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)));$('#medCards').innerHTML=rows.length?rows.map(x=>`<article class="timelineCard"><header><div><span class="badge">${esc(x.type)}</span><h3>${esc(x.name)}</h3></div>${actions(x.id,'MEDS')}</header><p><strong>${esc([x.dose,x.unit].filter(Boolean).join(' '))}</strong> ${esc(x.frequency||'')} ${x.timeOfDay?'· '+esc(x.timeOfDay):''}</p><p class="muted">${dateFmt(x.startDate)} → ${x.endDate?dateFmt(x.endDate):'in corso'}</p>${x.notes?`<p>${esc(x.notes)}</p>`:''}</article>`).join(''):'<p class="muted">Nessun elemento.</p>'}
function renderCompareSelectors(){const names=labNames();const s=$('#cmpLab'),v=s.value;s.innerHTML='<option value="">Nessuna</option>'+names.map(x=>`<option>${esc(x)}</option>`).join('');if(names.includes(v))s.value=v;if(!$('#cmpFrom').value){const d=new Date();d.setDate(d.getDate()-90);$('#cmpFrom').value=d.toISOString().slice(0,10);$('#cmpTo').value=today()}renderCompare()}
function renderCompare(){const from=$('#cmpFrom').value||'0000-01-01',to=$('#cmpTo').value||'9999-12-31';const p=S.PRESSURE.filter(x=>x.datetime.slice(0,10)>=from&&x.datetime.slice(0,10)<=to).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));const w=S.WEIGHT.filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>String(a.date).localeCompare(String(b.date)));$('#cmpSys').textContent=p.length?Math.round(avg(p.map(x=>x.systolic)))+' mmHg':'—';$('#cmpDia').textContent=p.length?Math.round(avg(p.map(x=>x.diastolic)))+' mmHg':'—';$('#cmpN').textContent=p.length;$('#cmpW').textContent=w.length>1?(Number(w.at(-1).weightKg)-Number(w[0].weightKg)).toFixed(1)+' kg':'—';const lab=$('#cmpLab').value;const l=S.LABS.filter(x=>x.parameter===lab&&x.date>=from&&x.date<=to).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const labels=[...new Set([...p.map(x=>x.datetime.slice(0,10)),...w.map(x=>x.date),...l.map(x=>x.date)])].sort();const byDate=(arr,date,key,dateKey)=>{const z=arr.filter(x=>String(x[dateKey]).slice(0,10)===date);return z.length?avg(z.map(x=>x[key])):null};const sets=[];if($('#cmpBP').checked){sets.push({label:'Sistolica',data:labels.map(d=>byDate(p,d,'systolic','datetime')),spanGaps:true});sets.push({label:'Diastolica',data:labels.map(d=>byDate(p,d,'diastolic','datetime')),spanGaps:true})}if($('#cmpWeight').checked)sets.push({label:'Peso kg',data:labels.map(d=>byDate(w,d,'weightKg','date')),spanGaps:true,yAxisID:'y1'});if(lab)sets.push({label:lab,data:labels.map(d=>byDate(l,d,'value','date')),spanGaps:true,yAxisID:'y1'});chart('compare','#compareChart',{type:'line',data:{labels:labels.map(dateFmt),datasets:sets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{y:{position:'left'},y1:{position:'right',grid:{drawOnChartArea:false}}}}});const periods=[...S.DIETS.map(x=>({type:'Dieta',name:x.name,start:x.startDate,end:x.endDate||today()})),...S.MEDS.map(x=>({type:x.type,name:x.name,start:x.startDate,end:x.endDate||today()}))].filter(x=>x.start<=to&&x.end>=from).sort((a,b)=>String(a.start).localeCompare(String(b.start)));$('#overlapTimeline').innerHTML=periods.length?periods.map(x=>`<div class="listRow"><span><span class="badge">${esc(x.type)}</span> <strong>${esc(x.name)}</strong></span><span>${dateFmt(x.start)} → ${dateFmt(x.end)}</span></div>`).join(''):'<p class="muted">Nessun periodo sovrapposto.</p>'}
function actions(id,entity){return `<span class="rowActions"><button onclick="editRecord('${entity}','${id}')">✏️</button><button class="danger" onclick="deleteRecord('${entity}','${id}')">🗑️</button></span>`}
function table(target,rows,cols,entity){$(target).innerHTML=rows.length?`<table><thead><tr>${cols.map(c=>`<th>${c.h}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(c.f?c.f(r[c.k]):r[c.k])}</td>`).join('')}<td>${actions(r.id,entity)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">Nessun dato.</p>'}

window.deleteRecord=async(entity,id)=>{if(!confirm('Eliminare questo record?'))return;try{await apiPost({action:'delete',entity,id});S[entity]=S[entity].filter(x=>x.id!==id);renderAll();toast('Eliminato')}catch(e){toast(e.message)}};
window.editRecord=(entity,id)=>{const rec=S[entity].find(x=>x.id===id);const modalId={PRESSURE:'pressureModal',WEIGHT:'weightModal',LABS:'labModal',DIETS:'dietModal',MEDS:'medModal'}[entity];const dlg=$('#'+modalId),form=dlg.querySelector('form');Object.entries(rec||{}).forEach(([k,v])=>{const el=form.elements[k];if(!el)return;if(el.type==='checkbox')el.checked=String(v)==='true'||v===true;else if(el.type==='datetime-local')el.value=String(v).slice(0,16);else el.value=v??''});dlg.showModal()};

$$('[data-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
$$('[data-modal]').forEach(b=>b.onclick=()=>{const d=$('#'+b.dataset.modal),f=d.querySelector('form');if(f){f.reset();if(f.elements.id)f.elements.id.value='';if(f.elements.datetime)f.elements.datetime.value=nowLocal();if(f.elements.date)f.elements.date.value=today();if(f.elements.startDate)f.elements.startDate.value=today();if(f.elements.active)f.elements.active.checked=true}d.showModal()});
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#settingsBtn').onclick=()=>{$('#apiUrl').value=cfg().url;$('#apiToken').value=cfg().token;$('#settingsModal').showModal()};$$('[data-open-settings]').forEach(b=>b.onclick=()=>$('#settingsBtn').click());$('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('dark')?'light':'dark');
$('#saveSettings').onclick=e=>{e.preventDefault();localStorage.setItem('hm_api_url',$('#apiUrl').value.trim());localStorage.setItem('hm_api_token',$('#apiToken').value.trim());$('#settingsModal').close();refresh()};
$$('.dataForm').forEach(form=>form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!form.reportValidity()) return;

  const entity=form.dataset.entity;
  const fd=new FormData(form), data=Object.fromEntries(fd.entries());
  const id=data.id; delete data.id;
  [...form.elements].filter(x=>x.type==='checkbox').forEach(x=>data[x.name]=x.checked);
  ['systolic','diastolic','pulse','weightKg','waistCm','value','refMin','refMax','kcal','carbsG','proteinG','fatG','weightStart','weightEnd']
    .forEach(k=>{if(k in data)data[k]=data[k]===''?'':Number(data[k])});

  const dlg=form.closest('dialog');
  const submit=form.querySelector('button[type=submit],button.primary:last-child');
  const oldText=submit?.textContent;
  if(submit){submit.disabled=true;submit.textContent='Salvataggio…'}

  /* Su Android/PWA Apps Script può completare la scrittura prima che fetch
     restituisca la risposta. Chiudiamo quindi il dialog subito dopo l'invio:
     il salvataggio continua in background e poi sincronizziamo dal server. */
  const request=apiPost({action:id?'update':'create',entity,id,data});
  setTimeout(()=>{ if(dlg?.open) dlg.close(); }, 250);

  try{
    const r=await Promise.race([
      request,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('__SAVE_RESPONSE_TIMEOUT__')),7000))
    ]);
    if(id){
      const i=S[entity].findIndex(x=>x.id===id);
      if(i>=0 && r?.data) S[entity][i]=r.data;
    } else if(r?.data) {
      S[entity].push(r.data);
    }
    renderAll();
    toast('Dato salvato correttamente');
  }catch(err){
    console.warn(err);
    if(err.message==='__SAVE_RESPONSE_TIMEOUT__'){
      toast('Dato inviato. Sincronizzo…');
      try{ await refresh(); }catch(_){}
    }else{
      toast('Verifico il salvataggio…');
      try{
        await refresh();
      }catch(_){
        alert('Non riesco a verificare il salvataggio. Controlla la connessione e riprova.');
      }
    }
  }finally{
    if(dlg?.open) dlg.close();
    if(submit){submit.disabled=false;submit.textContent=oldText}
  }
}));
$('#dashboardRange').onchange=renderTrend;$('#labSearch').oninput=renderLabs;$('#labParameter').onchange=renderLabs;$('#medTypeFilter').onchange=renderMeds;$('#medActiveFilter').onchange=renderMeds;$('#runCompare').onclick=renderCompare;$('#refreshBtn').onclick=refresh;
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#exportJsonBtn').onclick=()=>download(`health-monitor-${today()}.json`,JSON.stringify(S,null,2));
$('#exportCsvBtn').onclick=()=>{const lines=[];Object.entries(S).forEach(([entity,rows])=>{lines.push(entity);if(rows.length){const h=Object.keys(rows[0]);lines.push(h.join(';'));rows.forEach(r=>lines.push(h.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(';')))}lines.push('')});download(`health-monitor-${today()}.csv`,lines.join('\n'),'text/csv;charset=utf-8')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
applyTheme(localStorage.getItem('hm_theme')||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'));
if(cfg().url&&cfg().token)refresh();else $('#setupBanner').classList.remove('hidden');


// V2 UI enhancements
const TAB_META={dashboard:['Dashboard','Panoramica dei tuoi dati di salute'],pressure:['Pressione','Storico di sistolica, diastolica e frequenza cardiaca'],weight:['Peso corporeo','Monitora peso e circonferenza vita'],labs:['Analisi','Segui i parametri di laboratorio nel tempo'],diets:['Periodi alimentari','Collega alimentazione, peso e pressione'],meds:['Farmaci & integratori','Registra terapie e supplementi nel tempo'],compare:['Confronta','Analizza le relazioni temporali tra i tuoi dati'],data:['Dati & backup','Sincronizzazione, privacy ed esportazione']};
function syncTabUI(id){$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));$$('.view').forEach(x=>x.classList.toggle('active',x.id===id));const m=TAB_META[id]||TAB_META.dashboard;if($('#pageTitle'))$('#pageTitle').textContent=m[0];if($('#pageSubtitle'))$('#pageSubtitle').textContent=m[1];if(id==='compare')renderCompare();window.scrollTo({top:0,behavior:'smooth'});}
$$('[data-tab]').forEach(b=>b.onclick=()=>syncTabUI(b.dataset.tab));
const savedTheme=localStorage.getItem('hm_theme')||'light';document.documentElement.dataset.theme=savedTheme;function syncThemeIcon(){if($('#themeBtn'))$('#themeBtn').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾'}syncThemeIcon();if($('#themeBtn'))$('#themeBtn').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('hm_theme',next);syncThemeIcon();};

const mobileSettingsBtn=document.getElementById('mobileSettingsBtn');if(mobileSettingsBtn)mobileSettingsBtn.onclick=()=>document.getElementById('settingsBtn')?.click();


// V2.2 mobile "Altro" bottom sheet
(function(){
 const sheet=document.getElementById('mobileMoreSheet'),back=document.getElementById('mobileMoreBackdrop'),more=document.getElementById('mobileMoreBtn'),close=document.getElementById('mobileMoreClose');
 const setOpen=v=>{sheet?.classList.toggle('open',v);back?.classList.toggle('open',v);sheet?.setAttribute('aria-hidden',String(!v));back?.setAttribute('aria-hidden',String(!v));document.body.classList.toggle('sheet-open',v)};
 more?.addEventListener('click',()=>setOpen(true));close?.addEventListener('click',()=>setOpen(false));back?.addEventListener('click',()=>setOpen(false));
 sheet?.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setOpen(false)));
 const settings=document.getElementById('mobileSettingsBtn');settings?.addEventListener('click',()=>{setOpen(false);document.getElementById('settingsBtn')?.click()});
})();

function updateMacroSummary(){
 const box=$('#macroSummary'); if(!box)return;
 const c=n($('#dietCarbs')?.value)||0,p=n($('#dietProtein')?.value)||0,f=n($('#dietFat')?.value)||0;
 const kc=c*4+p*4+f*9;
 if(!kc){box.innerHTML='<strong>Distribuzione macro</strong><span>Inserisci proteine, grassi e carboidrati</span>';return}
 const pc=Math.round(c*4/kc*100),pp=Math.round(p*4/kc*100),pf=100-pc-pp;
 box.innerHTML=`<strong>${Math.round(kc)} kcal dai macro</strong><span>Proteine ${pp}% · Grassi ${pf}% · Carboidrati ${pc}%</span><div class="macroBars"><i style="width:${pp}%"></i><i style="width:${pf}%"></i><i style="width:${pc}%"></i></div>`;
}
['#dietCarbs','#dietProtein','#dietFat'].forEach(id=>$(id)?.addEventListener('input',updateMacroSummary));
