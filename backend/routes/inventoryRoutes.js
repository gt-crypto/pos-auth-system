import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

// Protect all routes under inventory module
router.use(protect);
router.use(branchScope);

router.post('/', hasPermission(PERMISSIONS.CREATE_INVENTORY), inventoryController.createInventory);
router.get('/', hasPermission(PERMISSIONS.READ_INVENTORY), inventoryController.getInventory);
router.get('/low-stock', hasPermission(PERMISSIONS.READ_INVENTORY), inventoryController.getLowStock);
router.get('/history', hasPermission(PERMISSIONS.READ_INVENTORY_HISTORY), inventoryController.getInventoryHistory);
router.get('/metrics', hasPermission(PERMISSIONS.READ_INVENTORY), inventoryController.getDashboardMetrics);
router.get('/:id', hasPermission(PERMISSIONS.READ_INVENTORY), inventoryController.getInventoryById);
router.put('/:id', hasPermission(PERMISSIONS.UPDATE_INVENTORY), inventoryController.updateInventory);
router.post('/restock', hasPermission(PERMISSIONS.RESTOCK_INVENTORY), inventoryController.restockInventory);
router.post('/adjust', hasPermission(PERMISSIONS.ADJUST_INVENTORY), inventoryController.adjustInventory);
router.post('/transfer', hasPermission(PERMISSIONS.TRANSFER_INVENTORY), inventoryController.transferInventory);

export default router;
