const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const ALLOWED_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];

// Rejects malformed ObjectIds before they hit the database
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError(400, `Invalid product id: ${req.params.id}`));
  }
  next();
};

// Body must be a JSON object and may only contain known product fields
const validateProductBody = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return next(new ApiError(400, 'Request body must be a non-empty JSON object'));
  }
  const unknown = Object.keys(body).filter((k) => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) {
    return next(new ApiError(400, `Unknown field(s): ${unknown.join(', ')}`));
  }
  next();
};

// PATCH /:id/stock — { "change": 10 } restock, { "change": -3 } sale
const validateStockChange = (req, res, next) => {
  const { change } = req.body || {};
  if (typeof change !== 'number' || !Number.isInteger(change) || change === 0) {
    return next(new ApiError(400, '"change" must be a non-zero integer (positive = restock, negative = sale)'));
  }
  next();
};

module.exports = { validateObjectId, validateProductBody, validateStockChange };
