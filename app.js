const SUPABASE_URL = "https://gewgugneceqxwovkstqs.supabase.co";
const SUPABASE_KEY = "sb_publishable_Dy5AfagRaYpfkth3sy1MCA_ZDHv7jds";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

function loginScreen() {
  app.innerHTML = `
    <div class="login">
      <h1>Brickstone Manager Pro</h1>
      <h2>Autentificare</h2>
      <input id="user" placeholder="Utilizator">
      <input id="pass" type="password" placeholder="Parolă">
      <button onclick="login()">Intră</button>
      <p><b>Admin:</b> piatrata@yandex.com / 1234</p>
      <p><b>Operator:</b> Serghei / 1111</p>
    </div>
  `;
}

async function login() {
  const email = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value.trim();

  const { data, error } = await sb
    .from("users_roles")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .maybeSingle();

  if (error || !data) {
    alert("Utilizator sau parolă greșită");
    return;
  }

  localStorage.setItem("brickstone_user", JSON.stringify(data));
  renderApp(data);
}

function logout() {
  localStorage.removeItem("brickstone_user");
  loginScreen();
}

async function renderApp(user) {
  if (user.role === "admin") {
    renderAdmin(user);
  } else {
    renderOperator(user);
  }
}

async function renderAdmin(user) {
  const { data: workers } = await sb.from("workers").select("*").order("created_at", { ascending: false });
  const { data: advances } = await sb.from("advances").select("*").order("created_at", { ascending: false });
  const { data: users } = await sb.from("users_roles").select("*").order("created_at", { ascending: false });

  app.innerHTML = `
    <div class="top">
      <h1>Bun venit, Admin Brickstone</h1>
      <button onclick="logout()">Ieșire</button>
    </div>

    <div class="grid">
      <div class="card"><b>Muncitori</b><h2>${workers.length}</h2></div>
      <div class="card"><b>Avansuri</b><h2>${advances.reduce((s,a)=>s+Number(a.amount||0),0)} lei</h2></div>
      <div class="card"><b>Operatori</b><h2>${users.filter(u=>u.role==="operator").length}</h2></div>
    </div>

    <div class="card">
      <h2>Adaugă muncitor</h2>
      <input id="wName" placeholder="Nume">
      <input id="wPhone" placeholder="Telefon">
      <input id="wPin" placeholder="PIN">
      <input id="wSalary" type="number" placeholder="Salariu total lei">
      <button onclick="addWorker()">Salvează muncitor</button>
    </div>

    <div class="card">
      <h2>Adaugă operator</h2>
      <input id="opName" placeholder="Nume operator">
      <input id="opPass" placeholder="Parolă">
      <button onclick="addOperator()">Salvează operator</button>
    </div>

    <div class="card">
      <h2>Muncitori</h2>
      ${workers.map(w => `
        <div class="row">
          <b>${w.name}</b> | ${w.phone || ""} | Salariu: ${w.salary || 0} lei
          <button onclick="deleteWorker('${w.id}')">Șterge</button>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h2>Operatori</h2>
      ${users.filter(u=>u.role==="operator").map(u => `
        <div class="row">
          <b>${u.email}</b>
          <button onclick="changePassword('${u.id}')">Schimbă parola</button>
          <button onclick="deleteOperator('${u.id}')">Șterge</button>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h2>Istoric avansuri</h2>
      ${advances.map(a => `
        <div class="row">
          ${a.created_at?.slice(0,10)} | ${a.operator_name || ""} | ${a.amount} lei | ${a.comment || ""}
        </div>
      `).join("")}
    </div>
  `;
}

async function renderOperator(user) {
  const { data: workers } = await sb.from("workers").select("*").order("name");

  app.innerHTML = `
    <div class="top">
      <h1>Bun venit, ${user.email}</h1>
      <button onclick="logout()">Ieșire</button>
    </div>

    <div class="card">
      <h2>Acordă avans</h2>
      <select id="advWorker">
        ${workers.map(w=>`<option value="${w.id}">${w.name}</option>`).join("")}
      </select>
      <input id="advAmount" type="number" placeholder="Suma avans lei">
      <input id="advComment" placeholder="Comentariu">
      <button onclick="addAdvance()">Salvează avans</button>
    </div>
  `;
}

async function addWorker() {
  await sb.from("workers").insert({
    name: wName.value,
    phone: wPhone.value,
    pin: wPin.value,
    salary: Number(wSalary.value || 0),
    active: true
  });
  location.reload();
}

async function deleteWorker(id) {
  if (!confirm("Dezactivezi muncitorul?")) return;

  await sb.from("workers")
    .update({ active: false })
    .eq("id", id);

  location.reload();
}
}

async function addOperator() {
  await sb.from("users_roles").insert({
    email: opName.value,
    password: opPass.value,
    role: "operator"
  });
  location.reload();
}

async function changePassword(id) {
  const p = prompt("Parola nouă:");
  if (!p) return;
  await sb.from("users_roles").update({ password: p }).eq("id", id);
  alert("Parola a fost schimbată");
}

async function deleteOperator(id) {
  if (!confirm("Ștergi operatorul?")) return;
  await sb.from("users_roles").delete().eq("id", id);
  location.reload();
}

async function addAdvance() {
  const user = JSON.parse(localStorage.getItem("brickstone_user"));
  await sb.from("advances").insert({
    worker_id: advWorker.value,
    amount: Number(advAmount.value || 0),
    comment: advComment.value,
    operator_name: user.email,
    sms_sent: false
  });
  alert("Avans salvat");
  renderOperator(user);
}

const saved = localStorage.getItem("brickstone_user");
if (saved) renderApp(JSON.parse(saved));
else loginScreen();
