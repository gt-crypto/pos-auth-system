import * as billingService from '../services/billingService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { checkoutSchema, holdOrderSchema, splitOrderSchema, voidRefundSchema } from '../validators/billingValidator.js';

const handleErr = (res, err) => {
  if (err.status) return sendError(res, err.message, err.status);
  console.error(err);
  return sendError(res, 'Internal server error', 500);
};

export const checkoutCart = async (req, res) => {
  try {
    const parse = checkoutSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const result = await billingService.checkoutCart(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Cart checkout finalized successfully.', result, 201);
  } catch (err) { return handleErr(res, err); }
};

export const holdOrder = async (req, res) => {
  try {
    const parse = holdOrderSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const order = await billingService.holdOrder(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Order placed on hold.', { order }, 201);
  } catch (err) { return handleErr(res, err); }
};

export const resumeOrder = async (req, res) => {
  try {
    const order = await billingService.resumeOrder(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Held order resumed.', { order });
  } catch (err) { return handleErr(res, err); }
};

export const cancelHoldOrder = async (req, res) => {
  try {
    const order = await billingService.cancelHoldOrder(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Held order cancelled.', { order });
  } catch (err) { return handleErr(res, err); }
};

export const splitOrder = async (req, res) => {
  try {
    const parse = splitOrderSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const result = await billingService.splitOrder(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Bill split processed successfully.', result, 201);
  } catch (err) { return handleErr(res, err); }
};

export const voidOrder = async (req, res) => {
  try {
    const parse = voidRefundSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const order = await billingService.voidOrder(req.params.id, parse.data.reason, req.scope, req.user._id, req);
    return sendSuccess(res, 'Order voided successfully.', { order });
  } catch (err) { return handleErr(res, err); }
};

export const refundOrder = async (req, res) => {
  try {
    const parse = voidRefundSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const order = await billingService.refundOrder(req.params.id, parse.data.reason, req.scope, req.user._id, req);
    return sendSuccess(res, 'Order refunded successfully.', { order });
  } catch (err) { return handleErr(res, err); }
};

export const getOrdersList = async (req, res) => {
  try {
    const result = await billingService.getOrdersList(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Orders retrieved successfully.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getOrderById = async (req, res) => {
  try {
    const result = await billingService.getOrderById(req.params.id, req.scope);
    return sendSuccess(res, 'Order details retrieved.', result);
  } catch (err) { return handleErr(res, err); }
};
