const express = require('express');
const ctrl = require('../controllers/productController');
const { validateObjectId, validateProductBody, validateStockChange } = require('../middleware/validate');

const router = express.Router();

// Report routes MUST come before "/:id", otherwise "low-stock" is treated as an id
router.get('/low-stock', ctrl.getLowStock);
router.get('/summary', ctrl.getCategorySummary);

router.route('/')
  .get(ctrl.getProducts)
  .post(validateProductBody, ctrl.createProduct);

router.route('/:id')
  .get(validateObjectId, ctrl.getProductById)
  .put(validateObjectId, validateProductBody, ctrl.updateProduct)
  .delete(validateObjectId, ctrl.deleteProduct);

router.patch('/:id/stock', validateObjectId, validateStockChange, ctrl.adjustStock);

module.exports = router;
