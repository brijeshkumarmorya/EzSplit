export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true, 
  requireNumber: true,
  requireSpecialChar: true
};

export const PASSWORD_ERROR_MESSAGE = 
  'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.';

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: PASSWORD_ERROR_MESSAGE };
  }
  
  return { valid: true };
};

export const passwordValidatorMiddleware = (password) => {
  return PASSWORD_REGEX.test(password);
};