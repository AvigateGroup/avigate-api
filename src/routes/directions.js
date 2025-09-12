const express = require('express');
const router = express.Router();
const directionController = require('../controllers/directionController');
const { directionValidators, validate, queryValidators } = require('../utils/validators');
const { authenticate, optionalAuth, requireVerified } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/create',
  authenticate,
  requireVerified,
  rateLimiter.create,
  validate(directionValidators.create),
  directionController.create
);

router.get('/:shareCode',
  optionalAuth,
  validate(directionValidators.shareCode, 'params'),
  directionController.getByShareCode
);

router.get('/my-directions',
  authenticate,
  validate(queryValidators.pagination, 'query'),
  directionController.getUserDirections
);


router.get('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  directionController.getById
);

router.put('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate(directionValidators.update),
  directionController.update
);

router.delete('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  directionController.delete
);


router.post('/:id/use',
  optionalAuth,
  validate(queryValidators.id, 'params'),
  directionController.trackUsage
);


router.get('/public',
  optionalAuth,
  validate({
    ...queryValidators.pagination.describe().keys,
    fromLocationId: require('joi').string().uuid().optional(),
    toLocationId: require('joi').string().uuid().optional(),
    maxFare: require('joi').number().integer().min(0).optional(),
    maxDuration: require('joi').number().integer().min(0).optional(),
    sortBy: require('joi').string().valid('createdAt', 'usageCount', 'totalEstimatedFare', 'totalEstimatedDuration').default('usageCount')
  }, 'query'),
  directionController.getPublicDirections
);


router.get('/popular',
  optionalAuth,
  validate({
    limit: require('joi').number().integer().min(1).max(20).default(10),
    timeframe: require('joi').string().valid('week', 'month', 'all').default('month')
  }, 'query'),
  directionController.getPopularDirections
);

module.exports = router;