const { check, validationResult } = require('express-validator');

const validateDateRange = [
  check('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      const startDate = new Date(value);
      const today = new Date();
      if (startDate > today) {
        throw new Error('Start date cannot be in the future');
      }
      return true;
    }),

  check('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const today = new Date();
      if (endDate > today) {
        throw new Error('End date cannot be in the future');
      }
      return true;
    })
    .custom((value, { req }) => {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(value);
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateDateRange
};