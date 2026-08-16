/**
 * Common easily guessed passwords blacklist
 */
export const COMMON_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'letmein123',
  'waypoint123',
];

/**
 * Returns boolean status for each password policy requirement
 */
export function getPasswordValidationState(password = '') {
  const hasMinLength = password.length >= 8 && password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isCommon = COMMON_PASSWORDS.includes(password.toLowerCase().trim());
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial && !isCommon;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isCommon,
    isValid,
  };
}

/**
 * Returns a concise, natural English message explaining ONLY the missing password requirements.
 * Returns null if all requirements are satisfied.
 */
export function getMissingPasswordRequirementsMessage(password = '') {
  if (!password) {
    return 'Password is required.';
  }

  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }

  const isTooShort = password.length < 8;
  const missingUpper = !/[A-Z]/.test(password);
  const missingLower = !/[a-z]/.test(password);
  const missingNumber = !/[0-9]/.test(password);
  const missingSpecial = !/[^A-Za-z0-9]/.test(password);

  if (isTooShort) {
    const otherMissing = [];
    if (missingUpper) otherMissing.push('an uppercase letter');
    if (missingLower) otherMissing.push('a lowercase letter');
    if (missingNumber) otherMissing.push('a number');
    if (missingSpecial) otherMissing.push('a special character');

    if (otherMissing.length === 0) {
      return 'Password must be at least 8 characters.';
    }
    if (otherMissing.length === 1) {
      return `Password must be at least 8 characters and needs ${otherMissing[0]}.`;
    }
    const allExceptLast = otherMissing.slice(0, -1).join(', ');
    const last = otherMissing[otherMissing.length - 1];
    return `Password must be at least 8 characters and needs ${allExceptLast}, and ${last}.`;
  }

  const missing = [];
  if (missingUpper) missing.push('an uppercase letter');
  if (missingLower) missing.push('a lowercase letter');
  if (missingNumber) missing.push('a number');
  if (missingSpecial) missing.push('a special character');

  if (missing.length === 1) {
    return `Password needs ${missing[0]}.`;
  }

  if (missing.length === 2) {
    return `Password needs ${missing[0]} and ${missing[1]}.`;
  }

  if (missing.length > 2) {
    const allExceptLast = missing.slice(0, -1).join(', ');
    const last = missing[missing.length - 1];
    return `Password needs ${allExceptLast}, and ${last}.`;
  }

  // All structural rules pass — now check if it is an overly common password
  const isCommon = COMMON_PASSWORDS.includes(password.toLowerCase().trim());
  if (isCommon) {
    return 'Password is too common and easily guessed.';
  }

  return null;
}

/**
 * Validates a password string and returns { valid: boolean, message?: string }
 */
export function validatePassword(password = '') {
  const message = getMissingPasswordRequirementsMessage(password);
  if (message) {
    return { valid: false, message };
  }
  return { valid: true };
}
