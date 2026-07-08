const SUPABASE_URL = "https://gewgugneceqxwovkstqs.supabase.co";
const SUPABASE_KEY = "sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.getElementById("app");
let sessionUser = JSON.parse(localStorage.getItem("brickstone_user") || "null");
let state = { workers: [], advances: [], users: [], sms: [], tab: "dashboard" };
const lei = n => `${Number(n || 0).toLocaleString("ro-RO")} lei`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const today = () => new Date().toLocaleDateString("ro-RO");
function workerAdvances(id){return state.advances.filter(a=>a.worker_id===id).reduce((s,a)=>s+Number(a.amount||0),0)}
function workerRest(w){return Number(w.salary||0)-workerAdvances(w.id)}
async function loadAll(){
  const [w,a,u,s] = await Promise.all([
    sb.from("workers").select("*").order("created_at",{ascending:false}),
    sb.from("advances").select("*").order("created_at",{ascending:false}),
    sb.from("users_roles").select("*").order("created_at",{ascending:false}),
    sb.from("sms_logs").select("*").order("created_at",{ascending:false})
  ]);
  if(w.error||a.error||u.error||s.error){alert("Eroare Supabase: "+(w.error?.message||a.error?.message||u.error?.message||s.error?.message));return false;}
  state.workers=w.data||[]; state.advances=a.data||[]; state.users=u.data||[]; state.sms=s.data||[]; return true;
}
function loginScreen(){app.innerHTML=`<div class="login"><h1>Brickstone Manager Pro</h1><h2>Autentificare</h2><input id="loginUser" placeholder="Utilizator"><input id="loginPass" type="password" placeholder="Parolă"><button onclick="login()">Intră</button><div class="hint"><b>Admin:</b> piatrata@yandex.com / 1234<br><b>Operator:</b> Serghei / 1111</div></div>`;}
async function login(){
  const email=loginUser.value.trim(), password=loginPass.value.trim();
  const {data,error}=await sb.from("users_roles").select("*").eq("email",email).eq("password",password).maybeSingle();
  if(error||!data||data.active===false){alert("Utilizator sau parolă greșită");return;}
  sessionUser=data; localStorage.setItem("brickstone_user",JSON.stringify(data)); await boot();
}
function logout(){localStorage.removeItem("brickstone_user");sessionUser=null;loginScreen();}
function setTab(t){state.tab=t; render();}
async function boot(){if(!sessionUser){loginScreen();return;} await loadAll(); render();}
function layout(content){
  const isAdmin=sessionUser.role==="admin";
  app.innerHTML=`<div class="wrap"><div class="top"><div><h1>Bun venit, ${isAdmin?"Admin Brickstone":esc(sessionUser.email)}</h1><div class="role">${isAdmin?"Administrator":"Operator"}</div></div><button onclick="logout()">Ieșire</button></div><div class="tabs"><button class="${state.tab==='dashboard'?'active':''}" onclick="setTab('dashboard')">Dashboard</button><button class="${state.tab==='advance'?'active':''}" onclick="setTab('advance')">Acordă avans</button><button class="${state.tab==='history'?'active':''}" onclick="setTab('history')">Istoric</button>${isAdmin?`<button class="${state.tab==='workers'?'active':''}" onclick="setTab('workers')">Muncitori</button><button class="${state.tab==='operators'?'active':''}" onclick="setTab('operators')">Operatori</button><button class="${state.tab==='reports'?'active':''}" onclick="setTab('reports')">Rapoarte</button><button class="${state.tab==='sms'?'active':''}" onclick="setTab('sms')">SMS</button>`:""}</div>${content}</div><div id="printArea" class="print-area"></div>`;
}
function render(){
  if(state.tab==="advance") return layout(advanceView());
  if(state.tab==="history") return layout(historyView());
  if(sessionUser.role==="admin"&&state.tab==="workers") return layout(workersView());
  if(sessionUser.role==="admin"&&state.tab==="operators") return layout(operatorsView());
  if(sessionUser.role==="admin"&&state.tab==="reports") return layout(reportsView());
  if(sessionUser.role==="admin"&&state.tab==="sms") return layout(smsView());
  layout(dashboardView());
}
function dashboardView(){
  const activeWorkers=state.workers.filter(w=>w.active!==false);
  const totalAdv=state.advances.reduce((s,a)=>s+Number(a.amount||0),0);
  const totalSalary=activeWorkers.reduce((s,w)=>s+Number(w.salary||0),0);
  return `<div class="grid"><div class="card stat"><b>Muncitori</b><h2>${activeWorkers.length}</h2></div><div class="card stat"><b>Total avansuri</b><h2>${lei(totalAdv)}</h2></div><div class="card stat"><b>Rest total</b><h2>${lei(totalSalary-totalAdv)}</h2></div><div class="card stat"><b>SMS pregătite</b><h2>${state.sms.length}</h2></div></div>${advanceView()}<div class="card"><h2>Resturi pe muncitori</h2>${workersTable(false)}</div>`;
}
function advanceView(){
  const workers=state.workers.filter(w=>w.active!==false);
  return `<div class="card"><h2>Acordă avans</h2><div class="two"><select id="advWorker">${workers.map(w=>`<option value="${w.id}">${esc(w.name)} — rest ${lei(workerRest(w))}</option>`).join("")}</select><input id="advAmount" type="number" placeholder="Suma avans lei"></div><div class="two"><input id="advPin" placeholder="PIN muncitor"><input id="advComment" placeholder="Comentariu / lucrare"></div><button onclick="addAdvance()">Salvează avans</button></div>`;
}
function historyView(){return `<div class="card"><h2>Istoric avansuri</h2><button class="secondary" onclick="exportCSV()">Export Excel CSV</button><table><thead><tr><th>Data</th><th>Muncitor</th><th>Operator</th><th>Suma</th><th>Comentariu</th><th>SMS</th><th>Bon</th></tr></thead><tbody>${state.advances.map(a=>{const w=state.workers.find(x=>x.id===a.worker_id);return `<tr><td>${esc((a.created_at||'').slice(0,10))}</td><td>${esc(w?.name||'')}</td><td>${esc(a.operator_name||'')}</td><td>${lei(a.amount)}</td><td>${esc(a.comment||'')}</td><td>${a.sms_sent?'<span class="badge ok">da</span>':'<span class="badge warn">nu</span>'}</td><td><button class="light" onclick="printReceipt('${a.id}')">Bon</button></td></tr>`}).join("")}</tbody></table></div>`;}
function workersView(){return `<div class="card"><h2>Adaugă muncitor</h2><div class="two"><input id="wName" placeholder="Nume"><input id="wPhone" placeholder="Telefon +373..."></div><div class="two"><input id="wPin" placeholder="PIN"><input id="wSalary" type="number" placeholder="Salariu total lei"></div><button onclick="addWorker()">Salvează muncitor</button></div><div class="card"><h2>Muncitori</h2>${workersTable(true)}</div>`;}
function workersTable(actions){const workers=state.workers.filter(w=>w.active!==false);return `<table><thead><tr><th>Nume</th><th>Telefon</th><th>Salariu</th><th>Avansuri</th><th>Rest</th>${actions?'<th>Acțiuni</th>':''}</tr></thead><tbody>${workers.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.phone||'')}</td><td>${lei(w.salary)}</td><td>${lei(workerAdvances(w.id))}</td><td><b>${lei(workerRest(w))}</b></td>${actions?`<td><button class="light" onclick="editWorker('${w.id}')">Modifică</button><button class="warn" onclick="deleteWorker('${w.id}')">Dezactivează</button></td>`:''}</tr>`).join("")}</tbody></table>`;}
function operatorsView(){return `<div class="card"><h2>Adaugă operator</h2><div class="two"><input id="opName" placeholder="Nume operator"><input id="opPass" placeholder="Parolă"></div><button onclick="addOperator()">Salvează operator</button></div><div class="card"><h2>Operatori</h2>${state.users.filter(u=>u.role==='operator').map(u=>`<div class="row small"><b>${esc(u.email)}</b><span>${u.active===false?'<span class="badge warn">dezactivat</span>':'<span class="badge ok">activ</span>'}</span><button class="light" onclick="changePassword('${u.id}')">Schimbă parola</button><button class="warn" onclick="deleteOperator('${u.id}')">Dezactivează</button></div>`).join("")}</div>`;}
function reportsView(){return `<div class="card"><h2>Rapoarte</h2><button onclick="exportCSV()">Export Excel CSV</button><button class="secondary" onclick="window.print()">Print / PDF</button><p>Total avansuri: <b>${lei(state.advances.reduce((s,a)=>s+Number(a.amount||0),0))}</b></p>${workersTable(false)}</div>`;}
function smsView(){return `<div class="card"><h2>SMS pregătite</h2><p>SMS real se conectează prin provider SMS. Acum aplicația salvează mesajele în jurnal.</p><table><thead><tr><th>Data</th><th>Telefon</th><th>Mesaj</th><th>Status</th></tr></thead><tbody>${state.sms.map(s=>`<tr><td>${esc((s.created_at||'').slice(0,10))}</td><td>${esc(s.phone||'')}</td><td>${esc(s.message||'')}</td><td>${esc(s.status||'pending')}</td></tr>`).join("")}</tbody></table></div>`;}
async function addWorker(){await sb.from("workers").insert({name:wName.value,phone:wPhone.value,pin:wPin.value,salary:Number(wSalary.value||0),active:true});await boot();}
async function editWorker(id){const w=state.workers.find(x=>x.id===id);const name=prompt('Nume:',w.name);if(!name)return;const phone=prompt('Telefon:',w.phone||'');const salary=Number(prompt('Salariu:',w.salary||0)||0);await sb.from('workers').update({name,phone,salary}).eq('id',id);await boot();}
async function deleteWorker(id){if(!confirm('Dezactivezi muncitorul?'))return;await sb.from('workers').update({active:false}).eq('id',id);await boot();}
async function addOperator(){if(!opName.value||!opPass.value){alert('Completează operator și parolă');return;}await sb.from('users_roles').insert({email:opName.value,password:opPass.value,role:'operator',active:true});await boot();}
async function changePassword(id){const p=prompt('Parola nouă:');if(!p)return;await sb.from('users_roles').update({password:p}).eq('id',id);alert('Parola schimbată');}
async function deleteOperator(id){if(!confirm('Dezactivezi operatorul?'))return;await sb.from('users_roles').update({active:false}).eq('id',id);await boot();}
async function addAdvance(){const w=state.workers.find(x=>x.id===advWorker.value);if(!w)return;if(w.pin&&advPin.value.trim()!==String(w.pin)){alert('PIN greșit');return;}const amount=Number(advAmount.value||0);if(!amount){alert('Introdu suma');return;}const msg=`Brickstone: ${w.name}, avans ${amount} lei. Data ${today()}. Rest ${lei(workerRest(w)-amount)}.`;const {data,error}=await sb.from('advances').insert({worker_id:w.id,amount,comment:advComment.value,operator_name:sessionUser.email,code:'AV-'+Date.now(),sms_sent:false}).select().single();if(error){alert(error.message);return;}await sb.from('sms_logs').insert({advance_id:data.id,phone:w.phone||'',message:msg,status:'pending'});alert('Avans salvat. SMS pregătit în jurnal.');await boot();state.tab='history';render();}
function printReceipt(id){const a=state.advances.find(x=>x.id===id),w=state.workers.find(x=>x.id===a.worker_id);printArea.innerHTML=`<h3>BRICKSTONE</h3><p>Bon avans</p><hr><p>Data: ${today()}</p><p>Muncitor: ${esc(w?.name||'')}</p><p>Suma: ${lei(a.amount)}</p><p>Operator: ${esc(a.operator_name||'')}</p><p>Comentariu: ${esc(a.comment||'')}</p><hr><p>Semnătura: __________</p>`;window.print();}
function exportCSV(){let rows=[['Data','Muncitor','Telefon','Operator','Suma','Comentariu']];state.advances.forEach(a=>{const w=state.workers.find(x=>x.id===a.worker_id);rows.push([(a.created_at||'').slice(0,10),w?.name||'',w?.phone||'',a.operator_name||'',a.amount||0,a.comment||'']);});const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='brickstone_raport_avansuri.csv';link.click();URL.revokeObjectURL(url);}
boot();
