import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
  searchCustomers,
  getCustomerHistory,
  getCustomerMetrics,
  createOrder,
  getOrders
} from '../services/customerService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { createCustomerSchema, updateCustomerSchema, createOrderSchema } from '../validators/customerValidator.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// ---------- Customer Controllers ----------

export const createCustomerCtrl = asyncHandler(async (req, res) => {
  const parse = createCustomerSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const customer = await createCustomer(parse.data, req.user, req.scope);
  logger.info(`Customer '${customer.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Customer created successfully.', { customer }, 201);
});

export const getCustomersCtrl = asyncHandler(async (req, res) => {
  const result = await getCustomers(req.query, req.scope, req.user.role);
  return sendSuccess(res, 'Customers fetched.', result);
});

export const getCustomerByIdCtrl = asyncHandler(async (req, res) => {
  const customer = await getCustomerById(req.params.id, req.scope, req.user.role);
  return sendSuccess(res, 'Customer fetched.', { customer });
});

export const updateCustomerCtrl = asyncHandler(async (req, res) => {
  const parse = updateCustomerSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const customer = await updateCustomer(req.params.id, parse.data, req.user, req.scope, req.user.role);
  logger.info(`Customer '${customer.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Customer updated.', { customer });
});

export const archiveCustomerCtrl = asyncHandler(async (req, res) => {
  const customer = await archiveCustomer(req.params.id, req.user, req.scope, req.user.role);
  logger.info(`Customer ${req.params.id} archived by user: ${req.user.username}`);
  return sendSuccess(res, 'Customer archived.', { customer });
});

export const restoreCustomerCtrl = asyncHandler(async (req, res) => {
  const customer = await restoreCustomer(req.params.id, req.user, req.scope, req.user.role);
  logger.info(`Customer ${req.params.id} restored by user: ${req.user.username}`);
  return sendSuccess(res, 'Customer restored.', { customer });
});

export const searchCustomersCtrl = asyncHandler(async (req, res) => {
  const q = req.query.q ?? '';
  if (q.length < 1) return sendSuccess(res, 'No query provided.', { customers: [] });

  const customers = await searchCustomers(q, req.scope, req.user.role);
  return sendSuccess(res, 'Search results.', { customers });
});

export const getCustomerHistoryCtrl = asyncHandler(async (req, res) => {
  const result = await getCustomerHistory(req.params.id, req.query, req.scope, req.user.role);
  return sendSuccess(res, 'Purchase history fetched.', result);
});

export const getCustomerMetricsCtrl = asyncHandler(async (req, res) => {
  const metrics = await getCustomerMetrics(req.scope, req.user.role);
  return sendSuccess(res, 'Customer metrics fetched.', { metrics });
});

// ---------- Order Controllers ----------

export const createOrderCtrl = asyncHandler(async (req, res) => {
  const parse = createOrderSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const order = await createOrder(parse.data, req.user, req.scope);
  logger.info(`Order created for customer by user: ${req.user.username}`);
  return sendSuccess(res, 'Order created successfully.', { order }, 201);
});

export const getOrdersCtrl = asyncHandler(async (req, res) => {
  const result = await getOrders(req.query, req.scope, req.user.role);
  return sendSuccess(res, 'Orders fetched.', result);
});
