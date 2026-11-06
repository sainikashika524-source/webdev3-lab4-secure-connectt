const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '100kb' }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`));
  next();
});

app.get('/', (req, res) =>
  res.json({
    message: 'Inventory API is running',
    endpoints: [
      'POST   /api/products',
      'GET    /api/products?category=&search=&minPrice=&maxPrice=&sort=&page=&limit=',
      'GET    /api/products/:id',
      'PUT    /api/products/:id',
      'PATCH  /api/products/:id/stock   { "change": 10 }',
      'DELETE /api/products/:id',
      'GET    /api/products/low-stock',
      'GET    /api/products/summary',
    ],
  })
);

app.use('/api/products', productRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
