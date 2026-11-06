const mongoose = require('mongoose');

const CATEGORIES = ['Electronics', 'Apparel', 'Furniture', 'Stationery', 'Grocery', 'Other'];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'SKU must be at least 3 characters'],
      maxlength: [20, 'SKU cannot exceed 20 characters'],
      match: [/^[A-Z0-9]+(-[A-Z0-9]+)*$/, 'SKU may only contain letters, digits and dashes (e.g. STNY-PN-713)'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}` },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Reorder level must be a whole number' },
    },
    supplier: {
      type: String,
      trim: true,
      default: 'Unknown',
      maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Computed field: total value of stock on hand
productSchema.virtual('stockValue').get(function () {
  return this.price * this.quantity;
});

// Indexes used by filtering / reports
productSchema.index({ category: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);
module.exports.CATEGORIES = CATEGORIES;
