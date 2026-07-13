import * as billingService from '../services/billingService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { checkoutSchema, holdOrderSchema, splitOrderSchema, voidRefundSchema } from '../validators/billingValidator.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

export const checkoutCart = asyncHandler(async (req, res) => {
  const parse = checkoutSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const result = await billingService.checkoutCart(parse.data, req.scope, req.user._id, req);
  logger.info(`Cart checked out by user: ${req.user.username}`);
  return sendSuccess(res, 'Cart checkout finalized successfully.', result, 201);
});

export const holdOrder = asyncHandler(async (req, res) => {
  const parse = holdOrderSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const order = await billingService.holdOrder(parse.data, req.scope, req.user._id, req);
  logger.info(`Order placed on hold by user: ${req.user.username}`);
  return sendSuccess(res, 'Order placed on hold.', { order }, 201);
});

export const resumeOrder = asyncHandler(async (req, res) => {
  const order = await billingService.resumeOrder(req.params.id, req.scope, req.user._id, req);
  logger.info(`Held order ${req.params.id} resumed by user: ${req.user.username}`);
  return sendSuccess(res, 'Held order resumed.', { order });
});

export const cancelHoldOrder = asyncHandler(async (req, res) => {
  const order = await billingService.cancelHoldOrder(req.params.id, req.scope, req.user._id, req);
  logger.info(`Held order ${req.params.id} cancelled by user: ${req.user.username}`);
  return sendSuccess(res, 'Held order cancelled.', { order });
});

export const splitOrder = asyncHandler(async (req, res) => {
  const parse = splitOrderSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const result = await billingService.splitOrder(parse.data, req.scope, req.user._id, req);
  logger.info(`Order split processed by user: ${req.user.username}`);
  return sendSuccess(res, 'Bill split processed successfully.', result, 201);
});

export const voidOrder = asyncHandler(async (req, res) => {
  const parse = voidRefundSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const order = await billingService.voidOrder(req.params.id, parse.data.reason, req.scope, req.user._id, req);
  logger.info(`Order ${req.params.id} voided by user: ${req.user.username}`);
  return sendSuccess(res, 'Order voided successfully.', { order });
});

export const refundOrder = asyncHandler(async (req, res) => {
  const parse = voidRefundSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const order = await billingService.refundOrder(req.params.id, parse.data.reason, req.scope, req.user._id, req);
  logger.info(`Order ${req.params.id} refunded by user: ${req.user.username}`);
  return sendSuccess(res, 'Order refunded successfully.', { order });
});

export const getOrdersList = asyncHandler(async (req, res) => {
  const result = await billingService.getOrdersList(req.query, req.scope, req.user.role);
  return sendSuccess(res, 'Orders retrieved successfully.', result);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const result = await billingService.getOrderById(req.params.id, req.scope);
  return sendSuccess(res, 'Order details retrieved.', result);
});
