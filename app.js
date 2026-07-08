const SUPABASE_URL = 'https://gewgugneceqxwovkstqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds';
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = JSON.parse(localStorage.getItem('bmp_user') || 'null');
let workers = [];
let advances = [];
let operators = [];
let online = true;

const fallbackOperators = [
  { id:'admin', email:'piatrata@yandex.com', name:'Admin Brickstone', password:'1234', role:'admin', active:true },
  { id:'serghei', email:'Serghei', name:'Serghei', password:'1111', role:'operator', active:true }
];

const $ = id => document.getElementById(id);
function money(n){ return `${Number(n||0).toLocaleString('ro-RO')} lei`; }
function uid(){ return Date.now().toString() + Math.random().toString(16).slice(2); }
function avCode(){ return 'AV-' + String((advances.length||0)+1).padStart(6,'0'); }

async function seedOperators(){
  try{
    const { data, error } = await supa.from('users_roles').select('*');
    if(error) throw error;
    if(!data || data.length === 0){
      await supa.from('users_roles').insert([
        {email:'piatrata@yandex.com', name:'Admin Brickstone', password:'1234', role:'admin', active:true},
        {email:'Serghei', name:'Serghei', password:'1111', role:'operator', active:true}
      ]);
    }
  }catch(e){ online=false; console.warn(e); }
}

async function loadData(){
  online = true;
  try{
    await seedOperators();
    const [opRes, wRes, aRes] = await Promise.all([
      supa.from('users_roles').select('*').order('created_at', {ascending:true}),
      supa.from('workers').select('*').order('created_at', {ascending:false}),
      supa.from('advances').select('*').order('created_at', {ascending:false})
    ]);
    if(opRes.error || wRes.error || aRes.error) throw (opRes.error || wRes.error || aRes.error);
    operators = opRes.data || [];
    workers = wRes.data || [];
    advances = aRes.data || [];
    localStorage.setItem('bmp_workers_cache', JSON.stringify(workers));
    localStorage.setItem('bmp_advances_cache', JSON.stringify(advances));
    localStorage.setItem('bmp_operators_cache', JSON.stringify(operators));
  }catch(e){
    online = false;
    operators = JSON.parse(localStorage.getItem('bmp_operators_cache') || 'null') || fallbackOperators;
    workers = JSON.parse(localStorage.getItem('bmp_workers_cache') || '[]');
    advances = JSON.parse(localStorage.getItem('bmp_advances_cache') || '[]');
    console.error('Supabase error:', e.message || e);
  }
}

async function login(){
  await loadData();
  const user = $('loginUser').value.trim();
  const pass = $('loginPass').value.trim();
  const found = operators.find(o => String(o.email).toLowerCase() === user.toLowerCase() && String(o.password) === pass && o.active !== false);
  if(!found){ alert('Utilizator sau parolă greșită'); return; }
  currentUser = {id:found.id,email:found.email,name:found.name||found.email,role:found.role};
  localStorage.setItem('bmp_user', JSON.stringify(currentUser));
  render();
}
function logout(){ localStorage.removeItem('bmp_user'); currentUser=null; render(); }

async function addOperator(){
  const name=$('opName').value.trim(); const password=$('opPass').value.trim();
  if(!name || !password) return alert('Completează nume și parolă');
  const row={email:name,name,password,role:'operator',active:true};
  const {error}=await supa.from('users_roles').insert(row);
  if(error) return alert('Eroare operator: '+error.message);
  $('opName').value=''; $('opPass').value=''; await loadData(); render();
}
async function changeOperatorPass(id){
  const pass=prompt('Parola nouă pentru operator:'); if(!pass) return;
  const {error}=await supa.from('users_roles').update({password:pass}).eq('id',id);
  if(error) return alert(error.message); await loadData(); render();
}
async function toggleOperator(id, active){
  const {error}=await supa.from('users_roles').update({active:!active}).eq('id',id);
  if(error) return alert(error.message); await loadData(); render();
}

async function addWorker(){
  const name=$('wName').value.trim(); if(!name) return alert('Scrie numele muncitorului');
  const row={name,phone:$('wPhone').value.trim(),salary:Number($('wSalary').value||0),pin:$('wPin').value.trim(),active:true};
  const {error}=await supa.from('workers').insert(row);
  if(error) return alert('Eroare muncitor: '+error.message);
  ['wName','wPhone','wSalary','wPin'].forEach(id=>$(id).value=''); await loadData(); render();
}
async function editWorker(id){
  const w=workers.find(x=>x.id===id); if(!w) return;
  const name=prompt('Nume:', w.name); if(!name) return;
  const phone=prompt('Telefon:', w.phone||'') || '';
  const salary=Number(prompt('Salariu/calcul lei:', w.salary||0) || 0);
  const pin=prompt('PIN:', w.pin||'') || '';
  const {error}=await supa.from('workers').update({name,phone,salary,pin}).eq('id',id);
  if(error) return alert(error.message); await loadData(); render();
}
async function deleteWorker(id){
  if(!confirm('Sigur dezactivezi muncitorul?')) return;
  const {error}=await supa.from('workers').update({active:false}).eq('id',id);
  if(error) return alert(error.message); await loadData(); render();
}
async function restoreWorker(id){
  const {error}=await supa.from('workers').update({active:true}).eq('id',id);
  if(error) return alert(error.message); await loadData(); render();
}

