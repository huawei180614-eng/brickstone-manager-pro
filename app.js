// Brickstone Manager Pro - Admin/Operator + muncitori + avansuri + SMS demo
// Pentru Supabase completează cheia publishable. Dacă rămâne gol, aplicația salvează local.
const SUPABASE_URL = 'https://gewgugneceqxwovkstqs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = ''; // LIPEȘTE AICI cheia sb_publishable_... din Supabase

const DEFAULT_USERS = [
  { id:'admin-1', username:'piatrata@yandex.com', password:'1234', role:'admin', name:'Admin Brickstone', active:true },
  { id:'op-1', username:'Serghei', password:'1111', role:'operator', name:'Serghei', active:true }
];

let supa = null;
if (SUPABASE_PUBLISHABLE_KEY && window.supabase) {
  supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

let users = JSON.parse(localStorage.getItem('bm_users') || 'null') || DEFAULT_USERS;
let currentUser = JSON.parse(localStorage.getItem('bm_current_user') || 'null');
let workers = JSON.parse(localStorage.getItem('bm_workers') || '[]');
let advances = JSON.parse(localStorage.getItem('bm_advances') || '[]');

const $ = id => document.getElementById(id);
function money(n){return Number(n||0).toLocaleString('ro-RO')+' lei'}
function uid(){return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()))}
function saveLocal(){
  localStorage.setItem('bm_users', JSON.stringify(users));
  localStorage.setItem('bm_workers', JSON.stringify(workers));
  localStorage.setItem('bm_advances', JSON.stringify(advances));
}
function esc(v){return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

async function loadCloud(){
  if(!supa) return;
  try{
    const { data:w } = await supa.from('workers').select('*').order('created_at',{ascending:false});
    const { data:a } = await supa.from('advances').select('*').order('created_at',{ascending:false});
    if(w) workers = w.map(x=>({id:x.id,name:x.name,phone:x.phone,salary:Number(x.salary||0),pin:x.pin,active:x.active!==false}));
    if(a) advances = a.map(x=>({id:x.id,workerId:x.worker_id,amount:Number(x.amount||0),comment:x.comment,operator:x.operator_name,smsStatus:x.sms_sent?'TRIMIS':'PENDING',code:x.code||String(x.id).slice(0,8),createdAt:new Date(x.created_at).toLocaleString('ro-RO')}));
  }catch(e){ console.warn('Supabase load error', e); }
}
async function addWorkerCloud(w){ if(!supa) return; await supa.from('workers').insert({id:w.id,name:w.name,phone:w.phone,salary:w.salary,pin:w.pin,active:w.active}); }
async function addAdvanceCloud(a){ if(!supa) return; await supa.from('advances').insert({id:a.id,worker_id:a.workerId,amount:a.amount,comment:a.comment,operator_name:a.operator,sms_sent:false,code:a.code}); }
async function updateWorkerCloud(w){ if(!supa) return; await supa.from('workers').update({name:w.name,phone:w.phone,salary:w.salary,pin:w.pin,active:w.active}).eq('id',w.id); }

function login(){
  const user=$('loginUser').value.trim(), pass=$('loginPass').value.trim();
  const found=users.find(u=>u.username.toLowerCase()===user.toLowerCase() && u.password===pass && u.active!==false);
  if(!found){alert('Utilizator sau parolă greșită');return}
  currentUser={id:found.id, username:found.username, role:found.role, name:found.name};
  localStorage.setItem('bm_current_user',JSON.stringify(currentUser));
  init();
}
function logout(){localStorage.removeItem('bm_current_user');currentUser=null;render();}

async function addWorker(){
  if(currentUser.role!=='admin'){alert('Doar administratorul poate adăuga muncitori');return}
  const w={id:uid(),name:$('wName').value.trim(),phone:$('wPhone').value.trim(),salary:Number($('wSalary').value||0),pin:$('wPin').value.trim(),active:true};
  if(!w.name){alert('Scrie numele muncitorului');return}
  workers.unshift(w); saveLocal(); await addWorkerCloud(w);
  ['wName','wPhone','wSalary','wPin'].forEach(id=>$(id).value=''); render();
}

function editWorker(id){
  const w=workers.find(x=>x.id===id); if(!w) return;
  const name=prompt('Nume muncitor:', w.name); if(name===null) return;
  const phone=prompt('Telefon:', w.phone||''); if(phone===null) return;
  const pin=prompt('PIN:', w.pin||''); if(pin===null) return;
  const salary=prompt('Salariu / total lei:', w.salary||0); if(salary===null) return;
  w.name=name.trim(); w.phone=phone.trim(); w.pin=pin.trim(); w.salary=Number(salary||0);
  saveLocal(); updateWorkerCloud(w); render();
}
function toggleWorker(id){
  const w=workers.find(x=>x.id===id); if(!w) return;
  w.active=!w.active; saveLocal(); updateWorkerCloud(w); render();
}
function deleteWorker(id){
  const w=workers.find(x=>x.id===id); if(!w) return;
  if(!confirm('Sigur dezactivezi/ștergi muncitorul '+w.name+'? Avansurile rămân în istoric.')) return;
  w.active=false; saveLocal(); updateWorkerCloud(w); render();
}

async function addAdvance(){
  const workerId=$('workerSelect').value, worker=workers.find(w=>w.id==workerId);
  const amount=Number($('aAmount').value||0), pin=$('aPin').value.trim();
  if(!worker){alert('Alege muncitorul');return} if(!amount){alert('Scrie suma');return}
  if(worker.pin && worker.pin!==pin){alert('PIN greșit');return}
  const a={id:uid(),workerId,amount,comment:$('aComment').value.trim(),operator:currentUser.name,smsStatus:'DEMO',code:'AV-'+Date.now().toString().slice(-6),createdAt:new Date().toLocaleString('ro-RO')};
  advances.unshift(a); saveLocal(); await addAdvanceCloud(a); logSms(worker,a);
  ['aAmount','aPin','aComment'].forEach(id=>$(id).value=''); render();
  alert(`Avans salvat.\nSMS DEMO pentru ${worker.phone||'telefon lipsă'}:\nBrickstone: Ai primit avans ${money(amount)}. Cod ${a.code}`);
}
function logSms(worker,a){
  console.log('SMS DEMO', {to:worker.phone,message:`Brickstone: Ai primit avans ${money(a.amount)}. Cod ${a.code}`});
}

function addOperator(){
  const name=$('opName').value.trim(), username=$('opUser').value.trim(), pass=$('opPass').value.trim();
  if(!name || !username || !pass){alert('Completează nume, utilizator și parolă');return}
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){alert('Acest utilizator există deja');return}
  users.push({id:uid(),name,username,password:pass,role:'operator',active:true});
  saveLocal(); ['opName','opUser','opPass'].forEach(id=>$(id).value=''); render();
}
function changeOperatorPass(id){
  const u=users.find(x=>x.id===id); if(!u) return;
  const pass=prompt('Parolă nouă pentru '+u.name+':', u.password||'');
  if(pass===null || !pass.trim()) return;
  u.password=pass.trim(); saveLocal(); render();
}
function toggleOperator(id){
  const u=users.find(x=>x.id===id); if(!u || u.role==='admin') return;
  u.active=!u.active; saveLocal(); render();
}
function deleteOperator(id){
  const u=users.find(x=>x.id===id); if(!u || u.role==='admin') return;
  if(!confirm('Sigur ștergi operatorul '+u.name+'?')) return;
  users=users.filter(x=>x.id!==id); saveLocal(); render();
}

