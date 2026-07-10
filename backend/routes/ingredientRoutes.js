import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { sendError } from '../utils/responseHandler.js';
import * as ingredientController from '../controllers/ingredientController.js';

const router = express.Router();

// Helper middleware checking role permission + hasIngredientsAccess cashier override
const checkIngredientPermission = () => {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Not authorized', 401);

    const role = req.user.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return next();
    }

    if (role === 'CASHIER' && req.user.hasIngredientsAccess === true) {
      return next();
    }

    return sendError(res, 'Access denied: you do not have permission to access Kitchen Ingredients.', 403);
  };
};

router.use(protect);
router.use(branchScope);
router.use(checkIngredientPermission());

router.get('/', ingredientController.getIngredients);
router.get('/metrics', ingredientController.getIngredientMetrics);
router.get('/low-stock', ingredientController.getLowStockIngredients);
router.get('/history', ingredientController.getIngredientHistory);
router.get('/:id', ingredientController.getIngredientById);

router.post('/', ingredientController.createIngredient);
router.put('/:id', ingredientController.updateIngredient);
router.delete('/:id', ingredientController.archiveIngredient);
router.post('/:id/restore', ingredientController.restoreIngredient);

router.post('/restock', ingredientController.restockIngredient);
router.post('/adjust', ingredientController.adjustIngredient);
router.post('/transfer', ingredientController.transferIngredient);

// PATCH routes for Module 12 compliance
router.patch('/:id/restore', ingredientController.restoreIngredient);
router.patch('/:id/stock', ingredientController.updateStock);
router.patch('/:id/status', ingredientController.updateStatus);

export default router;
