const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const SORTABLE = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier', 'createdAt', 'updatedAt'];

// Escape user input before using it inside a RegExp
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * POST /api/products
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

/**
 * GET /api/products
 * Query params:
 *   category=Electronics            (comma list allowed: Electronics,Apparel)
 *   supplier=IKEA                   (partial, case-insensitive)
 *   search=pen                      (partial match on name or sku)
 *   minPrice=100&maxPrice=5000
 *   minQty=0&maxQty=50
 *   inStock=true|false
 *   sort=-price,name                (prefix "-" for descending)
 *   page=1&limit=10                 (limit max 100)
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, minQty, maxQty, inStock, sort } = req.query;
  const filter = {};

  if (category) filter.category = { $in: category.split(',').map((c) => c.trim()) };
  if (supplier) filter.supplier = { $regex: escapeRegex(supplier), $options: 'i' };
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: rx }, { sku: rx }];
  }

  const range = (min, max) => {
    const r = {};
    if (min !== undefined && min !== '') r.$gte = Number(min);
    if (max !== undefined && max !== '') r.$lte = Number(max);
    if (Object.values(r).some(Number.isNaN)) throw new ApiError(400, 'Range filters must be numbers');
    return Object.keys(r).length ? r : null;
  };
  const priceRange = range(minPrice, maxPrice);
  if (priceRange) filter.price = priceRange;
  const qtyRange = range(minQty, maxQty);
  if (qtyRange) filter.quantity = qtyRange;

  if (inStock === 'true') filter.quantity = { ...(filter.quantity || {}), $gt: 0 };
  if (inStock === 'false') filter.quantity = 0;

  // Sorting: whitelist fields so users can't sort on arbitrary paths
  let sortBy = { createdAt: 1 };
  if (sort) {
    sortBy = {};
    for (const raw of sort.split(',')) {
      const field = raw.trim().replace(/^-/, '');
      if (!SORTABLE.includes(field)) throw new ApiError(400, `Cannot sort by "${field}". Allowed: ${SORTABLE.join(', ')}`);
      sortBy[field] = raw.trim().startsWith('-') ? -1 : 1;
    }
  }
  sortBy._id = sortBy._id || 1; // stable pagination

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip(skip).limit(limit),
  ]);

  res.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

/**
 * GET /api/products/:id
 */
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});

/**
 * PUT /api/products/:id — update product details
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});

/**
 * PATCH /api/products/:id/stock — { "change": 10 } restock / { "change": -3 } sale
 * Atomic: the quantity check and the $inc happen in one operation,
 * so two simultaneous sales can never push stock below zero.
 */
exports.adjustStock = asyncHandler(async (req, res) => {
  const { change } = req.body;
  const filter = { _id: req.params.id };
  if (change < 0) filter.quantity = { $gte: -change };

  const product = await Product.findOneAndUpdate(filter, { $inc: { quantity: change } }, { new: true });

  if (!product) {
    const existing = await Product.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Product not found');
    throw new ApiError(400, `Insufficient stock: only ${existing.quantity} unit(s) available, tried to remove ${-change}`);
  }

  res.json({
    message: 'Stock updated',
    product,
    ...(product.quantity <= product.reorderLevel && {
      warning: `Low stock: ${product.quantity} left (reorder level ${product.reorderLevel})`,
    }),
  });
});

/**
 * DELETE /api/products/:id
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ message: 'Product deleted', id: product.id });
});

/**
 * GET /api/products/low-stock — items where quantity <= reorderLevel
 */
exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({
    quantity: 1,
    name: 1,
  });
  res.json({ count: lowStockItems.length, lowStockItems });
});

/**
 * GET /api/products/summary — category-wise inventory report (aggregation pipeline)
 */
exports.getCategorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] },
        },
      },
    },
    { $addFields: { avgPrice: { $round: ['$avgPrice', 2] } } },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.json({ categories: summary.length, summary });
});
