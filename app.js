// Brickstone Manager Pro
// 1) Înlocuiește SUPABASE_PUBLISHABLE_KEY cu cheia ta din Supabase.
// 2) Rulează scriptul din sql/setup.sql în Supabase.
const SUPABASE_URL = "https://gewgugneceqxwovkstqs.supabase.co";
const SUPABASE_KEY = "PASTE_SUPABASE_PUBLISHABLE_KEY_HERE";

const DEMO_USERS = [
  { username: "piatrata@yandex.com", password: "1234", role: "admin", name: "Admin Brickstone" },
  { username: "Serghei", password: "1111", role: "operator", name: "Serghei" }
];

const sb = (SUPABASE_KEY && !SUPABASE_KEY.includes("PASTE_")) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let currentUser = JSON.parse(localStorage.getItem("bmp_user") || "null");
let workers = [];
let advances = [];

const $ = id => document.getElementById(id);
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.remove("hidden"); setTimeout(()=>t.classList.add("hidden"),3000); }
function localGet(k){ return JSON.parse(localStorage.getItem(k) || "[]"); }
function localSet(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function money(n){ return `${Number(n||0).toLocaleString("ro-RO")} lei`; }
function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())); }

async function loadData(){
  if(sb){
    try{
      const w = await sb.from("workers").select("*").order("created_at",{ascending:false});
      const a = await sb.from("advances").select("*").order("created_at",{ascending:false});
      if(w.error) throw w.error; if(a.error) throw a.error;
      workers = w.data || []; advances = a.data || [];
      $("modeInfo").textContent = "Conectat la Supabase";
    }catch(err){
      workers = localGet("bmp_workers"); advances = localGet("bmp_advances");
      $("modeInfo").textContent = "Mod local: verifică politicile RLS / cheia Supabase";
      console.error(err); toast("Nu pot citi din Supabase. Folosesc localStorage.");
    }
  }else{
    workers = localGet("bmp_workers"); advances = localGet("bmp_advances");
    if($("modeInfo")) $("modeInfo").textContent = "Mod local: adaugă cheia Supabase în app.js";
  }
  render();
}

async function addWorker(){
  const item = {
    id: uid(), name: $("workerName").value.trim(), phone: $("workerPhone").value.trim(),
    pin: $("workerPin").value.trim(), salary: Number($("workerSalary").value||0),
    site: $("workerSite").value.trim(), active: true, created_at: new Date().toISOString()
  };
  if(!item.name) return toast("Scrie numele muncitorului");
  if(currentUser.role !== "admin") delete item.salary;
  if(sb){ const r = await sb.from("workers").insert(item); if(r.error){console.error(r.error); return toast("Eroare Supabase la muncitor");} }
  else { workers.unshift(item); localSet("bmp_workers", workers); }
  ["workerName","workerPhone","workerPin","workerSalary","workerSite"].forEach(id=>$(id).value="");
  toast("Muncitor salvat"); await loadData();
}

async function addAdvance(){
  const workerId = $("advanceWorker").value;
  const worker = workers.find(w => String(w.id) === String(workerId));
  const amount = Number($("advanceAmount").value||0);
  const pin = $("advancePin").value.trim();
  if(!worker) return toast("Alege muncitorul");
  if(!amount) return toast("Scrie suma");
  if(worker.pin && worker.pin !== pin) return toast("PIN greșit");
  const code = "AV-" + Date.now().toString().slice(-6);
  const item = { id: uid(), worker_id: worker.id, amount, comment: $("advanceComment").value.trim(), operator_name: currentUser.name, code, sms_sent:false, created_at:new Date().toISOString() };
  if(sb){
    const r = await sb.from("advances").insert(item); if(r.error){console.error(r.error); return toast("Eroare Supabase la avans");}
    const msg = `Brickstone: Ai primit avans ${amount} lei. Cod ${code}.`;
    await sb.from("sms_logs").insert({ id: uid(), advance_id:item.id, phone:worker.phone, message:msg, status:"pending", created_at:new Date().toISOString() });
  } else { advances.unshift(item); localSet("bmp_advances", advances); }
  ["advanceAmount","advancePin","advanceComment"].forEach(id=>$(id).value="");
  toast("Avans salvat. SMS pregătit."); await loadData();
}

