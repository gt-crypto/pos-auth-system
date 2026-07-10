export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER'
};

export const LOCKOUT_RULES = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000 // 15 minutes
};

export const PASSWORD_BLACKLIST = [
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'admin123',
  'admin',
  'cashier123',
  'pos12345'
];
