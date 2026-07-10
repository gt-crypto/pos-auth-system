import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as supplierController from '../controllers/supplierController.js';

const router = express.Router();

// Protect all routes under supplier module
router.use(protect);
router.use(branchScope);

router.post('/', hasPermission(PERMISSIONS.CREATE_SUPPLIER), supplierController.createSupplier);
router.get('/', hasPermission(PERMISSIONS.READ_SUPPLIER), supplierController.getSuppliers);
router.get('/active', hasPermission(PERMISSIONS.READ_SUPPLIER), supplierController.getActiveSuppliers);
router.get('/:id', hasPermission(PERMISSIONS.READ_SUPPLIER), supplierController.getSupplierById);
router.put('/:id', hasPermission(PERMISSIONS.UPDATE_SUPPLIER), supplierController.updateSupplier);
router.delete('/:id', hasPermission(PERMISSIONS.ARCHIVE_SUPPLIER), supplierController.deleteSupplier);
router.post('/:id/restore', hasPermission(PERMISSIONS.RESTORE_SUPPLIER), supplierController.restoreSupplier);

export default router;
