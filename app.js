const SUPABASE_URL="https://gewgugneceqxwovkstqs.supabase.co";
const SUPABASE_KEY="sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds";
const TELEGRAM_BOT_TOKEN = "8728003141:AAEwhVI0488DjKV4booqeQSWhL5godM2ne4";

async function sendTelegram(chatId, text) {
  if (!chatId) return false;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chat_id: chatId, text})
  });
  return r.ok;
}
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const app=document.getElementById('app');
let sessionUser=JSON.parse(localStorage.getItem('brickstone_user')||'null');
let state={workers:[],advances:[],users:[],sms:[],tab:'dashboard',q:'',from:'',to:''};
const lei=n=>`${Number(n||0).toLocaleString('ro-RO')} lei`;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nowRO=()=>new Date().toLocaleString('ro-RO');
const dateISO=()=>new Date().toISOString().slice(0,10);
function isAdmin(){return sessionUser?.role==='admin'}
function workerAdvances(id){return state.advances.filter(a=>a.worker_id===id).reduce((s,a)=>s+Number(a.amount||0),0)}
function workerRest(w){return Number(w.salary||0)-workerAdvances(w.id)}
function activeWorkers(){return state.workers.filter(w=>w.active!==false)}
async function loadAll(){
 const [w,a,u,s]=await Promise.all([
  sb.from('workers').select('*').order('created_at',{ascending:false}),
  sb.from('advances').select('*').order('created_at',{ascending:false}),
  sb.from('users_roles').select('*').order('created_at',{ascending:false}),
  sb.from('sms_logs').select('*').order('created_at',{ascending:false})
 ]);
 const err=w.error||a.error||u.error||s.error; if(err){alert('Eroare Supabase: '+err.message);return false}
 state.workers=w.data||[];state.advances=a.data||[];state.users=u.data||[];state.sms=s.data||[];return true
}
function loginScreen(){app.innerHTML=`<div class="login"><div class="brand">BRICKSTONE</div><div class="sub">Manager Pro 4.0</div><h2>Autentificare</h2><input id="loginUser" placeholder="Utilizator"><input id="loginPass" type="password" placeholder="Parolă"><button onclick="login()">Intră</button><div class="hint"><b>Admin:</b> piatrata@yandex.com / 1234<br><b>Operator:</b> Serghei / 1111</div></div>`}
async function login(){const email=loginUser.value.trim(),password=loginPass.value.trim();const {data,error}=await sb.from('users_roles').select('*').eq('email',email).eq('password',password).maybeSingle();if(error||!data||data.active===false){alert('Utilizator sau parolă greșită');return}sessionUser=data;localStorage.setItem('brickstone_user',JSON.stringify(data));await boot()}
function logout(){localStorage.removeItem('brickstone_user');sessionUser=null;loginScreen()}
function setTab(t){state.tab=t;render()}
async function boot(){if(!sessionUser){loginScreen();return}await loadAll();render()}
function tabs(){return `<div class="tabs no-print"><button class="${state.tab==='dashboard'?'active':''}" onclick="setTab('dashboard')">Dashboard</button><button class="${state.tab==='advance'?'active':''}" onclick="setTab('advance')">Acordă avans</button><button class="${state.tab==='history'?'active':''}" onclick="setTab('history')">Istoric</button>${isAdmin()?`<button class="${state.tab==='workers'?'active':''}" onclick="setTab('workers')">Muncitori</button><button class="${state.tab==='operators'?'active':''}" onclick="setTab('operators')">Operatori</button><button class="${state.tab==='reports'?'active':''}" onclick="setTab('reports')">Rapoarte</button><button class="${state.tab==='email'?'active':''}" onclick="setTab('email')">E-mail</button>`:''}</div>`}
function layout(content){app.innerHTML=`<div class="wrap"><div class="top no-print"><div><h1>Brickstone Manager Pro 4.0</h1><div class="role">${isAdmin()?'Administrator':'Operator'}: ${esc(sessionUser.email)}</div></div><button class="light" onclick="logout()">Ieșire</button></div>${tabs()}${content}</div><div id="printArea"></div>`}
function render(){if(state.tab==='advance')return layout(advanceView());if(state.tab==='history')return layout(historyView());if(isAdmin()&&state.tab==='workers')return layout(workersView());if(isAdmin()&&state.tab==='operators')return layout(operatorsView());if(isAdmin()&&state.tab==='reports')return layout(reportsView());if(isAdmin()&&state.tab==='email')return layout(emailView());layout(dashboardView())}
function dashboardView(){const workers=activeWorkers();const totalAdv=state.advances.reduce((s,a)=>s+Number(a.amount||0),0);const totalSalary=workers.reduce((s,w)=>s+Number(w.salary||0),0);if(!isAdmin())return `<div class="card"><h2>Acordă avans</h2>${advanceForm()}</div><div class="card"><h2>Avansurile introduse de tine</h2>${historyTable(state.advances.filter(a=>a.operator_name===sessionUser.email),false)}</div>`;return `<div class="grid"><div class="card stat"><b>Muncitori activi</b><h2>${workers.length}</h2></div><div class="card stat"><b>Total salarii</b><h2>${lei(totalSalary)}</h2></div><div class="card stat"><b>Total avansuri</b><h2>${lei(totalAdv)}</h2></div><div class="card stat"><b>Rest total</b><h2>${lei(totalSalary-totalAdv)}</h2></div></div><div class="card"><h2>Avans rapid</h2>${advanceForm()}</div><div class="card"><h2>Resturi muncitori</h2>${workersTable(false)}</div>`}
function advanceForm(){const workers=activeWorkers();return `<div class="two"><select id="advWorker">${workers.map(w=>`<option value="${w.id}">${esc(w.name)}${isAdmin()?` — rest ${lei(workerRest(w))}`:''}</option>`).join('')}</select><input id="advAmount" type="number" placeholder="Suma avans lei"></div><div class="two"><input id="advPin" placeholder="PIN muncitor"><input id="advComment" placeholder="Comentariu"></div><button onclick="addAdvance()">Salvează avans + pregătește e-mail</button>`}
function advanceView(){return `<div class="card"><h2>Acordă avans</h2>${advanceForm()}</div>`}
function filterAdvances(list){return list.filter(a=>{const w=state.workers.find(x=>x.id===a.worker_id);const q=(state.q||'').toLowerCase();const d=(a.created_at||'').slice(0,10);return (!q||String(w?.name||'').toLowerCase().includes(q)||String(a.operator_name||'').toLowerCase().includes(q))&&(!state.from||d>=state.from)&&(!state.to||d<=state.to)})}
function historyView(){let list=isAdmin()?state.advances:state.advances.filter(a=>a.operator_name===sessionUser.email);list=filterAdvances(list);return `<div class="card"><h2>Istoric avansuri</h2><div class="toolbar no-print"><input placeholder="Caută muncitor/operator" onchange="state.q=this.value;render()"><input type="date" onchange="state.from=this.value;render()"><input type="date" onchange="state.to=this.value;render()">${isAdmin()?'<button class="secondary" onclick="exportCSV()">Export Excel CSV</button><button class="light" onclick="window.print()">PDF / Print</button>':''}</div>${historyTable(list,isAdmin())}</div>`}
function historyTable(list,showMoney=true){return `<table><thead><tr><th>Data</th><th>Muncitor</th><th>Operator</th><th>${showMoney?'Suma':'Status'}</th><th>Comentariu</th><th>E-mail</th></tr></thead><tbody>${list.map(a=>{const w=state.workers.find(x=>x.id===a.worker_id);return `<tr><td>${esc((a.created_at||'').slice(0,16).replace('T',' '))}</td><td>${esc(w?.name||'')}</td><td>${esc(a.operator_name||'')}</td><td>${showMoney?lei(a.amount):'salvat'}</td><td>${esc(a.comment||'')}</td><td>${a.sms_sent?'<span class="badge ok">pregătit</span>':'<span class="badge warn">nu</span>'}</td></tr>`}).join('')}</tbody></table>`}
function workersView(){return `<div class="card"><h2>Adaugă muncitor</h2><div class="two"><input id="wName" placeholder="Nume"><input id="wPhone" placeholder="Telefon"></div><div class="two"><input id="wEmail" placeholder="E-mail muncitor"><input id="wFunction" placeholder="Funcție"></div><div class="two"><input id="wPin" placeholder="PIN"><input id="wSalary" type="number" placeholder="Salariu lei"></div><button onclick="addWorker()">Salvează muncitor</button></div><div class="card"><h2>Muncitori</h2><input placeholder="Caută muncitor" oninput="state.q=this.value;render()">${workersTable(true)}</div>`}
function workersTable(actions){let workers=activeWorkers();const q=(state.q||'').toLowerCase();if(q)workers=workers.filter(w=>String(w.name).toLowerCase().includes(q)||String(w.phone||'').includes(q));return `<table><thead><tr><th>Nume</th><th>Telefon</th><th>E-mail</th><th>Funcție</th>${isAdmin()?'<th>Salariu</th><th>Avansuri</th><th>Rest</th>':''}${actions?'<th>Acțiuni</th>':''}</tr></thead><tbody>${workers.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.phone||'')}</td><td>${esc(w.email||'')}</td><td>${esc(w.function||'')}</td>${isAdmin()?`<td>${lei(w.salary)}</td><td>${lei(workerAdvances(w.id))}</td><td><b>${lei(workerRest(w))}</b></td>`:''}${actions?`<td><button class="light" onclick="editWorker('${w.id}')">Modifică</button><button class="warn" onclick="deleteWorker('${w.id}')">Dezactivează</button></td>`:''}</tr>`).join('')}</tbody></table>`}
function operatorsView(){return `<div class="card"><h2>Adaugă operator</h2><div class="two"><input id="opName" placeholder="Nume operator"><input id="opPass" placeholder="Parolă"></div><button onclick="addOperator()">Salvează operator</button></div><div class="card"><h2>Operatori</h2>${state.users.filter(u=>u.role==='operator').map(u=>`<div class="row"><div><b>${esc(u.email)}</b><div class="small">${u.active===false?'dezactivat':'activ'}</div></div><div class="actions"><button class="light" onclick="changePassword('${u.id}')">Schimbă parola</button><button class="warn" onclick="deleteOperator('${u.id}')">Dezactivează</button></div></div>`).join('')}</div>`}
function reportsView(){return `<div class="card"><h2>Rapoarte</h2><button onclick="exportCSV()">Export Excel CSV</button><button class="light" onclick="window.print()">PDF / Print</button>${workersTable(false)}</div>`}
function emailView(){return `<div class="card"><h2>Jurnal e-mail</h2><p class="small">E-mailul se deschide automat prin programul de mail. Jurnalul confirmă că mesajul a fost pregătit.</p><table><thead><tr><th>Data</th><th>Destinatar</th><th>Mesaj</th><th>Status</th></tr></thead><tbody>${state.sms.map(s=>`<tr><td>${esc((s.created_at||'').slice(0,16).replace('T',' '))}</td><td>${esc(s.phone||'')}</td><td>${esc(s.message||'')}</td><td>${esc(s.status||'pending')}</td></tr>`).join('')}</tbody></table></div>`}
async function addWorker(){if(!wName.value.trim()){alert('Scrie numele');return}await sb.from('workers').insert({name:wName.value.trim(),phone:wPhone.value,email:wEmail.value,function:wFunction.value,pin:wPin.value,salary:Number(wSalary.value||0),active:true});await boot()}
async function editWorker(id){const w=state.workers.find(x=>x.id===id);const name=prompt('Nume:',w.name);if(!name)return;const phone=prompt('Telefon:',w.phone||'');const email=prompt('E-mail:',w.email||'');const func=prompt('Funcție:',w.function||'');const pin=prompt('PIN:',w.pin||'');const salary=Number(prompt('Salariu:',w.salary||0)||0);await sb.from('workers').update({name,phone,email,function:func,pin,salary}).eq('id',id);await boot()}
async function deleteWorker(id){if(!confirm('Dezactivezi muncitorul?'))return;await sb.from('workers').update({active:false}).eq('id',id);await boot()}
async function addOperator(){if(!opName.value||!opPass.value){alert('Completează operator și parolă');return}await sb.from('users_roles').insert({email:opName.value,password:opPass.value,role:'operator',active:true});await boot()}
async function changePassword(id){const p=prompt('Parola nouă:');if(!p)return;await sb.from('users_roles').update({password:p}).eq('id',id);alert('Parola schimbată')}
async function deleteOperator(id){if(!confirm('Dezactivezi operatorul?'))return;await sb.from('users_roles').update({active:false}).eq('id',id);await boot()}
async function addAdvance(){
  const w=state.workers.find(x=>x.id==advWorker.value);
  if(!w){alert("Alege muncitor");return}

  const amount=Number(advAmount.value||0);
  if(!amount){alert("Scrie suma avansului");return}

  await sb.from("advances").insert({
    worker_id:w.id,
    amount:amount,
    comment:advComment.value,
    operator_name:sessionUser.email,
    code:"AV-"+Date.now()
  });

  const rest=workerRest(w)-amount;
  const msg=`💰 Brickstone Avans\nBună, ${w.name}.\nAi primit avans: ${amount} lei.\nRest salariu: ${rest} lei.\nData: ${new Date().toLocaleString("ro-RO")}`;

  await sendTelegram(w.telegram_id,msg);

  alert("Avans salvat și mesaj Telegram trimis");
  await boot();
}
function exportCSV(){let list=isAdmin()?state.advances:state.advances.filter(a=>a.operator_name===sessionUser.email);let rows=[['Data','Muncitor','Telefon','Email','Operator','Suma','Comentariu']];list.forEach(a=>{const w=state.workers.find(x=>x.id===a.worker_id);rows.push([(a.created_at||'').slice(0,10),w?.name||'',w?.phone||'',w?.email||'',a.operator_name||'',a.amount||0,a.comment||''])});const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='brickstone_raport_avansuri.csv';link.click();URL.revokeObjectURL(url)}
boot();
