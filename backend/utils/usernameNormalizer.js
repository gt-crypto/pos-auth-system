/**
 * Normalizes username inputs consistently by trimming leading/trailing
 * whitespace and converting to lowercase.
 *
 * @param {string} username - Raw username input
 * @returns {string} Normalized username
 */
export const normalizeUsername = (username) => {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
};
