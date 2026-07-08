const SUPABASE_URL = 'https://gewgugneceqxwovkstqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = { user:null, workers:[], advances:[], operators:[], tab:'dashboard' };
const $ = (id)=>document.getElementById(id);
const money = n => `${Number(n||0).toLocaleString('ro-RO')} lei`;
const today = ()=>new Date().toLocaleDateString('ro-RO');
const nowISO = ()=>new Date().toISOString();

async function init(){
  const saved = localStorage.getItem('bm_user');
  if(saved){ state.user = JSON.parse(saved); await loadAll(); renderApp(); } else renderLogin();
}
function renderLogin(){
  document.body.innerHTML = `<div class="wrap"><div class="login card"><h1>Brickstone Manager Pro</h1><p class="muted">Login administrator / operator</p><input id="login" placeholder="Email admin sau nume operator" value="piatrata@yandex.com"><input id="pass" type="password" placeholder="Parola" value="1234"><button onclick="doLogin()">Intră</button><p id="err" class="danger"></p><p class="muted">Admin demo: piatrata@yandex.com / 1234<br>Operator demo: Serghei / 1111</p></div></div>`;
}
async function ensureDefaults(){
  const {data} = await sb.from('users_roles').select('*').limit(1);
  if(!data || data.length===0){
    await sb.from('users_roles').insert([
      {email:'piatrata@yandex.com', name:'Admin Brickstone', password:'1234', role:'admin', active:true},
      {email:'serghei', name:'Serghei', password:'1111', role:'operator', active:true}
    ]);
  }
}
async function doLogin(){
  await ensureDefaults();
  const login = $('login').value.trim().toLowerCase();
  const pass = $('pass').value.trim();
  const {data,error}= await sb.from('users_roles').select('*').eq('active',true);
  if(error){ $('err').textContent='Eroare Supabase: '+error.message; return; }
  const u = (data||[]).find(x => String(x.email||'').toLowerCase()===login || String(x.name||'').toLowerCase()===login);
  if(!u || String(u.password)!==pass){ $('err').textContent='Login sau parolă greșită'; return; }
  state.user = u; localStorage.setItem('bm_user', JSON.stringify(u)); await loadAll(); renderApp();
}
function logout(){localStorage.removeItem('bm_user');state.user=null;renderLogin()}
async function loadAll(){
  await ensureDefaults();
  const [w,a,u] = await Promise.all([
    sb.from('workers').select('*').order('created_at',{ascending:false}),
    sb.from('advances').select('*').order('created_at',{ascending:false}),
    sb.from('users_roles').select('*').order('created_at',{ascending:false})
  ]);
  if(w.error) alert('Workers: '+w.error.message);
  if(a.error) alert('Advances: '+a.error.message);
  if(u.error) alert('Users: '+u.error.message);
  state.workers = w.data||[]; state.advances=a.data||[]; state.operators=u.data||[];
}
function renderApp(){
  document.body.innerHTML = `<div class="wrap"><div class="top"><div><h1>Brickstone Manager Pro</h1><div class="muted" style="color:#ddd">Bun venit, ${state.user.name||state.user.email}</div></div><div><span class="badge ${state.user.role==='operator'?'op':''}">${state.user.role==='admin'?'Administrator':'Operator'}</span><button class="btn-gray btn-small" onclick="logout()">Ieșire</button></div></div><div id="main"></div></div>`;
  renderMain();
}
function nav(){
  const isAdmin=state.user.role==='admin';
  return `<div class="tabs"><button onclick="setTab('dashboard')">Dashboard</button><button onclick="setTab('advance')">Acordă avans</button>${isAdmin?`<button onclick="setTab('workers')">Muncitori</button><button onclick="setTab('operators')">Operatori</button><button onclick="setTab('reports')">Rapoarte</button>`:''}</div>`;
}
function setTab(t){state.tab=t;renderMain()}
function renderMain(){
  const isAdmin=state.user.role==='admin';
  let html=nav();
  if(state.tab==='dashboard') html+=dashboard();
  if(state.tab==='advance') html+=advanceForm();
  if(state.tab==='workers' && isAdmin) html+=workersAdmin();
  if(state.tab==='operators' && isAdmin) html+=operatorsAdmin();
  if(state.tab==='reports' && isAdmin) html+=reports();
  $('main').innerHTML=html;
}
function totals(){
  const totalAdv=state.advances.reduce((s,a)=>s+Number(a.amount||0),0);
  const totalSal=state.workers.filter(w=>w.active!==false).reduce((s,w)=>s+Number(w.salary||0),0);
  return {totalAdv,totalSal,rest:totalSal-totalAdv};
}
function dashboard(){const t=totals(); const isAdmin=state.user.role==='admin'; return `<div class="grid"><div class="stat">Muncitori<b>${state.workers.filter(w=>w.active!==false).length}</b></div><div class="stat">Avansuri<b>${state.advances.length}</b></div>${isAdmin?`<div class="stat">Total avansuri<b>${money(t.totalAdv)}</b></div><div class="stat">Rest total<b>${money(t.rest)}</b></div>`:`<div class="stat">Rol<b>Operator</b></div><div class="stat">Acces<b>Limitat</b></div>`}</div><div class="card"><h3>Ultimele avansuri</h3>${advancesTable(isAdmin, state.advances.slice(0,10))}</div>`}
function advanceForm(){return `<div class="card"><h2>Acordă avans</h2><select id="aworker">${state.workers.filter(w=>w.active!==false).map(w=>`<option value="${w.id}">${w.name} ${w.phone?'- '+w.phone:''}</option>`).join('')}</select><input id="aamount" type="number" placeholder="Suma avans lei"><input id="apin" placeholder="PIN muncitor"><textarea id="acomment" placeholder="Comentariu opțional"></textarea><button onclick="addAdvance()">Salvează avans</button><p id="amsg"></p></div>`}
async function addAdvance(){
  const wid=$('aworker').value; const w=state.workers.find(x=>x.id===wid); const amount=Number($('aamount').value||0); const pin=$('apin').value.trim();
  if(!w){$('amsg').textContent='Alege muncitor';return} if(!amount){$('amsg').textContent='Introdu suma';return} if(String(w.pin||'')!==pin){$('amsg').textContent='PIN greșit';return}
  const code='AV-'+String(Date.now()).slice(-6);
  const {error}=await sb.from('advances').insert({worker_id:wid, amount, comment:$('acomment').value, operator_name:state.user.name||state.user.email, code, sms_sent:false});
  if(error){$('amsg').textContent='Eroare: '+error.message;return}
  $('amsg').innerHTML='<span class="ok">Avans salvat online: '+code+'</span>'; await loadAll(); setTimeout(()=>{state.tab='dashboard';renderMain()},800);
}
function workersAdmin(){return `<div class="cols"><div class="card"><h2>Adaugă muncitor</h2><input id="wname" placeholder="Nume muncitor"><input id="wphone" placeholder="Telefon"><input id="wpin" placeholder="PIN"><input id="wsalary" type="number" placeholder="Salariu total lei"><button onclick="addWorker()">Salvează muncitor</button><p id="wmsg"></p></div><div class="card"><h2>Lista muncitori</h2>${workersTable()}</div></div>`}
async function addWorker(){
 const row={name:$('wname').value.trim(),phone:$('wphone').value.trim(),pin:$('wpin').value.trim(),salary:Number($('wsalary').value||0),active:true};
 if(!row.name||!row.pin){$('wmsg').textContent='Nume și PIN obligatoriu';return}
 const {error}=await sb.from('workers').insert(row); if(error){$('wmsg').textContent='Eroare: '+error.message;return} await loadAll(); renderMain();
}
function workersTable(){return `<table><tr><th>Nume</th><th>Telefon</th><th>PIN</th><th>Salariu</th><th>Acțiuni</th></tr>${state.workers.map(w=>`<tr><td>${w.name}${w.active===false?' <span class="pill">inactiv</span>':''}</td><td>${w.phone||''}</td><td>${w.pin||''}</td><td>${money(w.salary)}</td><td class="actions"><button class="btn-small btn-gray" onclick="editWorker('${w.id}')">Editează</button><button class="btn-small" onclick="toggleWorker('${w.id}',${w.active!==false})">${w.active===false?'Activează':'Dezactivează'}</button></td></tr>`).join('')}</table>`}
async function editWorker(id){const w=state.workers.find(x=>x.id===id); const name=prompt('Nume',w.name); if(name===null)return; const phone=prompt('Telefon',w.phone||''); const pin=prompt('PIN',w.pin||''); const salary=prompt('Salariu',w.salary||0); const {error}=await sb.from('workers').update({name,phone,pin,salary:Number(salary||0)}).eq('id',id); if(error)alert(error.message); await loadAll(); renderMain()}
async function toggleWorker(id,active){if(!confirm(active?'Dezactivezi muncitorul?':'Activezi muncitorul?'))return; const {error}=await sb.from('workers').update({active:!active}).eq('id',id); if(error)alert(error.message); await loadAll(); renderMain()}
function operatorsAdmin(){return `<div class="cols"><div class="card"><h2>Adaugă operator</h2><input id="oname" placeholder="Nume operator"><input id="oemail" placeholder="Login / email"><input id="opass" placeholder="Parolă"><select id="orole"><option value="operator">Operator</option><option value="admin">Admin</option></select><button onclick="addOperator()">Salvează operator</button><p id="omsg"></p></div><div class="card"><h2>Operatori</h2>${operatorsTable()}</div></div>`}
async function addOperator(){const row={name:$('oname').value.trim(),email:$('oemail').value.trim().toLowerCase(),password:$('opass').value.trim(),role:$('orole').value,active:true}; if(!row.name||!row.email||!row.password){$('omsg').textContent='Completează tot';return} const {error}=await sb.from('users_roles').insert(row); if(error){$('omsg').textContent='Eroare: '+error.message;return} await loadAll(); renderMain()}
function operatorsTable(){return `<table><tr><th>Nume</th><th>Login</th><th>Rol</th><th>Activ</th><th>Acțiuni</th></tr>${state.operators.map(o=>`<tr><td>${o.name||''}</td><td>${o.email}</td><td>${o.role}</td><td>${o.active!==false?'Da':'Nu'}</td><td class="actions"><button class="btn-small btn-gray" onclick="changePass('${o.id}')">Schimbă parola</button><button class="btn-small" onclick="toggleOperator('${o.id}',${o.active!==false})">${o.active===false?'Activează':'Dezactivează'}</button></td></tr>`).join('')}</table>`}
async function changePass(id){const p=prompt('Parolă nouă'); if(!p)return; const {error}=await sb.from('users_roles').update({password:p}).eq('id',id); if(error)alert(error.message); else alert('Parola schimbată')}
async function toggleOperator(id,active){const {error}=await sb.from('users_roles').update({active:!active}).eq('id',id); if(error)alert(error.message); await loadAll(); renderMain()}
function reports(){const t=totals(); return `<div class="grid"><div class="stat">Total salarii<b>${money(t.totalSal)}</b></div><div class="stat">Total avansuri<b>${money(t.totalAdv)}</b></div><div class="stat">Rest plată<b>${money(t.rest)}</b></div><div class="stat">Avansuri<b>${state.advances.length}</b></div></div><div class="card"><button class="btn-dark" onclick="exportCSV()">Export Excel CSV</button><h2>Raport muncitori</h2>${reportTable()}<h2>Istoric avansuri</h2>${advancesTable(true,state.advances)}</div>`}
function reportTable(){return `<table><tr><th>Muncitor</th><th>Telefon</th><th>Salariu</th><th>Avansuri</th><th>Rest</th></tr>${state.workers.map(w=>{const av=state.advances.filter(a=>a.worker_id===w.id).reduce((s,a)=>s+Number(a.amount||0),0);return `<tr><td>${w.name}</td><td>${w.phone||''}</td><td>${money(w.salary)}</td><td>${money(av)}</td><td>${money(Number(w.salary||0)-av)}</td></tr>`}).join('')}</table>`}
function advancesTable(admin, arr){return `<table><tr><th>Cod</th><th>Muncitor</th>${admin?'<th>Suma</th>':''}<th>Operator</th><th>Data</th><th>Comentariu</th></tr>${arr.map(a=>{const w=state.workers.find(x=>x.id===a.worker_id)||{};return `<tr><td>${a.code||''}</td><td>${w.name||'—'}</td>${admin?`<td>${money(a.amount)}</td>`:''}<td>${a.operator_name||''}</td><td>${new Date(a.created_at).toLocaleString('ro-RO')}</td><td>${a.comment||''}</td></tr>`}).join('')}</table>`}
function exportCSV(){let csv='Muncitor,Telefon,Salariu,Avansuri,Rest\n'; state.workers.forEach(w=>{const av=state.advances.filter(a=>a.worker_id===w.id).reduce((s,a)=>s+Number(a.amount||0),0);csv+=`"${w.name}","${w.phone||''}",${w.salary||0},${av},${Number(w.salary||0)-av}\n`}); const b=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='brickstone_raport.csv'; a.click()}
init();
