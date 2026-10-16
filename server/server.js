// Flavoria API: Express + MySQL. Prices are ALWAYS read from the database, never trusted from the browser.
require("dotenv").config();
const express=require("express"), cors=require("cors"), rateLimit=require("express-rate-limit"), mysql=require("mysql2/promise");
const nodemailer=require("nodemailer");
const mailer=process.env.SMTP_HOST?nodemailer.createTransport({host:process.env.SMTP_HOST,port:587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}):null;
const notify=(subject,text)=>mailer&&mailer.sendMail({from:process.env.SMTP_USER,to:process.env.NOTIFY_EMAIL,subject,text}).catch(e=>console.error("mail",e.message));
const app=express(); app.use(express.json({limit:"50kb"})); app.use(cors({origin:process.env.FRONTEND_ORIGIN}));
const pool=mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:10});
const DELIVERY=60, MIN_ORDER=300; // keep in sync with js/config.js
const PHONE=/^(\+?88)?01[3-9]\d{8}$/;

app.get("/api/products",async(_,res)=>{ const [r]=await pool.query("SELECT * FROM products"); res.json(r); });

app.post("/api/orders",rateLimit({windowMs:60000,max:10}),async(req,res)=>{
  const {customer:c={},items=[],method,payment={}}=req.body||{};
  const phone=String(c.phone||"").replace(/[\s-]/g,"");
  if(!c.name?.trim()||!PHONE.test(phone)||!c.address?.trim()||!c.area?.trim()||!["whatsapp","bkash","cod"].includes(method)||!Array.isArray(items)||!items.length||items.length>50)
    return res.status(400).json({error:"Invalid order details."});
  if(method==="bkash"&&(!/^[A-Za-z0-9]{8,12}$/.test(payment.trx||"")||!PHONE.test(payment.sender||"")))
    return res.status(400).json({error:"Invalid bKash TrxID or sender number."});
  const conn=await pool.getConnection();
  try{
    const ids=items.map(i=>String(i.id)); const [rows]=await conn.query("SELECT * FROM products WHERE id IN (?) AND available=1",[ids]);
    let sub=0; const lines=[];
    for(const i of items){ const p=rows.find(r=>r.id===i.id), q=Number(i.qty);
      if(!p||!Number.isInteger(q)||q<1||q>50) return res.status(400).json({error:"An item is unavailable or invalid."});
      sub+=p.price*q; lines.push([p.id,p.name,p.price,q]); }
    if(sub<MIN_ORDER) return res.status(400).json({error:`Minimum order is ${MIN_ORDER}.`});
    const ref="FLV-"+Date.now().toString(36).toUpperCase();
    await conn.beginTransaction();
    await conn.execute("INSERT INTO orders(ref,customer_name,phone,email,address,area,notes,subtotal,delivery,total,method,bkash_trx,bkash_sender,bkash_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [ref,c.name.trim(),phone,c.email||null,c.address.trim(),c.area.trim(),c.notes||null,sub,DELIVERY,sub+DELIVERY,method,payment.trx||null,payment.sender||null,payment.type||null]);
    for(const l of lines) await conn.execute("INSERT INTO order_items(order_ref,product_id,name,price,qty) VALUES(?,?,?,?,?)",[ref,...l]);
    await conn.commit(); notify("New order "+ref,lines.map(l=>l[3]+" x "+l[1]).join("\n")+`\nTotal ${sub+DELIVERY}\n${c.name} ${phone}\n${c.address}, ${c.area}\nPayment: ${method} ${payment.trx||""} (UNVERIFIED)`);
    res.json({ref,total:sub+DELIVERY});
  }catch(e){ await conn.rollback(); console.error(e); res.status(500).json({error:"Server error. Please try again."}); }
  finally{ conn.release(); }
});

// ---- Admin (protect with ADMIN_KEY header; use a real login before going public) ----
const admin=(req,res,next)=>req.get("x-admin-key")&&req.get("x-admin-key")===process.env.ADMIN_KEY?next():res.status(401).json({error:"Unauthorized"});
app.get("/api/admin/orders",admin,async(_,res)=>{
  const [o]=await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
  const [it]=await pool.query("SELECT * FROM order_items WHERE order_ref IN (SELECT ref FROM (SELECT ref FROM orders ORDER BY created_at DESC LIMIT 200) t)");
  res.json(o.map(x=>({...x,items:it.filter(i=>i.order_ref===x.ref)})));
});
app.patch("/api/admin/orders/:ref",admin,async(req,res)=>{ // you mark payment 'verified' ONLY after checking the TrxID in your bKash app
  const {order_status,payment_status}=req.body||{};
  await pool.execute("UPDATE orders SET order_status=COALESCE(?,order_status),payment_status=COALESCE(?,payment_status) WHERE ref=?",[order_status||null,payment_status||null,req.params.ref]);
  res.json({ok:true});
});
app.patch("/api/admin/products/:id",admin,async(req,res)=>{
  const {price,available}=req.body||{};
  if(price!==undefined&&!(Number.isInteger(price)&&price>0)) return res.status(400).json({error:"Bad price"});
  await pool.execute("UPDATE products SET price=COALESCE(?,price),available=COALESCE(?,available) WHERE id=?",[price??null,available===undefined?null:(available?1:0),req.params.id]);
  res.json({ok:true});
});
app.listen(process.env.PORT||3000,()=>console.log("Flavoria API running"));
