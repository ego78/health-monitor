
/* Health Monitor V3.3 - Health Insights */
(()=>{
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
let advChart=null,corrChart=null,importRows=[];
const num=v=>Number(v||0), d10=v=>String(v||'').slice(0,10);
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const mean=a=>a.length?a.reduce((s,v)=>s+num(v),0)/a.length:null;
const fmt=v=>v==null?'—':Math.round(v*10)/10;
const today33=()=>new Date().toISOString().slice(0,10);
const bpRange=(from,to)=>S.PRESSURE.filter(x=>d10(x.datetime)>=from&&d10(x.datetime)<=to);

function renderInsights(){
 const box=q('#smartInsights'); if(!box)return;
 const t=today33(), a7=addDays(t,-6),p7a=addDays(t,-13),p7b=addDays(t,-7);
 const now=bpRange(a7,t),prev=bpRange(p7a,p7b);
 const av=(arr,k)=>mean(arr.map(x=>num(x[k])));
 const cards=[];
 if(now.length){
   const ns=av(now,'systolic'),nd=av(now,'diastolic'),ps=av(prev,'systolic'),pd=av(prev,'diastolic');
   const delta=prev.length?` ${ns-ps>=0?'+':''}${fmt(ns-ps)}/${nd-pd>=0?'+':''}${fmt(nd-pd)} rispetto ai 7 giorni precedenti`:'';
   cards.push(['♥','Pressione',`${fmt(ns)}/${fmt(nd)} mmHg`,delta||`${now.length} sessioni negli ultimi 7 giorni`]);
 }
 const ws=[...S.WEIGHT].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(ws.length>1){const last=ws.at(-1), old=[...ws].reverse().find(x=>x.date<=addDays(last.date,-30))||ws[0];cards.push(['⚖','Peso',`${num(last.weightKg).toFixed(1)} kg`,`${num(last.weightKg)-num(old.weightKg)>=0?'+':''}${(num(last.weightKg)-num(old.weightKg)).toFixed(1)} kg dal ${dateFmt(old.date)}`])}
 const active=S.MEDS.filter(x=>x.startDate<=t&&(!x.endDate||x.endDate>=t)&&String(x.active)!=='false');
 const taken=S.INTAKE.filter(x=>x.date>=a7&&x.status==='Assunto').length, expected=active.length*7;
 if(active.length)cards.push(['✓','Aderenza',expected?`${Math.min(100,Math.round(taken/expected*100))}%`:'—',`${taken} assunzioni segnate negli ultimi 7 giorni`]);
 const diet=activeDietOn(t);if(diet)cards.push(['◉','Piano alimentare',esc(diet.name),`${diet.kcal||'—'} kcal · P ${diet.proteinG||'—'}g · C ${diet.carbsG||'—'}g · G ${diet.fatG||'—'}g`]);
 box.innerHTML=cards.length?cards.map(c=>`<article class="insight"><span>${c[0]}</span><div><small>${c[1]}</small><b>${c[2]}</b><p>${c[3]}</p></div></article>`).join(''):'<p class="muted">Aggiungi dati per generare confronti automatici.</p>';
}

function renderPressureAdvanced(){
 const box=q('#pressureAdvancedMetrics'),can=q('#pressureAdvancedChart');if(!box||!can)return;
 const t=today33(),p=bpRange(addDays(t,-89),t).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
 const m=p.filter(x=>String(x.period).toLowerCase().includes('matt')),e=p.filter(x=>String(x.period).toLowerCase().includes('ser'));
 const pp=p.map(x=>num(x.systolic)-num(x.diastolic)),pulse=p.filter(x=>x.pulse).map(x=>num(x.pulse));
 box.innerHTML=`<article><small>Media 90 gg</small><b>${p.length?fmt(mean(p.map(x=>num(x.systolic))))+'/'+fmt(mean(p.map(x=>num(x.diastolic)))):'—'}</b></article>
 <article><small>Differenziale media</small><b>${pp.length?fmt(mean(pp))+' mmHg':'—'}</b></article>
 <article><small>Battiti medi</small><b>${pulse.length?fmt(mean(pulse))+' bpm':'—'}</b></article>
 <article><small>Mattina vs sera</small><b>${m.length&&e.length?fmt(mean(m.map(x=>num(x.systolic)))-mean(e.map(x=>num(x.systolic))))+' SYS':'—'}</b></article>`;
 if(advChart)advChart.destroy();
 advChart=new Chart(can,{type:'line',data:{labels:p.map(x=>dateFmt(d10(x.datetime))),datasets:[
  {label:'SYS',data:p.map(x=>num(x.systolic)),tension:.25},{label:'DIA',data:p.map(x=>num(x.diastolic)),tension:.25},
  {label:'Differenziale',data:p.map(x=>num(x.systolic)-num(x.diastolic)),tension:.25,hidden:true}
 ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}}});
}

function labStatus(x){const v=num(x.value),lo=x.refMin===''||x.refMin==null?null:num(x.refMin),hi=x.refMax===''||x.refMax==null?null:num(x.refMax);if(lo!=null&&v<lo)return['Basso','low'];if(hi!=null&&v>hi)return['Alto','high'];if(lo!=null||hi!=null)return['Nel range','normal'];return['Senza range','neutral']}
function renderLabAdvanced(){
 const box=q('#labAdvancedSummary');if(!box)return;const param=q('#labParameter')?.value||'';
 let a=S.LABS.filter(x=>!param||x.parameter===param).sort((x,y)=>String(y.date).localeCompare(String(x.date)));
 if(!a.length){box.innerHTML='<p class="muted">Nessun valore disponibile.</p>';return}
 const latest=a[0],st=labStatus(latest);
 box.innerHTML=`<div class="labHero"><div><small>${esc(latest.parameter)}</small><b>${esc(latest.value)} ${esc(latest.unit||'')}</b><span>${dateFmt(latest.date)}</span></div><em class="${st[1]}">${st[0]}</em></div>
 <div class="labHistory">${a.slice(0,8).map(x=>{const s=labStatus(x);return `<div><span>${dateFmt(x.date)}</span><b>${esc(x.value)} ${esc(x.unit||'')}</b><em class="${s[1]}">${s[0]}</em></div>`}).join('')}</div>`;
}

function dailyFor(d){return S.DAILY?.find(x=>x.date===d)}
function renderDaily(){
 const d=q('#todayDate')?.value||today33(),x=dailyFor(d),box=q('#dailyWellnessSummary');if(!box)return;
 box.innerHTML=x?`<article><span>☾</span><b>${x.sleepHours||'—'} h</b><small>Sonno</small></article><article><span>⌁</span><b>${x.activityMin||'—'} min</b><small>Attività</small></article><article><span>◉</span><b>${x.waterMl||'—'} ml</b><small>Acqua</small></article><article><span>☺</span><b>${x.stress||'—'}/10</b><small>Stress</small></article>${x.notes?`<p class="dailyNote">${esc(x.notes)}</p>`:''}`:'<p class="muted">Nessun dato di benessere registrato per questa giornata.</p>';
}

q('#dailyForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const data=Object.fromEntries(new FormData(f).entries());
 ['sleepHours','activityMin','waterMl','stress'].forEach(k=>data[k]=data[k]?Number(data[k]):'');
 const old=dailyFor(data.date);
 try{const j=await apiPost(old?{action:'update',entity:'DAILY',id:old.id,data}:{action:'create',entity:'DAILY',data});if(old)Object.assign(old,j.data);else S.DAILY.push(j.data);q('#dailyModal').close();renderDaily();toast('Diario salvato')}catch(err){toast(err.message)}
});

function series(key,from,to){
 const days=[];for(let d=from;d<=to;d=addDays(d,1))days.push(d);
 const bp=(d,k)=>{const z=S.PRESSURE.filter(x=>d10(x.datetime)===d);return z.length?mean(z.map(x=>num(x[k]))):null};
 const wt=d=>{const z=S.WEIGHT.filter(x=>x.date===d);return z.length?num(z.at(-1).weightKg):null};
 const kcal=d=>S.MEALS.filter(x=>x.date===d).reduce((s,x)=>s+num(x.kcal),0)||null;
 return days.map(d=>[d,key==='sys'?bp(d,'systolic'):key==='dia'?bp(d,'diastolic'):key==='pulse'?bp(d,'pulse'):key==='weight'?wt(d):kcal(d)]).filter(x=>x[1]!=null);
}
function correlation(a,b){const ma=new Map(a),pairs=b.filter(x=>ma.has(x[0])).map(x=>[ma.get(x[0]),x[1]]);if(pairs.length<3)return{r:null,pairs};const xs=pairs.map(x=>x[0]),ys=pairs.map(x=>x[1]),mx=mean(xs),my=mean(ys);let top=0,dx=0,dy=0;pairs.forEach(([x,y])=>{top+=(x-mx)*(y-my);dx+=(x-mx)**2;dy+=(y-my)**2});return{r:dx&&dy?top/Math.sqrt(dx*dy):null,pairs}}
function runCorrelation(){
 const from=q('#exploreFrom').value,to=q('#exploreTo').value,A=q('#corrA').value,B=q('#corrB').value,res=correlation(series(A,from,to),series(B,from,to));
 const box=q('#correlationResult');if(res.r==null)box.innerHTML='<p class="muted">Servono almeno 3 giornate con entrambi i dati.</p>';else{const ar=Math.abs(res.r),desc=ar>=.7?'forte':ar>=.4?'moderata':ar>=.2?'debole':'molto debole';box.innerHTML=`<b>r = ${res.r.toFixed(2)}</b><span>Associazione ${desc} ${res.r>=0?'positiva':'negativa'} su ${res.pairs.length} giornate.</span><small>È un’associazione statistica, non una conclusione clinica né causale.</small>`}
 if(corrChart)corrChart.destroy();corrChart=new Chart(q('#correlationChart'),{type:'scatter',data:{datasets:[{label:'Giornate sovrapposte',data:res.pairs.map(x=>({x:x[0],y:x[1]}))}]},options:{responsive:true,maintainAspectRatio:false}});
}
q('#runCorrelation')?.addEventListener('click',runCorrelation);

function allSearchItems(){
 const a=[];for(const [entity,rows] of Object.entries(S))for(const x of rows||[]){const date=x.datetime||x.date||x.startDate||'',title=x.parameter||x.name||x.medName||x.title||entity,detail=[x.value,x.unit,x.systolic&&`${x.systolic}/${x.diastolic}`,x.notes,x.context,x.details].filter(Boolean).join(' · ');a.push({entity,date,title,detail,raw:JSON.stringify(x).toLowerCase()})}return a}
function doGlobalSearch(){
 const term=q('#globalSearchInput').value.trim().toLowerCase(),box=q('#globalSearchResults');if(term.length<2){box.innerHTML='<p class="muted">Scrivi almeno 2 caratteri.</p>';return}
 const r=allSearchItems().filter(x=>x.raw.includes(term)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,60);
 box.innerHTML=r.length?r.map(x=>`<div class="searchHit"><small>${dateFmt(d10(x.date))} · ${esc(x.entity)}</small><b>${esc(x.title)}</b><span>${esc(x.detail)}</span></div>`).join(''):'<p class="muted">Nessun risultato.</p>';
}
q('#globalSearchBtn')?.addEventListener('click',()=>{q('#globalSearchModal').showModal();setTimeout(()=>q('#globalSearchInput').focus(),50)});
q('#globalSearchInput')?.addEventListener('input',doGlobalSearch);

function applyHomePrefs(){
 const prefs=JSON.parse(localStorage.getItem('hm_home_prefs')||'{}');
 qa('[data-home-pref]').forEach(c=>{if(prefs[c.dataset.homePref]===false)c.checked=false;const target=c.dataset.homePref==='hmDietBanner'?q('.hmDietBanner'):c.dataset.homePref==='hmTrend'?q('.hmTrend'):c.dataset.homePref==='hmRecent'?q('.hmRecent'):q('#'+c.dataset.homePref);target?.classList.toggle('prefHidden',!c.checked)})
}
qa('[data-home-pref]').forEach(c=>c.addEventListener('change',()=>{const p=JSON.parse(localStorage.getItem('hm_home_prefs')||'{}');p[c.dataset.homePref]=c.checked;localStorage.setItem('hm_home_prefs',JSON.stringify(p));applyHomePrefs()}));

q('#enableNotifications')?.addEventListener('click',async()=>{if(!('Notification'in window))return toast('Notifiche non supportate');const r=await Notification.requestPermission();toast(r==='granted'?'Promemoria attivati':'Permesso notifiche non concesso')});
function checkMedReminders(){
 if(!('Notification'in window)||Notification.permission!=='granted')return;const now=new Date(),hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,d=today33();
 S.MEDS.filter(m=>String(m.reminderEnabled)==='true'&&m.active!==false&&m.startDate<=d&&(!m.endDate||m.endDate>=d)&&m.timeOfDay===hm).forEach(m=>{const key=`hm_notified_${m.id}_${d}_${hm}`;if(!sessionStorage.getItem(key)){new Notification(`Health Monitor · ${m.name}`,{body:`Promemoria: ${m.dose||''} ${m.unit||''}`});sessionStorage.setItem(key,'1')}})
}
setInterval(checkMedReminders,60000);

function medicalReport(){
 const from=q('#reportFrom').value,to=q('#reportTo').value,prs=S.PRESSURE.filter(x=>d10(x.datetime)>=from&&d10(x.datetime)<=to),ws=S.WEIGHT.filter(x=>x.date>=from&&x.date<=to),labs=S.LABS.filter(x=>x.date>=from&&x.date<=to),meds=S.MEDS.filter(x=>x.startDate<=to&&(!x.endDate||x.endDate>=from));
 const av=k=>prs.length?fmt(mean(prs.map(x=>num(x[k])))):'—',lastW=ws.sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 q('#reportContent').innerHTML=`<div class="medicalReport"><header><h1>Health Monitor · Report visita</h1><p>${dateFmt(from)} — ${dateFmt(to)}</p><small>Riepilogo descrittivo dei dati registrati. Non costituisce diagnosi.</small></header>
 <section><h2>Pressione</h2><div class="reportStats"><b>${av('systolic')}/${av('diastolic')} <small>media mmHg</small></b><b>${av('pulse')} <small>bpm medi</small></b><b>${prs.length} <small>sessioni</small></b></div></section>
 <section><h2>Peso</h2><p>${lastW?`${lastW.weightKg} kg al ${dateFmt(lastW.date)}`:'Nessun dato nel periodo'}</p></section>
 <section><h2>Farmaci e integratori</h2>${meds.length?`<table><tr><th>Nome</th><th>Dose</th><th>Frequenza/orario</th><th>Periodo</th></tr>${meds.map(m=>`<tr><td>${esc(m.type)} · ${esc(m.name)}</td><td>${esc(m.dose)} ${esc(m.unit)}</td><td>${esc(m.frequency)} ${esc(m.timeOfDay)}</td><td>${dateFmt(m.startDate)} → ${m.endDate?dateFmt(m.endDate):'attivo'}</td></tr>`).join('')}</table>`:'<p>Nessuna terapia registrata.</p>'}</section>
 <section><h2>Analisi nel periodo</h2>${labs.length?`<table><tr><th>Data</th><th>Parametro</th><th>Valore</th><th>Riferimento</th></tr>${labs.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${dateFmt(x.date)}</td><td>${esc(x.parameter)}</td><td>${esc(x.value)} ${esc(x.unit)}</td><td>${esc(x.refMin||'—')} – ${esc(x.refMax||'—')}</td></tr>`).join('')}</table>`:'<p>Nessuna analisi nel periodo.</p>'}</section>
 </div>`;
}
q('#buildMedicalReport')?.addEventListener('click',medicalReport);

function parseLabText(text){
 const rows=[],lines=text.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const units='mg/dL|mmol/L|µmol/L|umol/L|g/dL|ng/mL|pg/mL|mIU/L|U/L|UI/L|mEq/L|%|fL|10\\^3/uL';
 const rx=new RegExp(`^(.{2,45}?)\\s+(-?\\d+(?:[.,]\\d+)?)\\s*(${units})?(?:\\s+(-?\\d+(?:[.,]\\d+)?)\\s*[-–]\\s*(-?\\d+(?:[.,]\\d+)?))?`,'i');
 for(const line of lines){const m=line.match(rx);if(m){const parameter=m[1].replace(/[:;]+$/,'').trim();if(!/^(data|pagina|referto|laboratorio)$/i.test(parameter))rows.push({parameter,value:m[2].replace(',','.'),unit:m[3]||'',refMin:(m[4]||'').replace(',','.'),refMax:(m[5]||'').replace(',','.')})}}
 return rows.slice(0,100);
}
async function extractPdf(file){
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text='';
 for(let i=1;i<=Math.min(pdf.numPages,8);i++){const page=await pdf.getPage(i),tc=await page.getTextContent();text+=tc.items.map(x=>x.str).join(' ')+'\n'}
 return text;
}
async function extractImage(file){const r=await Tesseract.recognize(file,'ita',{logger:m=>{if(m.status==='recognizing text')q('#labImportStatus').textContent=`OCR ${Math.round((m.progress||0)*100)}%`}});return r.data.text}
function renderImportReview(){
 const box=q('#labImportReview');box.innerHTML=importRows.length?`<div class="importTable">${importRows.map((x,i)=>`<label class="importRow"><input type="checkbox" data-import-check="${i}" checked><input data-import-field="${i}:parameter" value="${esc(x.parameter)}"><input data-import-field="${i}:value" value="${esc(x.value)}"><input data-import-field="${i}:unit" value="${esc(x.unit)}" placeholder="unità"><input data-import-field="${i}:refMin" value="${esc(x.refMin)}" placeholder="min"><input data-import-field="${i}:refMax" value="${esc(x.refMax)}" placeholder="max"></label>`).join('')}</div>`:'<p class="muted">Non ho riconosciuto automaticamente righe strutturate. Puoi inserire i valori manualmente con “＋ Valore”.</p>';q('#saveImportedLabs').disabled=!importRows.length
}
q('#openLabImport')?.addEventListener('click',()=>q('#labImportModal').showModal());
q('#extractLabFile')?.addEventListener('click',async()=>{const file=q('#labImportFile').files[0];if(!file)return toast('Seleziona un referto');q('#labImportStatus').textContent='Estrazione in corso…';try{const text=file.type==='application/pdf'?await extractPdf(file):await extractImage(file);importRows=parseLabText(text);renderImportReview();q('#labImportStatus').textContent=`Trovati ${importRows.length} possibili valori. Controllali prima di salvare.`}catch(e){q('#labImportStatus').textContent='Errore estrazione: '+e.message}});
q('#saveImportedLabs')?.addEventListener('click',async()=>{const date=q('#importLabDate').value||today33(),lab=q('#importLabName').value,ops=[];qa('[data-import-check]:checked').forEach(c=>{const i=c.dataset.importCheck,o={date,lab,notes:'Importato da referto'};qa(`[data-import-field^="${i}:"]`).forEach(inp=>o[inp.dataset.importField.split(':')[1]]=inp.value);ops.push({action:'create',entity:'LABS',data:o})});if(!ops.length)return toast('Nessun valore selezionato');try{for(let i=0;i<ops.length;i+=40)await apiPost({action:'bulk',operations:ops.slice(i,i+40)});q('#labImportModal').close();await refresh();toast(`${ops.length} valori importati`)}catch(e){toast(e.message)}});

function render33(){renderInsights();renderPressureAdvanced();renderLabAdvanced();renderDaily();applyHomePrefs()}
const oldRender=renderAll;renderAll=function(){oldRender();render33()};
q('#todayDate')?.addEventListener('change',renderDaily);q('#labParameter')?.addEventListener('change',()=>setTimeout(renderLabAdvanced,0));
qa('[data-modal="dailyModal"]').forEach(b=>b.addEventListener('click',()=>{const f=q('#dailyForm');if(f){f.elements.date.value=q('#todayDate')?.value||today33();const x=dailyFor(f.elements.date.value);if(x)for(const [k,v] of Object.entries(x))if(f.elements[k])f.elements[k].value=v??''}}));
setTimeout(render33,500);
})();
