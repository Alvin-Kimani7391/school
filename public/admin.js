// public/admin.js
let token = localStorage.getItem("admin_token") || null;

const loginBox = document.getElementById("loginBox");
const appBox = document.getElementById("app");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const schoolSelect = document.getElementById("schoolSelect");
const classSelect = document.getElementById("classSelect");
const refreshBtn = document.getElementById("refreshBtn");
const searchReg = document.getElementById("searchReg");
const ordersList = document.getElementById("ordersList");
const summary = document.getElementById("summary");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// ---------------- AUTH UI ----------------
function setAuthUI() {
  if (token) {
    loginBox.classList.add("hidden");
    appBox.classList.remove("hidden");
    loadData();
  } else {
    loginBox.classList.remove("hidden");
    appBox.classList.add("hidden");
  }
}

// ---------------- LOGIN/LOGOUT ----------------
loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  loginError.textContent = "";

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.token) return loginError.textContent = data.error || "Login failed";

    token = data.token;
    localStorage.setItem("admin_token", token);
    setAuthUI();
  } catch {
    loginError.textContent = "Login error";
  }
});

logoutBtn.addEventListener("click", () => {
  token = null;
  localStorage.removeItem("admin_token");
  setAuthUI();
});

// ---------------- DATA FETCH ----------------
refreshBtn.addEventListener("click", loadData);
schoolSelect.addEventListener("change", onSchoolChange);
classSelect.addEventListener("change", renderOrders);
searchReg.addEventListener("input", renderOrders);

async function loadData() {
  ordersList.innerHTML = "Loading...";
  try {
    const res = await fetch("/api/orders", { headers: { Authorization: "Bearer " + token } });
    const json = await res.json();
    if (!json.success) return ordersList.innerHTML = "Failed to load";

    window.ordersData = json.data || {};
    populateSchoolSelect();
    renderOrders();
  } catch (err) {
    console.error(err);
    ordersList.innerHTML = "Error loading data (check console)";
  }
}

// ---------------- POPULATE SELECTS ----------------
function populateSchoolSelect() {
  schoolSelect.innerHTML = "<option value=''>--Select School--</option>";
  Object.keys(window.ordersData || {}).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    schoolSelect.appendChild(opt);
  });

  classSelect.innerHTML = "<option value=''>--Select Class--</option>";
}

function onSchoolChange() {
  const s = schoolSelect.value;
  classSelect.innerHTML = "<option value=''>--Select Class--</option>";
  if (!s) return;

  const classes = Object.keys(window.ordersData[s] || {});
  // Add "All Classes"
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All Classes";
  classSelect.appendChild(allOpt);

  classes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });

  classSelect.value = "all"; // default to All Classes
  renderOrders();
}

// ---------------- RENDER ORDERS ----------------
function renderOrders() {
  const s = schoolSelect.value;
  const c = classSelect.value;
  const q = searchReg.value.trim().toLowerCase();

  let rows = [];

  if (s) {
    const schoolData = window.ordersData[s] || {};
    if (c && c !== "all") {
      rows = schoolData[c] || [];
    } else {
      // flatten all classes
      Object.values(schoolData).forEach(arr => rows.push(...arr));
    }
  } else {
    // entire dataset
    Object.values(window.ordersData).forEach(schoolData => {
      Object.values(schoolData).forEach(arr => rows.push(...arr));
    });
  }

  // Filter by search
  if (q) rows = rows.filter(r =>
    (r.regNumber || "").toLowerCase().includes(q) ||
    (r.studentName || "").toLowerCase().includes(q)
  );

  summary.innerHTML = `<b>Showing:</b> ${rows.length} record(s)`;

  if (rows.length === 0) return ordersList.innerHTML = "<p>No orders found.</p>";

  let html = "<table><thead><tr><th>#</th><th>Reg</th><th>Student</th><th>Phone</th><th>Items</th><th>Total</th><th>Time</th></tr></thead><tbody>";

  rows.forEach((r, idx) => {
    const items = (r.cart || []).map(it => `${it.make || ""} ${it.model || ""} (Ksh.${it.price ?? "-"})`).join("<br/>");
    const total = (r.cart || []).reduce((s, it) => s + (Number(it.price) || 0), 0);
    const timestamp = r.timestamp ? new Date(r.timestamp).toLocaleString() : "-";

    html += `<tr>
      <td>${idx + 1}</td>
      <td>${r.regNumber || ""}</td>
      <td>${r.studentName || ""}</td>
      <td>${r.buyerPhone || ""}</td>
      <td>${items}</td>
      <td>Ksh.${total.toLocaleString()}</td>
      <td>${timestamp}</td>
    </tr>`;
  });

  html += "</tbody></table>";
  ordersList.innerHTML = html;
}

// ---------------- DOWNLOAD ----------------
function downloadFile(url, filename) {
  fetch(url, { headers: { Authorization: "Bearer " + token } })
    .then(r => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(() => alert("Could not download file"));
}

exportPdfBtn.addEventListener("click", () => {
  const s = schoolSelect.value;
  const c = classSelect.value;
  if (!s) return alert("Select school first");
  if (!c) return alert("Select class or 'All Classes'");

  const url = `/api/download/pdf?school=${encodeURIComponent(s)}&class=${encodeURIComponent(c)}`;
  const filename = `${s}-${c === "all" ? "AllClasses" : c}.pdf`;
  downloadFile(url, filename);
});

exportExcelBtn.addEventListener("click", () => {
  const s = schoolSelect.value;
  const c = classSelect.value;
  if (!s) return alert("Select school first");
  if (!c) return alert("Select class or 'All Classes'");

  const url = `/api/download/excel?school=${encodeURIComponent(s)}&class=${encodeURIComponent(c)}`;
  const filename = `${s}-${c === "all" ? "AllClasses" : c}.xlsx`;
  downloadFile(url, filename);
});

// ---------------- INIT ----------------
setAuthUI();
