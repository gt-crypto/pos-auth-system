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

/**
 * Checks if password meets individual complexity rules
 */
export const checkPasswordCriteria = (password = '') => {
  return {
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
    isLongEnough: password.length >= 8,
    isNotBlacklisted: !PASSWORD_BLACKLIST.includes(password.toLowerCase())
  };
};

/**
 * Calculates score from 0 (very weak) to 3 (strong)
 */
export const calculatePasswordStrength = (password = '') => {
  if (!password) return { score: 0, text: 'None', color: 'bg-slate-700' };

  const criteria = checkPasswordCriteria(password);
  
  // Count how many criteria are met (excluding blacklist since that is a hard blocker)
  let metCount = 0;
  if (criteria.hasUppercase) metCount++;
  if (criteria.hasLowercase) metCount++;
  if (criteria.hasNumber) metCount++;
  if (criteria.hasSpecialChar) metCount++;
  if (criteria.isLongEnough) metCount++;

  // Hard blocker check
  if (!criteria.isNotBlacklisted) {
    return { score: 0, text: 'Common/Weak', color: 'bg-rose-500' };
  }

  if (metCount <= 2) {
    return { score: 1, text: 'Weak', color: 'bg-rose-500' };
  } else if (metCount <= 4) {
    return { score: 2, text: 'Medium', color: 'bg-amber-500' };
  } else {
    return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
  }
};