function login(){
  const u=$("loginUser").value.trim(); const p=$("loginPass").value.trim();
  const user = DEMO_USERS.find(x => x.username===u && x.password===p);
  if(!user) return toast("Date greșite");
  currentUser = user; localStorage.setItem("bmp_user", JSON.stringify(user));
  renderShell(); loadData();
}
function logout(){ localStorage.removeItem("bmp_user"); currentUser=null; renderShell(); }
function totalForWorker(id){ return advances.filter(a=>String(a.worker_id)===String(id)).reduce((s,a)=>s+Number(a.amount||0),0); }
function renderShell(){
  $("loginView").classList.toggle("hidden", !!currentUser);
  $("appView").classList.toggle("hidden", !currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  if(currentUser){ $("helloText").textContent = "Bun venit, " + currentUser.name; $("roleBadge").textContent = currentUser.role === "admin" ? "Administrator" : "Operator"; $("roleBadge").className = "badge " + (currentUser.role === "operator" ? "operator" : ""); }
}
function render(){
  renderShell(); if(!currentUser) return;
  const isAdmin = currentUser.role === "admin";
  $("adminDashboard").classList.toggle("hidden", !isAdmin); $("adminReport").classList.toggle("hidden", !isAdmin); $("salaryLabel").style.display = isAdmin ? "block" : "none"; $("workerSalary").style.display = isAdmin ? "block" : "none";
  $("advanceWorker").innerHTML = '<option value="">Alege muncitor</option>' + workers.map(w=>`<option value="${w.id}">${w.name} ${w.site?"· "+w.site:""}</option>`).join("");
  if(isAdmin){
    const totalAdv = advances.reduce((s,a)=>s+Number(a.amount||0),0); const totalSalary = workers.reduce((s,w)=>s+Number(w.salary||0),0);
    $("statWorkers").textContent = workers.length; $("statAdvances").textContent = money(totalAdv); $("statRest").textContent = money(totalSalary-totalAdv); $("statSms").textContent = advances.length;
    $("workersTable").innerHTML = workers.map(w=>{ const adv=totalForWorker(w.id); return `<tr><td>${w.name}</td><td>${w.phone||""}</td><td>${w.site||""}</td><td>${money(w.salary)}</td><td>${money(adv)}</td><td>${money(Number(w.salary||0)-adv)}</td></tr>`}).join("");
  }
  $("advancesTable").innerHTML = advances.map(a=>{ const w=workers.find(x=>String(x.id)===String(a.worker_id)); return `<tr><td>${new Date(a.created_at).toLocaleString("ro-RO")}</td><td>${w?w.name:""}</td><td>${isAdmin?money(a.amount):"Salvat"}</td><td>${a.operator_name||""}</td><td>${a.code||""}</td><td>${a.sms_sent?"trimis":"pending"}</td></tr>`}).join("");
}
function exportCSV(){
  let csv="Muncitor,Telefon,Santier,Salariu,Avansuri,Rest\n";
  workers.forEach(w=>{ const adv=totalForWorker(w.id); csv += `${w.name},${w.phone||""},${w.site||""},${w.salary||0},${adv},${Number(w.salary||0)-adv}\n`; });
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="brickstone_raport.csv"; a.click();
}

$("loginBtn").onclick=login; $("logoutBtn").onclick=logout; $("addWorkerBtn").onclick=addWorker; $("addAdvanceBtn").onclick=addAdvance; $("exportBtn").onclick=exportCSV;
renderShell(); if(currentUser) loadData();
