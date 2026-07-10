import { z } from 'zod';
import { PASSWORD_BLACKLIST } from '../constants/auth.js';
import { sendError } from '../utils/responseHandler.js';

// Username criteria: 4-20 chars, letters, numbers, underscores
const usernameSchema = z.string()
  .min(4, 'Username must be at least 4 characters')
  .max(20, 'Username cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// Email criteria
const emailSchema = z.string()
  .email('Please provide a valid email address')
  .toLowerCase();

// Password criteria
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  .refine(
    (val) => !PASSWORD_BLACKLIST.includes(val.toLowerCase()),
    { message: 'This password is too common and weak. Please choose a stronger one.' }
  );

export const registerSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  inviteCode: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Validator middleware runner
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Extract first error message
    const firstError = result.error.errors[0]?.message || 'Validation failed';
    return sendError(res, firstError, 400);
  }
  req.validatedBody = result.data;
  next();
};
