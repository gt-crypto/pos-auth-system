import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { hasPermission } from '../middleware/authorize.js';
import { branchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { validateBody } from '../validators/authValidator.js';
import { 
  createBranchSchema, 
  updateBranchSchema, 
  updateBranchStatusSchema 
} from '../validators/branchValidator.js';
import { 
  createBranch, 
  getAllBranches, 
  getBranchById, 
  updateBranch, 
  updateBranchStatus, 
  getMyBranch 
} from '../controllers/branchController.js';

const router = express.Router();

// Apply protection and scoping to all endpoints
router.use(protect);
router.use(branchScope);

router.get('/my', getMyBranch);
router.get('/', hasPermission(PERMISSIONS.READ_BRANCH), getAllBranches);
router.get('/:id', hasPermission(PERMISSIONS.READ_BRANCH), getBranchById);

router.post('/', hasPermission(PERMISSIONS.CREATE_BRANCH), validateBody(createBranchSchema), createBranch);
router.patch('/:id', hasPermission(PERMISSIONS.UPDATE_BRANCH), validateBody(updateBranchSchema), updateBranch);
router.patch('/:id/status', hasPermission(PERMISSIONS.UPDATE_BRANCH_STATUS), validateBody(updateBranchStatusSchema), updateBranchStatus);

export default router;
