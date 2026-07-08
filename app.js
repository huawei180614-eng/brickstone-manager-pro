const SUPABASE_URL = "https://gewgugneceqxwovkstqs.supabase.co";
const SUPABASE_KEY = "sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const app = document.getElementById('app');
let user = JSON.parse(localStorage.getItem('brickstone_user') || 'null');
let state = { workers: [], advances: [], users: [], sms: [], tab: 'dashboard', q: '', from: '', to: '' };
const lei = n => `${Number(n || 0).toLocaleString('ro-RO')} lei`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today = () => new Date().toLocaleDateString('ro-RO');
const now = () => new Date().toLocaleString('ro-RO');
function activeWorkers(){ return state.workers.filter(w => w.active !== false); }
function workerAdvances(id){ return state.advances.filter(a => a.worker_id === id).reduce((s,a)=>s+Number(a.amount||0),0); }
function workerRest(w){ return Number(w.salary||0) - workerAdvances(w.id); }
function workerName(id){ return state.workers.find(w=>w.id===id)?.name || ''; }
function filteredAdvances(){
  return state.advances.filter(a => {
    const w = state.workers.find(x=>x.id===a.worker_id);
    const q = state.q.toLowerCase();
    const date = (a.created_at || '').slice(0,10);
    return (!q || (w?.name||'').toLowerCase().includes(q) || (a.operator_name||'').toLowerCase().includes(q) || (a.comment||'').toLowerCase().includes(q)) && (!state.from || date >= state.from) && (!state.to || date <= state.to);
  });
}
async function loadAll(){
  const [w,a,u,s] = await Promise.all([
    sb.from('workers').select('*').order('created_at',{ascending:false}),
    sb.from('advances').select('*').order('created_at',{ascending:false}),
    sb.from('users_roles').select('*').order('created_at',{ascending:false}),
    sb.from('sms_logs').select('*').order('created_at',{ascending:false})
  ]);
  const err = w.error || a.error || u.error || s.error;
  if(err){ alert('Eroare Supabase: ' + err.message); return false; }
  state.workers=w.data||[]; state.advances=a.data||[]; state.users=u.data||[]; state.sms=s.data||[]; return true;
}
function loginScreen(){
  app.innerHTML = `<div class="login"><h1>BRICKSTONE</h1><h2>Manager Pro</h2><input id="loginUser" placeholder="Utilizator"><input id="loginPass" type="password" placeholder="Parolă"><button onclick="login()">Intră</button><div class="hint"><b>Admin:</b> piatrata@yandex.com / 1234<br><b>Operator:</b> Serghei / 1111</div></div>`;
}
async function login(){
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const {data,error} = await sb.from('users_roles').select('*').eq('email',email).eq('password',password).maybeSingle();
  if(error || !data || data.active === false){ alert('Utilizator sau parolă greșită'); return; }
  user = data; localStorage.setItem('brickstone_user', JSON.stringify(data)); await boot();
}
function logout(){ localStorage.removeItem('brickstone_user'); user=null; loginScreen(); }
function setTab(t){ state.tab=t; render(); }
async function boot(){ if(!user){ loginScreen(); return; } await loadAll(); render(); }
function layout(content){
  const isAdmin = user.role === 'admin';
  app.innerHTML = `<div class="top no-print"><div><div class="brand">BRICKSTONE Manager Pro</div><div class="role">${isAdmin?'Administrator':'Operator'}: ${esc(user.email)}</div></div><button class="secondary" onclick="logout()">Ieșire</button></div><div class="wrap no-print"><div class="tabs"><button class="${state.tab==='dashboard'?'active':''}" onclick="setTab('dashboard')">Dashboard</button><button class="${state.tab==='advance'?'active':''}" onclick="setTab('advance')">Acordă avans</button><button class="${state.tab==='history'?'active':''}" onclick="setTab('history')">Istoric</button>${isAdmin?`<button class="${state.tab==='workers'?'active':''}" onclick="setTab('workers')">Muncitori</button><button class="${state.tab==='operators'?'active':''}" onclick="setTab('operators')">Operatori</button><button class="${state.tab==='reports'?'active':''}" onclick="setTab('reports')">Rapoarte</button><button class="${state.tab==='sms'?'active':''}" onclick="setTab('sms')">Email/SMS</button>`:''}</div>${content}</div><div id="printArea" class="print-area"></div>`;
}
function render(){
  if(state.tab==='advance') return layout(advanceView());
  if(state.tab==='history') return layout(historyView());
  if(user.role==='admin' && state.tab==='workers') return layout(workersView());
  if(user.role==='admin' && state.tab==='operators') return layout(operatorsView());
  if(user.role==='admin' && state.tab==='reports') return layout(reportsView());
  if(user.role==='admin' && state.tab==='sms') return layout(smsView());
  return layout(dashboardView());
}
function dashboardView(){
  const aw = activeWorkers(); const totalAdv = state.advances.reduce((s,a)=>s+Number(a.amount||0),0); const totalSalary = aw.reduce((s,w)=>s+Number(w.salary||0),0);
  if(user.role !== 'admin') return `${advanceView()}<div class="card"><h2>Ultimele avansuri introduse de tine</h2>${miniHistory(state.advances.filter(a=>a.operator_name===user.email).slice(0,10), false)}</div>`;
  return `<div class="grid"><div class="card stat"><b>Muncitori activi</b><h2>${aw.length}</h2></div><div class="card stat"><b>Total avansuri</b><h2>${lei(totalAdv)}</h2></div><div class="card stat"><b>Rest de plată</b><h2>${lei(totalSalary-totalAdv)}</h2></div><div class="card stat"><b>Operatori</b><h2>${state.users.filter(u=>u.role==='operator'&&u.active!==false).length}</h2></div></div>${advanceView()}<div class="card"><h2>Resturi pe muncitori</h2>${workersTable(false)}</div>`;
}
function advanceView(){
  const workers = activeWorkers();
  return `<div class="card"><h2>Acordă avans</h2><div class="two"><select id="advWorker"><option value="">Alege muncitor</option>${workers.map(w=>`<option value="${w.id}">${esc(w.name)}${user.role==='admin'?` — rest ${lei(workerRest(w))}`:''}</option>`).join('')}</select><input id="advAmount" type="number" placeholder="Suma avans lei"></div><div class="two"><input id="advPin" placeholder="PIN muncitor"><input id="advComment" placeholder="Comentariu"></div><button onclick="addAdvance()">Salvează avans + pregătește email</button></div>`;
}
function filterToolbar(){ return `<div class="toolbar"><input placeholder="Caută muncitor/operator" value="${esc(state.q)}" oninput="state.q=this.value;render()"><input type="date" value="${esc(state.from)}" onchange="state.from=this.value;render()"><input type="date" value="${esc(state.to)}" onchange="state.to=this.value;render()"><button class="secondary" onclick="state.q='';state.from='';state.to='';render()">Curăță filtre</button></div>`; }
function historyView(){ return `<div class="card"><h2>Istoric avansuri</h2>${filterToolbar()}<button class="green" onclick="exportCSV()">Export Excel CSV</button><button class="secondary" onclick="window.print()">PDF / Print</button><div class="table-wrap">${miniHistory(filteredAdvances(), user.role==='admin')}</div></div>`; }
function miniHistory(list, showMoney=true){ return `<table><thead><tr><th>Data</th><th>Muncitor</th><th>Operator</th><th>Suma</th><th>Comentariu</th><th>Email</th><th>Bon</th></tr></thead><tbody>${list.map(a=>{const w=state.workers.find(x=>x.id===a.worker_id);return `<tr><td>${esc((a.created_at||'').slice(0,10))}</td><td>${esc(w?.name||'')}</td><td>${esc(a.operator_name||'')}</td><td>${showMoney?lei(a.amount):'salvat'}</td><td>${esc(a.comment||'')}</td><td>${a.sms_sent?'<span class="badge ok">pregătit</span>':'<span class="badge warnb">nu</span>'}</td><td><button class="light" onclick="printReceipt('${a.id}')">Bon 58mm</button></td></tr>`}).join('')}</tbody></table>`; }
function workersView(){ return `<div class="card"><h2>Adaugă muncitor</h2><div class="two"><input id="wName" placeholder="Nume"><input id="wPhone" placeholder="Telefon +373..."></div><div class="two"><input id="wEmail" placeholder="Email muncitor"><input id="wPin" placeholder="PIN"></div><input id="wSalary" type="number" placeholder="Salariu total lei"><button onclick="addWorker()">Salvează muncitor</button></div><div class="card"><h2>Muncitori</h2>${workersTable(true)}</div>`; }
function workersTable(actions){ const workers=activeWorkers(); return `<div class="table-wrap"><table><thead><tr><th>Nume</th><th>Telefon</th><th>Email</th><th>Salariu</th><th>Avansuri</th><th>Rest</th>${actions?'<th>Acțiuni</th>':''}</tr></thead><tbody>${workers.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.phone||'')}</td><td>${esc(w.email||'')}</td><td>${lei(w.salary)}</td><td>${lei(workerAdvances(w.id))}</td><td><b>${lei(workerRest(w))}</b></td>${actions?`<td class="actions"><button class="light" onclick="editWorker('${w.id}')">Modifică</button><button class="warn" onclick="deleteWorker('${w.id}')">Dezactivează</button></td>`:''}</tr>`).join('')}</tbody></table></div>`; }
function operatorsView(){ const ops=state.users.filter(u=>u.role==='operator'); return `<div class="card"><h2>Adaugă operator</h2><div class="two"><input id="opName" placeholder="Nume operator"><input id="opPass" placeholder="Parolă"></div><button onclick="addOperator()">Salvează operator</button></div><div class="card"><h2>Operatori</h2>${ops.map(u=>`<div class="row"><b>${esc(u.email)}</b><span class="badge ${u.active===false?'bad':'ok'}">${u.active===false?'dezactivat':'activ'}</span><button class="light" onclick="changePassword('${u.id}')">Schimbă parola</button><button class="warn" onclick="deleteOperator('${u.id}')">Dezactivează</button></div>`).join('')}</div>`; }
function reportsView(){ return `<div class="card"><h2>Rapoarte</h2>${filterToolbar()}<button class="green" onclick="exportCSV()">Export Excel CSV</button><button class="secondary" onclick="window.print()">PDF / Print</button><p>Total avansuri filtrate: <b>${lei(filteredAdvances().reduce((s,a)=>s+Number(a.amount||0),0))}</b></p>${workersTable(false)}<h2>Avansuri</h2>${miniHistory(filteredAdvances(), true)}</div>`; }
function smsView(){ return `<div class="card"><h2>Email/SMS pregătite</h2><p class="small">Emailul se deschide automat prin programul de email al operatorului. Jurnalul rămâne salvat în Supabase.</p><div class="table-wrap"><table><thead><tr><th>Data</th><th>Email/Telefon</th><th>Mesaj</th><th>Status</th></tr></thead><tbody>${state.sms.map(s=>`<tr><td>${esc((s.created_at||'').slice(0,10))}</td><td>${esc(s.phone||'')}</td><td>${esc(s.message||'')}</td><td>${esc(s.status||'pending')}</td></tr>`).join('')}</tbody></table></div></div>`; }
async function addWorker(){ if(!wName.value.trim()){alert('Scrie numele');return;} const res=await sb.from('workers').insert({name:wName.value.trim(),phone:wPhone.value.trim(),email:wEmail.value.trim(),pin:wPin.value.trim(),salary:Number(wSalary.value||0),active:true}); if(res.error) alert(res.error.message); await boot(); }
async function editWorker(id){ const w=state.workers.find(x=>x.id===id); const name=prompt('Nume:',w.name); if(!name)return; const phone=prompt('Telefon:',w.phone||''); const email=prompt('Email:',w.email||''); const pin=prompt('PIN:',w.pin||''); const salary=Number(prompt('Salariu:',w.salary||0)||0); const res=await sb.from('workers').update({name,phone,email,pin,salary}).eq('id',id); if(res.error) alert(res.error.message); await boot(); }
async function deleteWorker(id){ if(!confirm('Dezactivezi muncitorul?'))return; const res=await sb.from('workers').update({active:false}).eq('id',id); if(res.error) alert(res.error.message); await boot(); }
async function addOperator(){ if(!opName.value||!opPass.value){alert('Completează operator și parolă');return;} const res=await sb.from('users_roles').insert({email:opName.value.trim(),password:opPass.value.trim(),role:'operator',active:true}); if(res.error) alert(res.error.message); await boot(); }
async function changePassword(id){ const p=prompt('Parola nouă:'); if(!p)return; const res=await sb.from('users_roles').update({password:p}).eq('id',id); if(res.error) alert(res.error.message); else alert('Parola schimbată'); await boot(); }
async function deleteOperator(id){ if(!confirm('Dezactivezi operatorul?'))return; const res=await sb.from('users_roles').update({active:false}).eq('id',id); if(res.error) alert(res.error.message); await boot(); }
async function addAdvance(){ const w=state.workers.find(x=>x.id===advWorker.value); if(!w){alert('Alege muncitorul');return;} if(w.pin && advPin.value.trim() !== String(w.pin)){alert('PIN greșit');return;} const amount=Number(advAmount.value||0); if(!amount){alert('Introdu suma');return;} const code='AV-'+Date.now(); const msg=`Brickstone: Bună, ${w.name}. Ai primit avans ${amount} lei. Data ${today()}. Rest ${lei(workerRest(w)-amount)}. Cod ${code}.`; const {data,error}=await sb.from('advances').insert({worker_id:w.id,worker_name:w.name,amount,comment:advComment.value.trim(),operator_name:user.email,code,sms_sent:Boolean(w.email)}).select().single(); if(error){alert(error.message);return;} await sb.from('sms_logs').insert({advance_id:data.id,phone:w.email || w.phone || '',message:msg,status:w.email?'email_pregatit':'fara_email'}); if(w.email){ const subject=encodeURIComponent('Avans Brickstone'); const body=encodeURIComponent(`Bună, ${w.name}.\n\nAi primit avans: ${amount} lei\nData: ${today()}\nOperator: ${user.email}\nCod: ${code}\n\nBrickstone`); window.location.href=`mailto:${encodeURIComponent(w.email)}?subject=${subject}&body=${body}`; } else alert('Avans salvat. Muncitorul nu are email.'); await boot(); state.tab='history'; render(); }
function printReceipt(id){ const a=state.advances.find(x=>x.id===id); const w=state.workers.find(x=>x.id===a.worker_id); document.getElementById('printArea').innerHTML=`<h2>BRICKSTONE</h2><p>Bon avans</p><hr><p>Data: ${now()}</p><p>Muncitor: ${esc(w?.name||'')}</p><p>Suma: ${lei(a.amount)}</p><p>Operator: ${esc(a.operator_name||'')}</p><p>Cod: ${esc(a.code||'')}</p><p>Comentariu: ${esc(a.comment||'')}</p><hr><p>Semnătura: __________</p>`; window.print(); }
function exportCSV(){ const rows=[['Data','Muncitor','Telefon','Email','Operator','Suma','Comentariu','Cod']]; filteredAdvances().forEach(a=>{const w=state.workers.find(x=>x.id===a.worker_id); rows.push([(a.created_at||'').slice(0,10),w?.name||'',w?.phone||'',w?.email||'',a.operator_name||'',a.amount||0,a.comment||'',a.code||'']);}); const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download='brickstone_raport_avansuri.csv'; link.click(); URL.revokeObjectURL(url); }
boot();
