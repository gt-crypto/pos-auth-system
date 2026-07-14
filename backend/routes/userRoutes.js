import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { hasPermission } from '../middleware/authorize.js';
import { branchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { validateBody } from '../validators/authValidator.js';
import { 
  createUserSchema, 
  updateUserSchema, 
  updateUserStatusSchema 
} from '../validators/userValidator.js';
import { 
  createUser, 
  getAllUsers, 
  getMe, 
  getUserById, 
  updateUser, 
  updateUserStatus, 
  deactivateUser,
  getPendingUsers,
  approveUser,
  rejectUser
} from '../controllers/userController.js';

const router = express.Router();

// Apply protection and scope to all user CRUD endpoints
router.use(protect);
router.use(branchScope);

router.get('/me', getMe);
router.get('/pending', hasPermission(PERMISSIONS.APPROVE_USER), getPendingUsers);
router.get('/', hasPermission(PERMISSIONS.READ_USER), getAllUsers);
router.get('/:id', hasPermission(PERMISSIONS.READ_USER), getUserById);

router.post('/', hasPermission(PERMISSIONS.CREATE_USER), validateBody(createUserSchema), createUser);
router.patch('/:id', hasPermission(PERMISSIONS.UPDATE_USER), validateBody(updateUserSchema), updateUser);
router.patch('/:id/status', hasPermission(PERMISSIONS.UPDATE_USER_STATUS), validateBody(updateUserStatusSchema), updateUserStatus);
router.patch('/:id/deactivate', hasPermission(PERMISSIONS.UPDATE_USER_STATUS), deactivateUser);
router.post('/:id/approve', hasPermission(PERMISSIONS.APPROVE_USER), approveUser);
router.post('/:id/reject', hasPermission(PERMISSIONS.REJECT_USER), rejectUser);

export default router;
