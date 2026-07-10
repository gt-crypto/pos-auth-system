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

const handleErr = (res, err) => {
  if (err.status) return sendError(res, err.message, err.status);
  console.error(err);
  return sendError(res, 'Internal server error', 500);
};

// ---------- Customer Controllers ----------

export const createCustomerCtrl = async (req, res) => {
  try {
    const parse = createCustomerSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);
    const customer = await createCustomer(parse.data, req.user, req.scope);
    return sendSuccess(res, 'Customer created successfully.', { customer }, 201);
  } catch (err) { return handleErr(res, err); }
};

export const getCustomersCtrl = async (req, res) => {
  try {
    const result = await getCustomers(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Customers fetched.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getCustomerByIdCtrl = async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id, req.scope, req.user.role);
    return sendSuccess(res, 'Customer fetched.', { customer });
  } catch (err) { return handleErr(res, err); }
};

export const updateCustomerCtrl = async (req, res) => {
  try {
    const parse = updateCustomerSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);
    const customer = await updateCustomer(req.params.id, parse.data, req.user, req.scope, req.user.role);
    return sendSuccess(res, 'Customer updated.', { customer });
  } catch (err) { return handleErr(res, err); }
};

export const archiveCustomerCtrl = async (req, res) => {
  try {
    const customer = await archiveCustomer(req.params.id, req.user, req.scope, req.user.role);
    return sendSuccess(res, 'Customer archived.', { customer });
  } catch (err) { return handleErr(res, err); }
};

export const restoreCustomerCtrl = async (req, res) => {
  try {
    const customer = await restoreCustomer(req.params.id, req.user, req.scope, req.user.role);
    return sendSuccess(res, 'Customer restored.', { customer });
  } catch (err) { return handleErr(res, err); }
};

export const searchCustomersCtrl = async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q || q.length < 1) return sendSuccess(res, 'No query provided.', { customers: [] });
    const customers = await searchCustomers(q, req.scope, req.user.role);
    return sendSuccess(res, 'Search results.', { customers });
  } catch (err) { return handleErr(res, err); }
};

export const getCustomerHistoryCtrl = async (req, res) => {
  try {
    const result = await getCustomerHistory(req.params.id, req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Purchase history fetched.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getCustomerMetricsCtrl = async (req, res) => {
  try {
    const metrics = await getCustomerMetrics(req.scope, req.user.role);
    return sendSuccess(res, 'Customer metrics fetched.', { metrics });
  } catch (err) { return handleErr(res, err); }
};

// ---------- Order Controllers ----------

export const createOrderCtrl = async (req, res) => {
  try {
    const parse = createOrderSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);
    const order = await createOrder(parse.data, req.user, req.scope);
    return sendSuccess(res, 'Order created successfully.', { order }, 201);
  } catch (err) { return handleErr(res, err); }
};

export const getOrdersCtrl = async (req, res) => {
  try {
    const result = await getOrders(req.query, req.scope, req.user.role);
    return sendSuccess(res, 'Orders fetched.', result);
  } catch (err) { return handleErr(res, err); }
};
