const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { routeValidators, queryValidators, validate } = require('../utils/validators');
const { authenticate, optionalAuth } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');


router.get('/search',
  rateLimiter.search,
  optionalAuth,
  validate(routeValidators.search, 'query'),
  routeController.searchRoutes
);


router.get('/popular',
  routeController.getPopularRoutes
);


router.post('/',
  authenticate,
  rateLimiter.create,
  validate(routeValidators.create),
  routeController.createRoute
);


router.get('/:id',
  validate(queryValidators.id, 'params'),
  routeController.getRouteById
);

router.put('/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate(routeValidators.update),
  routeController.updateRoute
);


router.post('/:id/feedback',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate(routeValidators.feedback),
  routeController.submitFeedback
);


router.post('/:id/rate',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate({
    rating: require('joi').number().integer().min(1).max(5).required(),
    review: require('joi').string().max(500).optional()
  }),
  routeController.rateRoute
);

router.post('/:id/use',
  authenticate,
  validate(queryValidators.id, 'params'),
  routeController.recordRouteUsage
);


router.get('/:id/alternatives',
  validate(queryValidators.id, 'params'),
  routeController.getAlternativeRoutes
);

router.get('/my-routes',
  authenticate,
  routeController.getUserRoutes
);


router.get('/:id/analytics',
  authenticate,
  validate(queryValidators.id, 'params'),
  routeController.getRouteAnalytics
);

module.exports = router;