// Seeds 12 sample products across 5 categories. Run: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MS-101', category: 'Electronics', price: 799, quantity: 45, reorderLevel: 10, supplier: 'Logitech India' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-KB-204', category: 'Electronics', price: 3499, quantity: 18, reorderLevel: 5, supplier: 'Redragon' },
  { name: '27-inch Monitor', sku: 'ELEC-MN-327', category: 'Electronics', price: 14999, quantity: 3, reorderLevel: 5, supplier: 'LG Electronics' },
  { name: 'USB-C Hub', sku: 'ELEC-HB-410', category: 'Electronics', price: 1299, quantity: 30, reorderLevel: 8, supplier: 'Portronics' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-110', category: 'Apparel', price: 499, quantity: 60, reorderLevel: 15, supplier: 'Bewakoof' },
  { name: 'Denim Jacket', sku: 'APRL-JK-220', category: 'Apparel', price: 2299, quantity: 6, reorderLevel: 8, supplier: "Levi's" },
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Ergonomic Chair', sku: 'FURN-CH-905', category: 'Furniture', price: 8999, quantity: 12, reorderLevel: 3, supplier: 'Green Soul' },
  { name: 'A4 Notebook Pack', sku: 'STNY-NB-301', category: 'Stationery', price: 250, quantity: 120, reorderLevel: 30, supplier: 'Classmate' },
  { name: 'Gel Pen Pack of 10', sku: 'STNY-PN-512', category: 'Stationery', price: 90, quantity: 15, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-050', category: 'Grocery', price: 650, quantity: 40, reorderLevel: 10, supplier: 'India Gate' },
  { name: 'Green Tea 100 Bags', sku: 'GROC-TE-100', category: 'Grocery', price: 399, quantity: 25, reorderLevel: 10, supplier: 'Lipton' },
];

(async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    await Product.syncIndexes();
    const created = await Product.insertMany(products);
    console.log(`[seed] inserted ${created.length} products`);
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
