
/* Health Monitor V3.0 - daily diary, adherence, grouped labs, explore, offline queue */
S.MEALS=S.MEALS||[]; S.INTAKE=S.INTAKE||[];
let exploreChartV3=null, bpTimerHandle=null, bpSeconds=60;
const v3Today=()=>new Date().toISOString().slice(0,10);
const v3n=v=>Number(v||0);
const sameDay=(v,d)=>String(v||'').slice(0,10)===d;
const sum=(arr,k)=>arr.reduce((a,x)=>a+v3n(x[k]),0);

function activeDietOn(d){
  return S.DIETS.filter(x=>x.startDate<=d&&(!x.endDate||x.endDate>=d)).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)))[0]||null;
}
function v3Progress(label,value,target,unit){
  const pct=target?Math.min(100,Math.round(value/target*100)):0;
  return `<div class="macroRow"><div><b>${label}</b><span>${Math.round(value*10)/10}${unit} / ${target||'—'}${unit}</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
}
function renderTodayV3(){
  const d=$('#todayDate')?.value||v3Today(); if($('#todayDate')&&!$('#todayDate').value)$('#todayDate').value=d;
  const meals=S.MEALS.filter(x=>sameDay(x.date,d)), diet=activeDietOn(d);
  const totals={kcal:sum(meals,'kcal'),proteinG:sum(meals,'proteinG'),fatG:sum(meals,'fatG'),carbsG:sum(meals,'carbsG')};
  const bp=S.PRESSURE.filter(x=>sameDay(x.datetime,d)), weights=S.WEIGHT.filter(x=>sameDay(x.date,d));
  const avgK=k=>bp.length?Math.round(bp.reduce((a,x)=>a+v3n(x[k]),0)/bp.length):null;
  $('#todaySummary').innerHTML=`<article class="dayCard"><span>Pressione</span><b>${bp.length?avgK('systolic')+'/'+avgK('diastolic'):'—'}</b><small>${bp.length} sessioni</small></article><article class="dayCard"><span>Peso</span><b>${weights.length?v3n(weights.at(-1).weightKg).toFixed(1)+' kg':'—'}</b><small>${weights.length?'registrato oggi':'nessun dato'}</small></article><article class="dayCard"><span>Alimentazione</span><b>${Math.round(totals.kcal)} kcal</b><small>${meals.length} pasti</small></article><article class="dayCard"><span>Piano</span><b>${diet?esc(diet.name):'—'}</b><small>${diet?diet.kcal+' kcal target':'nessun piano attivo'}</small></article>`;
  $('#macroProgress').innerHTML=diet?`${v3Progress('Calorie',totals.kcal,v3n(diet.kcal),' kcal')}${v3Progress('Proteine',totals.proteinG,v3n(diet.proteinG),' g')}${v3Progress('Grassi',totals.fatG,v3n(diet.fatG),' g')}${v3Progress('Carboidrati',totals.carbsG,v3n(diet.carbsG),' g')}`:'<p class="muted">Nessun piano alimentare attivo per questa data.</p>';
  $('#todayMeals').innerHTML=meals.length?meals.map(x=>`<div class="todayItem"><div><small>${esc(x.mealType)}</small><b>${esc(x.name)}</b><span>${v3n(x.kcal)} kcal · P ${v3n(x.proteinG)}g · G ${v3n(x.fatG)}g · C ${v3n(x.carbsG)}g</span></div><button onclick="v3Delete('MEALS','${x.id}')">×</button></div>`).join(''):'<p class="muted">Nessun pasto registrato.</p>';
  renderTodayMedsV3(d);
}
function intakeFor(medId,d){return S.INTAKE.find(x=>x.medId===medId&&x.date===d)}
function renderTodayMedsV3(d){
  const meds=S.MEDS.filter(x=>x.startDate<=d&&(!x.endDate||x.endDate>=d)&&String(x.active)!=='false');
  $('#todayMeds').innerHTML=meds.length?meds.map(m=>{const it=intakeFor(m.id,d);return `<div class="todayItem medToday"><div><small>${esc(m.type||'Terapia')} · ${esc(m.timeOfDay||'')}</small><b>${esc(m.name)}</b><span>${esc([m.dose,m.unit,m.frequency].filter(Boolean).join(' · '))}</span></div><div class="takeBtns"><button class="${it?.status==='Assunto'?'taken':''}" onclick="markIntakeV3('${m.id}','Assunto')">✓ Assunto</button><button class="${it?.status==='Saltato'?'skipped':''}" onclick="markIntakeV3('${m.id}','Saltato')">Salta</button></div></div>`}).join(''):'<p class="muted">Nessuna terapia attiva oggi.</p>';
}
async function markIntakeV3(medId,status){
  const d=$('#todayDate').value||v3Today(), med=S.MEDS.find(x=>x.id===medId), old=intakeFor(medId,d);
  const data={date:d,medId,medName:med?.name||'',status,scheduledTime:med?.timeOfDay||'',takenAt:status==='Assunto'?new Date().toISOString():'',notes:''};
  try{
    const j=await apiPost(old?{action:'update',entity:'INTAKE',id:old.id,data}:{action:'create',entity:'INTAKE',data});
    if(old)Object.assign(old,j.data);else S.INTAKE.push(j.data);renderTodayV3();toast(status);
  }catch(e){queueOfflineV3(old?'update':'create','INTAKE',data,old?.id);toast('Salvato offline: sincronizzerò appena possibile');}
}
async function v3Delete(entity,id){if(!confirm('Eliminare questa registrazione?'))return;try{await apiPost({action:'delete',entity,id});S[entity]=S[entity].filter(x=>x.id!==id);renderTodayV3()}catch(e){toast(e.message)}}
window.v3Delete=v3Delete; window.markIntakeV3=markIntakeV3;

function renderLabBatchesV3(){
  const box=$('#labBatches'); if(!box)return;
  const groups={}; S.LABS.forEach(x=>{const key=(x.date||'')+'|'+(x.lab||'');(groups[key]??=[]).push(x)});
  const rows=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
  box.innerHTML=rows.length?rows.map(([key,arr])=>`<details class="labBatch"><summary><div><b>${dateFmt(arr[0].date)}</b><small>${esc(arr[0].lab||'Laboratorio non indicato')} · ${arr.length} parametri</small></div><span>Apri</span></summary><div class="batchValues">${arr.map(x=>`<div><b>${esc(x.parameter)}</b><span>${esc(x.value)} ${esc(x.unit||'')}</span><small>${x.refMin||x.refMax?`rif. ${esc(x.refMin||'—')}–${esc(x.refMax||'—')}`:''}</small></div>`).join('')}</div></details>`).join(''):'<p class="muted">Nessun prelievo registrato.</p>';
}
function dayMealsTotals(d){const a=S.MEALS.filter(x=>sameDay(x.date,d));return{kcal:sum(a,'kcal'),proteinG:sum(a,'proteinG'),fatG:sum(a,'fatG'),carbsG:sum(a,'carbsG')}}
function renderExploreV3(){
  if(!$('#exploreChart'))return;
  if(!$('#exploreTo').value)$('#exploreTo').value=v3Today(); if(!$('#exploreFrom').value)$('#exploreFrom').value=dateAdd(v3Today(),-90);
  const a=$('#exploreFrom').value,b=$('#exploreTo').value;
  const labels=[...new Set([...S.PRESSURE.filter(x=>inRange(x.datetime,a,b)).map(x=>String(x.datetime).slice(0,10)),...S.WEIGHT.filter(x=>inRange(x.date,a,b)).map(x=>x.date),...S.MEALS.filter(x=>inRange(x.date,a,b)).map(x=>x.date)])].sort();
  const bpFor=(d,k)=>{const z=S.PRESSURE.filter(x=>sameDay(x.datetime,d));return z.length?Math.round(z.reduce((s,x)=>s+v3n(x[k]),0)/z.length*10)/10:null};
  const wFor=d=>{const z=S.WEIGHT.filter(x=>sameDay(x.date,d));return z.length?v3n(z.at(-1).weightKg):null};
  const ds=[];
  if($('#exSys').checked)ds.push({label:'Sistolica',data:labels.map(d=>bpFor(d,'systolic')),spanGaps:true,yAxisID:'y'});
  if($('#exDia').checked)ds.push({label:'Diastolica',data:labels.map(d=>bpFor(d,'diastolic')),spanGaps:true,yAxisID:'y'});
  if($('#exWeight').checked)ds.push({label:'Peso kg',data:labels.map(wFor),spanGaps:true,yAxisID:'y1'});
  for(const [id,key,label] of [['exKcal','kcal','Kcal'],['exProtein','proteinG','Proteine g'],['exCarbs','carbsG','Carboidrati g'],['exFat','fatG','Grassi g']])if($('#'+id).checked)ds.push({label,data:labels.map(d=>dayMealsTotals(d)[key]),spanGaps:true,yAxisID:'y2'});
  const lab=$('#exLab').value;if(lab){ds.push({label:lab,data:labels.map(d=>{const z=S.LABS.filter(x=>x.parameter===lab&&sameDay(x.date,d));return z.length?v3n(z.at(-1).value):null}),spanGaps:true,yAxisID:'y2'})}
  if(exploreChartV3)exploreChartV3.destroy(); exploreChartV3=new Chart($('#exploreChart'),{type:'line',data:{labels:labels.map(dateFmt),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{y:{position:'left'},y1:{position:'right',grid:{drawOnChartArea:false}},y2:{display:false}}}});
  const periods=[...S.DIETS.filter(x=>x.startDate<=b&&(x.endDate||v3Today())>=a).map(x=>`Dieta: ${x.name} (${dateFmt(x.startDate)}→${x.endDate?dateFmt(x.endDate):'oggi'})`),...S.MEDS.filter(x=>x.startDate<=b&&(x.endDate||v3Today())>=a).map(x=>`${x.type}: ${x.name}`)];
  $('#explorePeriods').innerHTML=periods.map(x=>`<span>${esc(x)}</span>`).join('');
  renderHistoryV3();
}
function populateExploreLabsV3(){const s=$('#exLab');if(!s)return;const old=s.value,names=[...new Set(S.LABS.map(x=>x.parameter).filter(Boolean))].sort();s.innerHTML='<option value="">Nessuna</option>'+names.map(x=>`<option>${esc(x)}</option>`).join('');if(names.includes(old))s.value=old}
function renderHistoryV3(){
  const q=($('#historySearch')?.value||'').toLowerCase(),type=$('#historyType')?.value||'',a=$('#exploreFrom')?.value||'0000-01-01',b=$('#exploreTo')?.value||'9999-12-31';
  const items=[...timelineItems(),...S.MEALS.map(x=>({date:x.date,type:'Pasto',title:`${x.mealType}: ${x.name}`,detail:`${x.kcal||0} kcal · P ${x.proteinG||0} · G ${x.fatG||0} · C ${x.carbsG||0}`}))].filter(x=>inRange(x.date,a,b)&&(!type||x.type===type)&&(!q||JSON.stringify(x).toLowerCase().includes(q))).sort((x,y)=>new Date(y.date)-new Date(x.date)).slice(0,100);
  $('#historyResults').innerHTML=items.length?items.map(x=>`<div class="historyItem"><small>${dateFmt(x.date)} · ${esc(x.type)}</small><b>${esc(x.title)}</b><span>${esc(x.detail||'')}</span></div>`).join(''):'<p class="muted">Nessun risultato.</p>';
}
function queueOfflineV3(action,entity,data,id){const q=JSON.parse(localStorage.getItem('hm_offline_queue')||'[]');q.push({action,entity,data,id,queuedAt:new Date().toISOString()});localStorage.setItem('hm_offline_queue',JSON.stringify(q));}
async function syncOfflineV3(){if(!navigator.onLine)return;const q=JSON.parse(localStorage.getItem('hm_offline_queue')||'[]');if(!q.length)return;const left=[];for(const op of q){try{await apiPost(op)}catch(e){left.push(op)}}localStorage.setItem('hm_offline_queue',JSON.stringify(left));if(left.length!==q.length){toast(`Sincronizzati ${q.length-left.length} dati offline`);try{await refresh()}catch(_){}}}
window.addEventListener('online',syncOfflineV3);

$('#mealForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const data=Object.fromEntries(new FormData(f).entries());for(const k of ['kcal','proteinG','fatG','carbsG'])data[k]=v3n(data[k]);try{const j=await apiPost({action:'create',entity:'MEALS',data});S.MEALS.push(j.data);$('#mealModal').close();f.reset();renderTodayV3();toast('Pasto salvato')}catch(err){data.id=crypto.randomUUID();S.MEALS.push(data);queueOfflineV3('create','MEALS',data);$('#mealModal').close();renderTodayV3();toast('Pasto salvato offline')}});
$('#todayDate')?.addEventListener('change',renderTodayV3);
$('#runExplore')?.addEventListener('click',renderExploreV3);$('#historySearch')?.addEventListener('input',renderHistoryV3);$('#historyType')?.addEventListener('change',renderHistoryV3);
$('#startBpTimer')?.addEventListener('click',()=>{clearInterval(bpTimerHandle);bpSeconds=60;const box=$('#bpTimer');const draw=()=>{box.textContent=`${String(Math.floor(bpSeconds/60)).padStart(2,'0')}:${String(bpSeconds%60).padStart(2,'0')}`};draw();bpTimerHandle=setInterval(()=>{bpSeconds--;draw();if(bpSeconds<=0){clearInterval(bpTimerHandle);box.textContent='Pronto ✓';if(navigator.vibrate)navigator.vibrate([150,100,150])}},1000)});

function v3RenderAll(){renderTodayV3();renderLabBatchesV3();populateExploreLabsV3();renderExploreV3();syncOfflineV3()}
const _renderAllV27=renderAll; renderAll=function(){_renderAllV27();v3RenderAll()};
setTimeout(()=>{if($('#mealModal form'))$('#mealModal form').elements.date.value=v3Today();v3RenderAll()},250);

setTimeout(()=>{
 const dataView=$('#data'); if(dataView&&!$('#restoreBackup')){
   const box=document.createElement('div');box.className='panel';box.innerHTML=`<div class="panelHead"><div><h2>Ripristino backup</h2><p>Importa un backup JSON esportato da Health Monitor. I record con ID già presenti vengono ignorati.</p></div></div><input id="restoreFile" type="file" accept=".json,application/json"><button id="restoreBackup" class="primary" style="margin-top:12px">Ripristina backup</button><p id="restoreStatus" class="muted"></p>`;dataView.appendChild(box);
   $('#restoreBackup').onclick=async()=>{const file=$('#restoreFile').files[0];if(!file)return toast('Seleziona un file JSON');try{const obj=JSON.parse(await file.text()),data=obj.data||obj,ops=[];for(const entity of Object.keys(S)){for(const rec of (data[entity]||[])){if(!S[entity].some(x=>x.id===rec.id))ops.push({action:'create',entity,data:rec})}}if(!ops.length)return $('#restoreStatus').textContent='Nessun nuovo record da importare.';for(let i=0;i<ops.length;i+=50)await apiPost({action:'bulk',operations:ops.slice(i,i+50)});$('#restoreStatus').textContent=`Importati ${ops.length} record.`;await refresh()}catch(e){$('#restoreStatus').textContent='Errore: '+e.message}};
 }
},400);

/* V3.2 UI helpers */
function renderV32Chrome(){
  const d=new Date();
  const days=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const hero=document.getElementById('heroDate');
  if(hero)hero.textContent=`${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const active=S.DIETS.filter(x=>x.startDate<=v3Today()&&(!x.endDate||x.endDate>=v3Today())).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)))[0];
  const bn=document.getElementById('dietBannerName'),bi=document.getElementById('dietBannerInfo');
  if(bn)bn.textContent=active?.name||'Nessun piano attivo';
  if(bi)bi.textContent=active?`${active.kcal||'—'} kcal · C ${active.carbsG||'—'}g · P ${active.proteinG||'—'}g · G ${active.fatG||'—'}g`:'Aggiungi un periodo alimentare';
}
const _v3RenderAll32=v3RenderAll;
v3RenderAll=function(){_v3RenderAll32();renderV32Chrome()};

setTimeout(renderV32Chrome,200);
