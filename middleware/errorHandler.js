const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Centralized error handler — maps Mongoose / JSON errors to clean HTTP responses
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}: ${JSON.stringify(err.value)}`;
  } else if (err.code === 11000) {
    status = 409;
    const field =
      Object.keys(err.keyValue || err.keyPattern || {})[0] ||
      (String(err.message).match(/index: (\w+?)_1/) || [])[1] ||
      'value';
    const value = err.keyValue?.[field];
    message = value !== undefined ? `Duplicate ${field}: "${value}" already exists` : `A product with this ${field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body';
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
