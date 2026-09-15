const APP_VERSION = '3.0.0';
const SHEETS = {
  PRESSURE: ['id','datetime','systolic','diastolic','pulse','period','readingsCount','systolic1','diastolic1','pulse1','systolic2','diastolic2','pulse2','systolic3','diastolic3','pulse3','position','arm','context','notes','createdAt'],
  WEIGHT: ['id','date','weightKg','waistCm','notes','createdAt'],
  LABS: ['id','date','parameter','value','unit','refMin','refMax','lab','notes','createdAt'],
  DIETS: ['id','name','startDate','endDate','kcal','carbsG','proteinG','fatG','weightStart','weightEnd','notes','createdAt'],
  MEDS: ['id','type','name','dose','unit','frequency','timeOfDay','startDate','endDate','active','notes','createdAt'],
  EVENTS: ['id','date','category','title','details','createdAt'],
  MEALS: ['id','date','mealType','name','kcal','proteinG','fatG','carbsG','notes','createdAt'],
  INTAKE: ['id','date','medId','medName','status','scheduledTime','takenAt','notes','createdAt'],
  SETTINGS: ['key','value']
};

function setupDatabase() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const existing = props.getProperty('SPREADSHEET_ID');
  if (existing) ss = SpreadsheetApp.openById(existing);
  else {
    ss = SpreadsheetApp.create('Health Monitor - Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  Object.entries(SHEETS).forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
    } else {
      const existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      headers.forEach(h => { if (!existing.includes(h)) { sh.getRange(1, sh.getLastColumn()+1).setValue(h); existing.push(h); } });
    }
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold');
    sh.autoResizeColumns(1, headers.length);
  });

  if (ss.getSheets().length > Object.keys(SHEETS).length) {
    const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Foglio1');
    if (defaultSheet && defaultSheet.getLastRow() === 0) ss.deleteSheet(defaultSheet);
  }

  if (!props.getProperty('ACCESS_TOKEN')) props.setProperty('ACCESS_TOKEN', Utilities.getUuid().replace(/-/g,''));
  return {
    spreadsheetUrl: ss.getUrl(),
    spreadsheetId: ss.getId(),
    accessToken: props.getProperty('ACCESS_TOKEN'),
    version: APP_VERSION
  };
}

function rotateAccessToken() {
  const token = Utilities.getUuid().replace(/-/g,'');
  PropertiesService.getScriptProperties().setProperty('ACCESS_TOKEN', token);
  return token;
}

function doGet(e) {
  try {
    validateToken_(e.parameter.token);
    const action = e.parameter.action || 'bootstrap';
    let out;
    if (action === 'bootstrap') out = bootstrap_();
    else if (action === 'list') out = list_(e.parameter.entity, e.parameter.from, e.parameter.to);
    else if (action === 'health') out = {ok:true, version:APP_VERSION, time:new Date().toISOString()};
    else throw new Error('Azione GET non valida');
    return json_(out, e.parameter.callback);
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)}, e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    validateToken_(body.token || e.parameter.token);
    const action = body.action;
    let out;
    if (action === 'create') out = create_(body.entity, body.data || {});
    else if (action === 'update') out = update_(body.entity, body.id, body.data || {});
    else if (action === 'delete') out = remove_(body.entity, body.id);
    else if (action === 'bulk') out = bulk_(body.operations || []);
    else throw new Error('Azione POST non valida');
    return json_(out);
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function bootstrap_() {
  const result = {ok:true, version:APP_VERSION, data:{}};
  Object.keys(SHEETS).filter(k => k !== 'SETTINGS').forEach(k => result.data[k] = readAll_(k));
  return result;
}

function list_(entity, from, to) {
  assertEntity_(entity);
  let rows = readAll_(entity);
  if (from || to) {
    const field = entity === 'PRESSURE' ? 'datetime' : (['WEIGHT','LABS','EVENTS'].includes(entity) ? 'date' : 'startDate');
    rows = rows.filter(r => {
      const d = String(r[field] || '').slice(0,10);
      return (!from || d >= from) && (!to || d <= to);
    });
  }
  return {ok:true, entity, data:rows};
}

