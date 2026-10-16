// Copies js/products.js into MySQL (keeps one source of truth). Run: npm run seed
require("dotenv").config(); const fs=require("fs"), mysql=require("mysql2/promise");
(async()=>{
  const P=new Function(fs.readFileSync("../js/products.js","utf8")+";return PRODUCTS")();
  const db=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  for(const p of P) await db.execute("REPLACE INTO products(id,name,category,price,description,available,rating) VALUES(?,?,?,?,?,?,?)",[p.id,p.name,p.category,p.price,p.desc,p.avail?1:0,p.rating]);
  console.log("Seeded",P.length,"products"); await db.end();
})();
