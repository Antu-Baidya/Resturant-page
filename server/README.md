1. Install Node.js 18+ and MySQL 8.
2. mysql -u root -p < schema.sql
3. cp .env.example .env   (fill in values)
4. npm install && npm run seed && npm start
5. Serve the site (e.g. VS Code Live Server on port 5500) and place a test order.
Admin: GET http://localhost:3000/api/admin/orders with header x-admin-key: <ADMIN_KEY>
Admin panel: open /admin.html in the site and enter your ADMIN_KEY (orders, payment verification, prices, availability).
Menu: pages load products from MySQL; if the API is unreachable they fall back to js/products.js.
Order alert emails: fill SMTP_* and NOTIFY_EMAIL in .env (run npm install again).