function create_(entity, data) {
  assertEntity_(entity);
  const sh = getSheet_(entity);
  const headers = actualHeaders_(sh);
  data.id = data.id || Utilities.getUuid();
  data.createdAt = data.createdAt || new Date().toISOString();
  if (entity === 'MEDS' && data.active === undefined) data.active = true;
  const row = headers.map(h => normalizeCell_(data[h]));
  sh.appendRow(row);
  return {ok:true, data:objectFromRow_(headers,row)};
}

function update_(entity, id, data) {
  assertEntity_(entity);
  if (!id) throw new Error('ID mancante');
  const sh = getSheet_(entity);
  const headers = actualHeaders_(sh);
  const values = sh.getDataRange().getValues();
  const idx = headers.indexOf('id');
  for (let i=1;i<values.length;i++) {
    if (String(values[i][idx]) === String(id)) {
      const current = objectFromRow_(headers, values[i]);
      const merged = Object.assign({}, current, data, {id:id});
      const row = headers.map(h => normalizeCell_(merged[h]));
      sh.getRange(i+1,1,1,headers.length).setValues([row]);
      return {ok:true, data:objectFromRow_(headers,row)};
    }
  }
  throw new Error('Record non trovato');
}

function remove_(entity, id) {
  assertEntity_(entity);
  const sh = getSheet_(entity);
  const headers = actualHeaders_(sh);
  const values = sh.getDataRange().getValues();
  const idx = headers.indexOf('id');
  for (let i=1;i<values.length;i++) {
    if (String(values[i][idx]) === String(id)) {
      sh.deleteRow(i+1);
      return {ok:true,id};
    }
  }
  throw new Error('Record non trovato');
}

function bulk_(ops) {
  const results = [];
  ops.forEach(op => {
    if (op.action === 'create') results.push(create_(op.entity, op.data || {}));
    else if (op.action === 'update') results.push(update_(op.entity, op.id, op.data || {}));
    else if (op.action === 'delete') results.push(remove_(op.entity, op.id));
  });
  return {ok:true,results};
}

function readAll_(entity) {
  const sh = getSheet_(entity);
  const headers = actualHeaders_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2,1,lastRow-1,headers.length).getValues()
    .map(r => objectFromRow_(headers,r))
    .filter(r => r.id || entity === 'SETTINGS');
}

function actualHeaders_(sh) {
  const lastCol = sh.getLastColumn();
  if (!lastCol) return [];
  return sh.getRange(1,1,1,lastCol).getValues()[0].map(String).filter(Boolean);
}

function objectFromRow_(headers,row) {
  const o = {};
  headers.forEach((h,i) => {
    let v = row[i];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone() || 'Europe/Rome', "yyyy-MM-dd'T'HH:mm:ss");
    o[h] = v;
  });
  return o;
}

function normalizeCell_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function parseBody_(e) {
  if (!e || !e.postData) return e.parameter || {};
  const raw = e.postData.contents || '';
  if ((e.postData.type || '').includes('application/json')) return JSON.parse(raw || '{}');
  if (e.parameter && e.parameter.payload) return JSON.parse(e.parameter.payload);
  return e.parameter || {};
}

function validateToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
  if (!expected) throw new Error('Esegui prima setupDatabase()');
  if (!token || token !== expected) throw new Error('Accesso non autorizzato');
}

function assertEntity_(entity) {
  if (!entity || !SHEETS[entity] || entity === 'SETTINGS') throw new Error('Entità non valida');
}

function getSheet_(entity) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Database non configurato: esegui setupDatabase()');
  const sh = SpreadsheetApp.openById(id).getSheetByName(entity);
  if (!sh) throw new Error('Foglio ' + entity + ' non trovato');
  return sh;
}

function json_(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + '(' + text + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
