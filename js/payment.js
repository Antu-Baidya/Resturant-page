// Payment page (manual methods) and order-success page. No payment is ever verified automatically.
const getOrder = () => {
  try {
    return JSON.parse(localStorage.getItem("flavoria_order"));
  } catch {
    return null;
  }
};
const LABEL = {
  whatsapp: "WhatsApp order",
  bkash: "Manual bKash",
  cod: "Cash on delivery",
};
function orderText(o) {
  return (
    `New order ${o.ref} - ${CONFIG.name}\n` +
    o.items
      .map((i) => `${i.qty} x ${i.name} = ${money(i.qty * i.price)}`)
      .join("\n") +
    `\nSubtotal ${money(o.totals.sub)}, Delivery ${money(o.totals.delivery)}, TOTAL ${money(o.totals.total)}\nPayment: ${LABEL[o.method]}${o.trx ? ` (TrxID ${o.trx}, sender ${o.sender}, ${o.bkType})` : ""}\n` +
    `Name: ${o.customer.name}\nPhone: ${o.customer.phone}\nAddress: ${o.customer.address}, ${o.customer.area}\nNotes: ${o.customer.notes || "-"}`
  );
}
const waLink = (o) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(orderText(o))}`;
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page,
    o = getOrder(),
    box = $("#paybox");
  if (!o) {
    box.innerHTML =
      '<p class="empty">No order in progress. <a href="menu.html">Browse the menu</a></p>';
    return;
  }
  if (page === "success") return showSuccess(o, box);
  let extra = "";
  if (o.method === "bkash")
    extra = `<div class="note"><p>Pay <b>${money(o.totals.total)}</b> to bKash number <b>${CONFIG.bkash}</b> using the type below. <b>Never share your bKash PIN or OTP with anyone; we never ask for it.</b></p>
   <label for="bt">Payment type</label><select id="bt">${CONFIG.bkashTypes.map((t) => `<option>${t}</option>`).join("")}</select>
   <label for="trx">Transaction ID (TrxID)</label><input id="trx" autocomplete="off"><label for="snd">Sender bKash number</label><input id="snd" inputmode="tel"><p class="err" id="pe"></p>
   <p class="muted">Your payment stays <b>unverified</b> until the restaurant checks it manually.</p></div>`;
  if (o.method === "whatsapp")
    extra =
      '<div class="note"><p>The button opens WhatsApp with your order. <b>You must press Send in WhatsApp</b> for the restaurant to receive it.</p></div>';
  if (o.method === "cod")
    extra = `<div class="note"><p>Pay <b>${money(o.totals.total)}</b> in cash when your order arrives.</p></div>`;
  box.innerHTML = `<h2>Order ${o.ref}</h2><p>Method: <b>${LABEL[o.method]}</b> · Total: <b>${money(o.totals.total)}</b></p>${extra}
   <button class="btn" id="go">${o.method === "whatsapp" ? "Open WhatsApp & submit order" : "Submit order"}</button> <a class="btn ghost" href="checkout.html">Back</a>`;
  $("#go").onclick = async () => {
    if (o.method === "bkash") {
      const trx = $("#trx").value.trim(),
        snd = $("#snd").value.replace(/[\s-]/g, "");
      if (
        !/^[A-Za-z0-9]{8,12}$/.test(trx) ||
        !/^(\+?88)?01[3-9]\d{8}$/.test(snd)
      ) {
        $("#pe").textContent =
          "Enter the TrxID (8–12 letters/numbers) and a valid sender number.";
        return;
      }
      Object.assign(o, { trx, sender: snd, bkType: $("#bt").value });
    }
    // Send the order to the MySQL backend; the server recalculates prices itself.
    try {
      const r = await fetch(CONFIG.apiUrl + "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: o.customer,
          items: getCart(),
          method: o.method,
          payment: { trx: o.trx, sender: o.sender, type: o.bkType },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Order failed");
      o.ref = d.ref;
      o.totals.total = d.total;
    } catch (e) {
      alert("Could not submit the order: " + e.message);
      return;
    }
    o.orderStatus = "Submitted (awaiting restaurant confirmation)";
    localStorage.setItem("flavoria_order", JSON.stringify(o));
    saveCart([]); // cart cleared only after the order is recorded
    if (o.method === "whatsapp") window.open(waLink(o), "_blank", "noopener");
    location.href = "order-success.html";
  };
});
function showSuccess(o, box) {
  if (!o.orderStatus.startsWith("Submitted")) {
    box.innerHTML =
      '<p class="empty">This order was not submitted. <a href="checkout.html">Go to checkout</a></p>';
    return;
  }
  box.innerHTML = `<h1>Order submitted</h1><p>Reference: <b>${o.ref}</b></p><p>Payment method: <b>${LABEL[o.method]}</b></p>
  <p>Payment status: <b>${o.method === "cod" ? "Pay on delivery" : "Not verified: the restaurant must confirm it"}</b></p>
  <p class="note">Demo notice: this frontend-only site cannot deliver orders to the restaurant by itself. Send your order with one of the buttons below.</p>
  <a class="btn" target="_blank" rel="noopener" href="${waLink(o)}">Send via WhatsApp</a>
  <a class="btn ghost" href="mailto:${CONFIG.email}?subject=${encodeURIComponent("Order " + o.ref)}&body=${encodeURIComponent(orderText(o))}">Send via Email</a>
  <a class="btn ghost" target="_blank" rel="noopener" href="${CONFIG.facebook}">Facebook page</a>
  <p><button class="link" id="clr">Clear demo order data from this browser</button></p>`;
  $("#clr").onclick = () => {
    localStorage.removeItem("flavoria_order");
    location.href = "index.html";
  };
}
