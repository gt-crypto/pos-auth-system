import * as userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.validatedBody, req.user, req);
    return sendSuccess(res, 'User created successfully', { user }, 201);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.scope);
    return sendSuccess(res, 'Users retrieved successfully', { users });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Session profile retrieved', { user: req.user });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.scope);
    return sendSuccess(res, 'User details retrieved successfully', { user });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUser(req.params.id, req.validatedBody, req.user, req);
    return sendSuccess(res, 'User updated successfully', { user: updatedUser });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUserStatus(req.params.id, req.validatedBody.status, req.user, req);
    return sendSuccess(res, 'User status updated successfully', { user: updatedUser });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.deactivateUser(req.params.id, req.user, req);
    return sendSuccess(res, 'User deactivated (soft-deleted) successfully', { user: updatedUser });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};
