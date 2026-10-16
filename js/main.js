// Shared helpers + header/footer injected on every page
// Menu comes from MySQL via the API; if the server is down, products.js is used instead.
const productsReady = fetch(CONFIG.apiUrl + "/api/products", {
  signal: AbortSignal.timeout(2500),
})
  .then((r) => r.json())
  .then((rows) => {
    if (!Array.isArray(rows) || !rows.length) return;
    const old = [...PRODUCTS];
    PRODUCTS.length = 0;
    rows.forEach((r) =>
      PRODUCTS.push({
        id: r.id,
        name: r.name,
        category: r.category,
        price: r.price,
        emoji: (old.find((o) => o.id === r.id) || {}).emoji || "🍽️",
        desc: r.description,
        avail: !!r.available,
        rating: Number(r.rating),
      }),
    );
  })
  .catch(() => {});
const money = (n) => CONFIG.currency + Number(n).toLocaleString("en-US");
const $ = (s, r = document) => r.querySelector(s);
const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem("flavoria_cart")) || [];
  } catch {
    return [];
  }
};
const saveCart = (c) => {
  localStorage.setItem("flavoria_cart", JSON.stringify(c));
  updateBadge();
};
const cartCount = () => getCart().reduce((n, i) => n + i.qty, 0);
function updateBadge() {
  document
    .querySelectorAll(".badge")
    .forEach((b) => (b.textContent = cartCount()));
}

function card(p) {
  // product card used on home + menu
  return `<article class="card"><a href="product-details.html?id=${p.id}" aria-label="${p.name} details">
   <div class="ph"><span aria-hidden="true">${p.emoji}</span><img src="images/${p.id}.jpg" alt="${p.name}" loading="lazy" onerror="this.remove()"></div></a>
   <div class="cb"><h3>${p.name}</h3><p>${p.desc}</p>
   <div class="row"><b>${money(p.price)}</b><span class="star">★ ${p.rating}</span></div>
   <div class="row"><button class="btn" onclick="addToCart('${p.id}')" ${p.avail ? "" : "disabled"}>${p.avail ? "Add to Cart" : "Sold out"}</button>
   <a class="btn ghost" href="product-details.html?id=${p.id}">View Details</a></div></div></article>`;
}

const PAGES = [
  ["index.html", "Home"],
  ["menu.html", "Menu"],
  ["about.html", "About"],
  ["offers.html", "Offers"],
  ["contact.html", "Contact"],
];
function buildChrome() {
  const here = location.pathname.split("/").pop() || "index.html";
  const links = PAGES.map(
    ([h, t]) =>
      `<a href="${h}" ${h === here ? 'aria-current="page"' : ""}>${t}</a>`,
  ).join("");
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<a class="skip" href="#main">Skip to content</a>
  <div class="top"><span>${CONFIG.phone}</span><span>${CONFIG.email}</span><span>Delivery promo: edit in offers.html (demo)</span>
  <span><a href="${CONFIG.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></span></div>
  <header class="nav"><a class="logo" href="index.html">♛<br>FLAVORIA<small>FINE DINING</small></a>
  <button class="burger" aria-label="Toggle menu" aria-expanded="false">☰</button>
  <nav id="menu">${links}<a class="cart" href="cart.html" aria-label="Cart">🛒 <span class="badge">0</span></a></nav></header>`,
  );
  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer><div class="fgrid">
  <div><h4>${CONFIG.name}</h4><p>${CONFIG.address}<br>${CONFIG.hours}</p></div>
  <div><h4>Explore</h4>${links}<a href="cart.html">Cart</a></div>
  <div><h4>Contact</h4><p>${CONFIG.phone}<br><a href="mailto:${CONFIG.email}">${CONFIG.email}</a></p></div>
  <div><h4>Payments & Policies</h4><p>bKash (manual) · Cash on delivery · WhatsApp orders</p><a href="payment.html">Payment info</a><a href="order-policy.html">Order policy</a></div></div>
  <p class="copy">© ${new Date().getFullYear()} ${CONFIG.name}. Demo site; reviews and offers are sample content.</p></footer>`,
  );
  const b = $(".burger");
  b.onclick = () => {
    const o = $("#menu").classList.toggle("open");
    b.setAttribute("aria-expanded", o);
  };
  updateBadge();
}
document.addEventListener("DOMContentLoaded", async () => {
  buildChrome();
  await productsReady;
  const page = document.body.dataset.page;
  if (page === "home") {
    $("#cats").innerHTML = CATEGORIES.map(
      (c) =>
        `<a class="cat" href="menu.html?cat=${encodeURIComponent(c)}">${c}</a>`,
    ).join("");
    $("#recs").innerHTML = PRODUCTS.slice(0, 8).map(card).join("");
  }
  if (page === "menu") initMenu();
  if (page === "details") initDetails();
  if (page === "cart") renderCart();
});
function initMenu() {
  // search + category filter + price sort
  const q = $("#q"),
    cat = $("#cat"),
    sort = $("#sort");
  cat.innerHTML =
    '<option value="">All categories</option>' +
    CATEGORIES.map((c) => `<option>${c}</option>`).join("");
  cat.value = new URLSearchParams(location.search).get("cat") || "";
  const draw = () => {
    let l = PRODUCTS.filter(
      (p) =>
        (!cat.value || p.category === cat.value) &&
        (p.name + p.desc).toLowerCase().includes(q.value.toLowerCase()),
    );
    if (sort.value)
      l.sort((a, b) =>
        sort.value === "asc" ? a.price - b.price : b.price - a.price,
      );
    $("#grid").innerHTML = l.length
      ? l.map(card).join("")
      : '<p class="empty">No dishes match. Try another search or category.</p>';
  };
  [q, cat, sort].forEach((e) => e.addEventListener("input", draw));
  draw();
}
function initDetails() {
  // product chosen via ?id=
  const p = PRODUCTS.find(
    (x) => x.id === new URLSearchParams(location.search).get("id"),
  );
  $("#detail").innerHTML = p
    ? `<div class="ph big"><span>${p.emoji}</span><img src="images/${p.id}.jpg" alt="${p.name}" onerror="this.remove()"></div>
  <div><p class="muted">${p.category}</p><h1>${p.name}</h1><p>${p.desc}.</p>
  <p class="star">★ ${p.rating}</p><h2>${money(p.price)}</h2><p>${p.avail ? "✅ Available" : "❌ Currently unavailable"}</p>
  <button class="btn" onclick="addToCart('${p.id}')" ${p.avail ? "" : "disabled"}>Add to Cart</button> <a class="btn ghost" href="menu.html">Back to menu</a></div>`
    : '<p class="empty">Dish not found. <a href="menu.html">Browse the menu</a>.</p>';
}
