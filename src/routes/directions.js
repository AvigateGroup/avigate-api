const express = require('express');
const router = express.Router();
const directionController = require('../controllers/directionController');
const { directionValidators, validate, queryValidators } = require('../utils/validators');
const { authenticate, optionalAuth, requireVerified } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Get popular directions
router.get('/popular',
  optionalAuth,
  validate({
    limit: require('joi').number().integer().min(1).max(20).default(10),
    state: require('joi').string().optional(),
    city: require('joi').string().optional()
  }, 'query'),
  directionController.getPopular
);

// Get direction statistics
router.get('/stats',
  directionController.getStats
);

// Get user's directions
router.get('/my-directions',
  authenticate,
  validate(queryValidators.pagination, 'query'),
  directionController.getMyDirections
);

// Create a new direction
router.post('/create',
  authenticate,
  requireVerified,
  rateLimiter.create,
  validate(directionValidators.create),
  directionController.create
);

// Get direction by share code
router.get('/:shareCode',
  optionalAuth,
  validate(directionValidators.shareCode, 'params'),
  directionController.getByShareCode
);

// Update direction
router.put('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate(directionValidators.update),
  directionController.update
);

// Delete direction
router.delete('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  directionController.delete
);

// Record direction usage
router.post('/:id/use',
  optionalAuth,
  validate(queryValidators.id, 'params'),
  validate({
    usageType: require('joi').string().valid('view', 'follow', 'share').default('view')
  }),
  directionController.recordUsage
);

module.exports = router;