function totalForWorker(id){return advances.filter(a=>a.workerId==id).reduce((s,a)=>s+Number(a.amount||0),0)}
function receipt(id){
  const a=advances.find(x=>x.id===id), w=workers.find(x=>x.id==a.workerId);
  const html=`<h2>BRICKSTONE</h2><h3>Bon avans</h3><p>Muncitor: <b>${esc(w?.name||'')}</b></p><p>Suma: <b>${money(a.amount)}</b></p><p>Data: ${esc(a.createdAt)}</p><p>Operator: ${esc(a.operator)}</p><p>Cod: ${esc(a.code)}</p>`;
  const win=window.open('','_blank'); win.document.write(html); win.print();
}
function exportCSV(){
  let csv='Muncitor,Telefon,Salariu,Avansuri,Rest,Activ\n';
  workers.forEach(w=>{const adv=totalForWorker(w.id); csv+=`"${w.name}","${w.phone||''}",${w.salary||0},${adv},${(w.salary||0)-adv},${w.active?'DA':'NU'}\n`;});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='brickstone_raport.csv'; a.click();
}
function clearDemoData(){
  if(!confirm('Sigur ștergi datele locale demo?')) return;
  workers=[]; advances=[]; saveLocal(); render();
}

function render(){
  $('loginView').classList.toggle('hidden',!!currentUser); $('appView').classList.toggle('hidden',!currentUser); $('logoutBtn').classList.toggle('hidden',!currentUser);
  if(!currentUser) return;
  const isAdmin=currentUser.role==='admin'; $('hello').textContent='Bun venit, '+currentUser.name; $('roleText').textContent=isAdmin?'Administrator':'Operator'; $('storageMode').textContent=supa?'Cloud Supabase activ':'Mod local / Supabase neconfigurat';
  $('adminStats').classList.toggle('hidden',!isAdmin); $('adminReport').classList.toggle('hidden',!isAdmin); $('adminOperators').classList.toggle('hidden',!isAdmin); $('workerCard').classList.toggle('hidden',!isAdmin);
  $('workerSelect').innerHTML='<option value="">Alege muncitor</option>'+workers.filter(w=>w.active!==false).map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('');
  if(isAdmin){
    const totalAdv=advances.reduce((s,a)=>s+a.amount,0), totalSalary=workers.filter(w=>w.active!==false).reduce((s,w)=>s+Number(w.salary||0),0);
    $('statWorkers').textContent=workers.filter(w=>w.active!==false).length; $('statAdvances').textContent=money(totalAdv); $('statRest').textContent=money(totalSalary-totalAdv);
    $('workersTable').innerHTML=workers.map(w=>{const adv=totalForWorker(w.id);return `<tr class="${w.active===false?'inactive':''}"><td>${esc(w.name)}</td><td>${esc(w.phone||'')}</td><td>${money(w.salary)}</td><td>${money(adv)}</td><td>${money((w.salary||0)-adv)}</td><td>${w.active!==false?'Activ':'Inactiv'}</td><td><button class="secondary" onclick="editWorker('${w.id}')">Edit</button> <button class="secondary" onclick="toggleWorker('${w.id}')">${w.active!==false?'Dezactivează':'Activează'}</button></td></tr>`}).join('');
    $('operatorsTable').innerHTML=users.filter(u=>u.role==='operator').map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${u.active!==false?'Activ':'Inactiv'}</td><td><button class="secondary" onclick="changeOperatorPass('${u.id}')">Schimbă parola</button> <button class="secondary" onclick="toggleOperator('${u.id}')">${u.active!==false?'Dezactivează':'Activează'}</button> <button class="danger" onclick="deleteOperator('${u.id}')">Șterge</button></td></tr>`).join('');
  }
  $('advancesTable').innerHTML=advances.map(a=>{const w=workers.find(x=>x.id==a.workerId);return `<tr><td>${esc(a.createdAt)}</td><td>${esc(w?.name||'')}</td><td>${isAdmin?money(a.amount):'Salvat'}</td><td>${esc(a.operator)}</td><td><span class="${a.smsStatus==='DEMO'?'warn':'ok'}">${esc(a.smsStatus)}</span></td><td>${isAdmin?`<button class="secondary" onclick="receipt('${a.id}')">Bon</button>`:''}</td></tr>`}).join('');
}
async function init(){await loadCloud(); render();}

$('loginBtn').onclick=login; $('logoutBtn').onclick=logout; $('addWorkerBtn').onclick=addWorker; $('addAdvanceBtn').onclick=addAdvance; $('exportBtn').onclick=exportCSV;
if($('addOperatorBtn')) $('addOperatorBtn').onclick=addOperator;
if($('clearDemoBtn')) $('clearDemoBtn').onclick=clearDemoData;
init();
