/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Knex/PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry. A record with this value already exists.',
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced record not found.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details.map((d) => d.message),
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
