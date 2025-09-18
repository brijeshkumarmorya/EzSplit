/**
 * Standardized API Response Helper
 * 
 * Usage:
 *   success(res, 200, { user })
 *   error(res, 400, "Invalid input")
 */

export const success = (res, statusCode = 200, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

export const error = (res, statusCode = 500, message = "Something went wrong") => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { message },
  });
};
