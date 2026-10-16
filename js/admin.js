// Admin panel. The key stays in sessionStorage only. All data comes from the protected API.
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  ); // customer text is untrusted
const api = async (path, opt = {}) => {
  const r = await fetch(CONFIG.apiUrl + path, {
    ...opt,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": sessionStorage.adminKey || "",
    },
  });
  if (r.status === 401) {
    sessionStorage.removeItem("adminKey");
    show(false);
    throw new Error("Wrong key");
  }
  return r.json();
};
function show(on) {
  $("#login").hidden = on;
  $("#panel").hidden = !on;
}
const sel = (opts, cur, id, f) =>
  `<select aria-label="${f}" onchange="upd('${id}',{${f}:this.value})">${opts.map((o) => `<option ${o === cur ? "selected" : ""}>${o}</option>`).join("")}</select>`;
async function loadOrders() {
  const list = await api("/api/admin/orders");
  $("#orders").innerHTML = list.length
    ? list
        .map(
          (
            o,
          ) => `<div class="box" style="display:block"><h3>${esc(o.ref)} · ${CONFIG.currency}${o.total}</h3>
   <p>${esc(o.customer_name)} · ${esc(o.phone)}<br>${esc(o.address)}, ${esc(o.area)}<br>${o.notes ? "Notes: " + esc(o.notes) : ""}</p>
   <p>${o.items.map((i) => `${i.qty} × ${esc(i.name)}`).join(", ")}</p>
   <p>Method: <b>${esc(o.method)}</b>${o.bkash_trx ? ` · TrxID <b>${esc(o.bkash_trx)}</b> from ${esc(o.bkash_sender)} (${esc(o.bkash_type)})` : ""}</p>
   <p>Order: ${sel(["submitted", "confirmed", "preparing", "delivered", "cancelled"], o.order_status, o.ref, "order_status")}
   Payment: ${sel(["unverified", "verified", "rejected"], o.payment_status, o.ref, "payment_status")}</p>
   ${o.method === "bkash" ? '<p class="muted">Set Payment to verified only after you checked this TrxID in your bKash app.</p>' : ""}</div>`,
        )
        .join("")
    : '<p class="empty">No orders yet.</p>';
}
async function upd(ref, body) {
  await api("/api/admin/orders/" + ref, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
async function loadProds() {
  const r = await fetch(CONFIG.apiUrl + "/api/products"),
    l = await r.json();
  $("#prods").innerHTML = l
    .map(
      (
        p,
      ) => `<div class="line"><b>${esc(p.name)}</b><label>Price <input type="number" min="1" value="${p.price}" onchange="updP('${p.id}',{price:parseInt(this.value)})"></label>
   <label><input type="checkbox" ${p.available ? "checked" : ""} onchange="updP('${p.id}',{available:this.checked})"> Available</label><span></span></div>`,
    )
    .join("");
}
async function updP(id, body) {
  await api("/api/admin/products/" + id, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
async function start() {
  try {
    await loadOrders();
    show(true);
  } catch (e) {
    $("#le").textContent =
      e.message === "Wrong key" ? "Wrong key." : "Cannot reach the server.";
  }
}
$("#enter").onclick = () => {
  sessionStorage.adminKey = $("#key").value;
  start();
};
$("#out").onclick = () => {
  sessionStorage.removeItem("adminKey");
  show(false);
};
$("#tabO").onclick = () => {
  $("#orders").hidden = false;
  $("#prods").hidden = true;
  loadOrders();
};
$("#tabP").onclick = () => {
  $("#orders").hidden = true;
  $("#prods").hidden = false;
  loadProds();
};
if (sessionStorage.adminKey) start();
