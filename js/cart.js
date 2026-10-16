// Cart logic (LocalStorage). Cart stores only id + qty; prices always come from products.js.
function addToCart(id) {
  const c = getCart(),
    i = c.find((x) => x.id === id);
  i ? i.qty++ : c.push({ id, qty: 1 });
  saveCart(c);
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = "Added to cart";
  document.body.append(t);
  setTimeout(() => t.remove(), 1500);
}
function changeQty(id, d) {
  let c = getCart();
  const i = c.find((x) => x.id === id);
  if (i) {
    i.qty += d;
    if (i.qty < 1) c = c.filter((x) => x.id !== id);
  }
  saveCart(c);
  renderCart();
}
function removeItem(id) {
  saveCart(getCart().filter((x) => x.id !== id));
  renderCart();
}
function totals() {
  const sub = getCart().reduce((s, i) => {
    const p = PRODUCTS.find((x) => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const delivery = sub > 0 ? CONFIG.delivery : 0;
  return { sub, delivery, total: sub + delivery };
}
function renderCart() {
  const c = getCart().filter((i) => PRODUCTS.some((p) => p.id === i.id)),
    box = $("#cartbox");
  if (!c.length) {
    box.innerHTML =
      '<p class="empty">Your cart is empty. <a class="btn" href="menu.html">Explore the menu</a></p>';
    return;
  }
  const t = totals();
  box.innerHTML =
    c
      .map((i) => {
        const p = PRODUCTS.find((x) => x.id === i.id);
        return `<div class="line"><span>${p.emoji} <b>${p.name}</b><br>${money(p.price)}</span>
   <span class="qty"><button aria-label="Decrease ${p.name}" onclick="changeQty('${p.id}',-1)">−</button><b>${i.qty}</b><button aria-label="Increase ${p.name}" onclick="changeQty('${p.id}',1)">+</button></span>
   <span>${money(p.price * i.qty)}</span><button class="link" onclick="removeItem('${p.id}')">Remove</button></div>`;
      })
      .join("") +
    `<div class="sum"><p>Subtotal <b>${money(t.sub)}</b></p><p>Delivery <b>${money(t.delivery)}</b></p><p>Total <b>${money(t.total)}</b></p>
  ${t.sub < CONFIG.minOrder ? `<p class="err">Minimum order is ${money(CONFIG.minOrder)}.</p>` : '<a class="btn" href="checkout.html">Proceed to Checkout</a>'}</div>`;
}