async function addAdvance(){
  const worker_id=$('workerSelect').value; const amount=Number($('advanceAmount').value||0);
  const worker=workers.find(w=>w.id===worker_id);
  if(!worker) return alert('Alege muncitorul');
  if(!amount) return alert('Scrie suma');
  const pin=$('advancePin').value.trim();
  if(worker.pin && pin !== worker.pin) return alert('PIN greșit');
  const row={worker_id,amount,comment:$('advanceComment').value.trim(),operator_name:currentUser.name,code:avCode(),sms_sent:false};
  const {error}=await supa.from('advances').insert(row);
  if(error) return alert('Eroare avans: '+error.message);
  $('advanceAmount').value=''; $('advancePin').value=''; $('advanceComment').value=''; await loadData(); render(); alert('Avans salvat online.');
}
function totalForWorker(id){ return advances.filter(a=>a.worker_id===id).reduce((s,a)=>s+Number(a.amount||0),0); }

function render(){
  $('loginView').classList.toggle('hidden', !!currentUser); $('appView').classList.toggle('hidden', !currentUser); $('logoutBtn').classList.toggle('hidden', !currentUser);
  if(!currentUser) return;
  const isAdmin=currentUser.role==='admin';
  $('welcome').innerText='Bun venit, '+currentUser.name;
  $('roleBadge').textContent=isAdmin?'Administrator':'Operator'; $('roleBadge').className='badge '+(isAdmin?'admin':'operator');
  $('syncStatus').textContent=online?' • online Supabase':' • offline/cache';
  document.querySelectorAll('.admin-only').forEach(e=>e.classList.toggle('hidden',!isAdmin)); $('adminStats').classList.toggle('hidden',!isAdmin);
  const activeWorkers=workers.filter(w=>w.active!==false);
  $('workerSelect').innerHTML='<option value="">Alege muncitor</option>'+activeWorkers.map(w=>`<option value="${w.id}">${w.name}</option>`).join('');
  if(isAdmin){
    const totalAdv=advances.reduce((s,a)=>s+Number(a.amount||0),0); const totalSalary=workers.filter(w=>w.active!==false).reduce((s,w)=>s+Number(w.salary||0),0);
    $('statWorkers').innerText=activeWorkers.length; $('statAdvances').innerText=money(totalAdv); $('statRest').innerText=money(totalSalary-totalAdv);
    $('operatorsTable').innerHTML=operators.map(o=>`<tr><td>${o.name||o.email}</td><td>${o.role==='admin'?'—':'••••'}</td><td>${o.active===false?'Inactiv':'Activ'}</td><td><div class="actions">${o.role==='operator'?`<button class="btn light" onclick="changeOperatorPass('${o.id}')">Parolă</button><button class="${o.active===false?'ok':'danger'}" onclick="toggleOperator('${o.id}',${o.active!==false})">${o.active===false?'Activează':'Dezactivează'}</button>`:'Admin'}</div></td></tr>`).join('');
    $('workersTable').innerHTML=workers.map(w=>`<tr><td>${w.name}</td><td>${w.phone||''}</td><td>${money(w.salary)}</td><td>${w.pin||''}</td><td>${w.active===false?'Inactiv':'Activ'}</td><td><div class="actions"><button class="btn light" onclick="editWorker('${w.id}')">Editează</button>${w.active===false?`<button class="ok" onclick="restoreWorker('${w.id}')">Activează</button>`:`<button class="danger" onclick="deleteWorker('${w.id}')">Șterge</button>`}</div></td></tr>`).join('');
    renderReport();
  }
  const workerName=id=>(workers.find(w=>w.id===id)||{}).name||'';
  $('advancesTable').innerHTML=advances.map(a=>`<tr><td>${a.code||''}</td><td>${new Date(a.created_at||Date.now()).toLocaleString('ro-RO')}</td><td>${workerName(a.worker_id)}</td><td>${isAdmin?money(a.amount):'Salvat'}</td><td>${a.operator_name||''}</td><td>${a.comment||''}</td></tr>`).join('');
}
function renderReport(){
  const q=($('searchBox').value||'').toLowerCase();
  $('reportTable').innerHTML=workers.filter(w=>(w.name||'').toLowerCase().includes(q)).map(w=>{const adv=totalForWorker(w.id);return `<tr><td>${w.name}</td><td>${w.phone||''}</td><td>${money(w.salary)}</td><td>${money(adv)}</td><td>${money(Number(w.salary||0)-adv)}</td></tr>`}).join('');
}
function exportCSV(){
  let csv='Muncitor,Telefon,Salariu,Avansuri,Rest\n';
  workers.forEach(w=>{const adv=totalForWorker(w.id);csv+=`${w.name},${w.phone||''},${w.salary||0},${adv},${Number(w.salary||0)-adv}\n`;});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='brickstone_raport.csv'; a.click();
}

$('loginBtn').onclick=login; $('logoutBtn').onclick=logout; $('addOperatorBtn').onclick=addOperator; $('addWorkerBtn').onclick=addWorker; $('addAdvanceBtn').onclick=addAdvance; $('exportBtn').onclick=exportCSV; $('searchBox').oninput=renderReport;
(async()=>{ await loadData(); render(); })();
