import * as userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.validatedBody, req.user, req);
  logger.info(`User '${user.username}' created by admin: ${req.user.username}`);
  return sendSuccess(res, 'User created successfully', { user }, 201);
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers(req.scope);
  return sendSuccess(res, 'Users retrieved successfully', { users });
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Session profile retrieved', { user: req.user });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id, req.scope);
  return sendSuccess(res, 'User details retrieved successfully', { user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUser(req.params.id, req.validatedBody, req.user, req);
  logger.info(`User '${updatedUser.username}' updated by admin: ${req.user.username}`);
  return sendSuccess(res, 'User updated successfully', { user: updatedUser });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUserStatus(req.params.id, req.validatedBody.status, req.user, req);
  logger.info(`User '${updatedUser.username}' status set to '${updatedUser.status}' by admin: ${req.user.username}`);
  return sendSuccess(res, 'User status updated successfully', { user: updatedUser });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const updatedUser = await userService.deactivateUser(req.params.id, req.user, req);
  logger.info(`User '${updatedUser.username}' deactivated by admin: ${req.user.username}`);
  return sendSuccess(res, 'User deactivated (soft-deleted) successfully', { user: updatedUser });
});

export const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await userService.getPendingUsers();
  return sendSuccess(res, 'Pending user accounts retrieved', { users });
});

export const approveUser = asyncHandler(async (req, res) => {
  const user = await userService.approveUser(req.params.id, req.user, req);
  logger.info(`User '${user.username}' approved by Super Admin: ${req.user.username}`);
  return sendSuccess(res, 'User account approved and activated successfully', { user });
});

export const rejectUser = asyncHandler(async (req, res) => {
  const user = await userService.rejectUser(req.params.id, req.user, req);
  logger.info(`User '${user.username}' rejected by Super Admin: ${req.user.username}`);
  return sendSuccess(res, 'User account application rejected', { user });
});
