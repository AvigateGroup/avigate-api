const express = require('express');
const router = express.Router();
const crowdsourceController = require('../controllers/crowdsourceController');
const { crowdsourceValidators, validate, queryValidators } = require('../utils/validators');
const { authenticate, requireVerified, requireMinReputation } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/route-update',
  authenticate,
  requireVerified,
  requireMinReputation(10), // Minimum reputation to submit route updates
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.routeUpdate),
  asyncHandler(crowdsourceController.submitRouteUpdate)
);


router.post('/fare-report',
  authenticate,
  requireVerified,
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.fareReport),
  asyncHandler(crowdsourceController.submitFareReport)
);


router.post('/new-route',
  authenticate,
  requireVerified,
  requireMinReputation(50), // Higher reputation required for route proposals
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.newRoute),
  asyncHandler(crowdsourceController.proposeNewRoute)
);

router.post('/location-update',
  authenticate,
  requireVerified,
  requireMinReputation(25),
  rateLimiter.crowdsource,
  validate({
    locationId: require('joi').string().uuid().required(),
    updateType: require('joi').string().valid('name', 'address', 'coordinates', 'landmarks', 'status').required(),
    updateData: require('joi').object().required(),
    reason: require('joi').string().max(300).optional(),
    confidence: require('joi').number().integer().min(1).max(5).default(3)
  }),
  asyncHandler(crowdsourceController.submitLocationUpdate)
);


router.get('/contributions',
  authenticate,
  validate(queryValidators.pagination, 'query'),
  asyncHandler(crowdsourceController.getUserContributions)
);

router.get('/leaderboard',
  validate({
    period: require('joi').string().valid('week', 'month', 'year', 'all').default('month'),
    limit: require('joi').number().integer().min(1).max(100).default(20),
    type: require('joi').string().valid('reputation', 'contributions', 'accuracy').default('reputation')
  }, 'query'),
  asyncHandler(crowdsourceController.getLeaderboard)
);

router.get('/stats',
  asyncHandler(crowdsourceController.getCrowdsourcingStats)
);

router.get('/contributions/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  asyncHandler(crowdsourceController.getContributionDetails)
);


router.delete('/contributions/:id/withdraw',
  authenticate,
  validate(queryValidators.id, 'params'),
  asyncHandler(crowdsourceController.withdrawContribution)
);

module.exports = router;