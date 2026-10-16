// Validates the form, saves a DEMO order draft, then goes to payment.html. Cart is NOT cleared here.
document.addEventListener("DOMContentLoaded", async () => {
  await productsReady;
  const form = $("#form"),
    t = totals();
  if (!getCart().length) {
    form.outerHTML =
      '<p class="empty">Your cart is empty. <a href="menu.html">Browse the menu</a></p>';
    $("#summary").remove();
    return;
  }
  if (!CONFIG.codEnabled) $("#codopt").remove();
  $("#summary").innerHTML =
    `<h2>Order summary</h2>` +
    getCart()
      .map((i) => {
        const p = PRODUCTS.find((x) => x.id === i.id);
        return `<p>${p.name} × ${i.qty} <b>${money(p.price * i.qty)}</b></p>`;
      })
      .join("") +
    `<p>Subtotal <b>${money(t.sub)}</b></p><p>Delivery <b>${money(t.delivery)}</b></p><p>Total <b>${money(t.total)}</b></p>`;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form),
      err = {};
    const phone = (f.get("phone") || "").replace(/[\s-]/g, "");
    if (!f.get("name").trim()) err.name = "Enter your full name.";
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(phone))
      err.phone = "Enter a valid Bangladeshi mobile number, e.g. 01712345678.";
    if (f.get("email") && !/^\S+@\S+\.\S+$/.test(f.get("email")))
      err.email = "Enter a valid email or leave it empty.";
    if (!f.get("address").trim()) err.address = "Enter your delivery address.";
    if (!f.get("area").trim()) err.area = "Enter your city or area.";
    if (!f.get("method")) err.method = "Choose a payment method.";
    else if (t.sub < CONFIG.minOrder)
      err.method = `Minimum order is ${money(CONFIG.minOrder)}.`;
    document.querySelectorAll(".err").forEach((x) => (x.textContent = ""));
    for (const k in err) $("#e-" + k).textContent = err[k];
    if (Object.keys(err).length) return;
    const order = {
      ref: "FLV-" + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString(),
      customer: {
        name: f.get("name").trim(),
        phone,
        email: f.get("email"),
        address: f.get("address").trim(),
        area: f.get("area").trim(),
        notes: f.get("notes"),
      },
      items: getCart().map((i) => {
        const p = PRODUCTS.find((x) => x.id === i.id);
        return { name: p.name, qty: i.qty, price: p.price };
      }),
      totals: t,
      method: f.get("method"),
      orderStatus: "Draft",
      paymentStatus: "Not verified",
    };
    localStorage.setItem("flavoria_order", JSON.stringify(order));
    location.href = "payment.html";
  });
});
