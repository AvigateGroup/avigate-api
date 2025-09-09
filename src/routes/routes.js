const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { routeValidators, queryValidators, validate } = require('../utils/validators');
const { authenticate, optionalAuth, requireMinReputation } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     RouteStep:
 *       type: object
 *       required:
 *         - stepNumber
 *         - fromLocationId
 *         - toLocationId
 *         - vehicleType
 *         - instructions
 *         - pickupPoint
 *         - dropoffPoint
 *         - estimatedDuration
 *       properties:
 *         stepNumber:
 *           type: integer
 *           minimum: 1
 *           description: Step sequence number
 *         fromLocationId:
 *           type: string
 *           format: uuid
 *           description: Starting location ID
 *         toLocationId:
 *           type: string
 *           format: uuid
 *           description: Destination location ID
 *         vehicleType:
 *           type: string
 *           enum: [bus, taxi, keke, okada, train, walking]
 *           description: Transportation method
 *         instructions:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Step-by-step instructions
 *         landmarks:
 *           type: array
 *           items:
 *             type: string
 *           description: Landmarks along this step
 *         fareMin:
 *           type: integer
 *           minimum: 0
 *           description: Minimum fare in Naira
 *         fareMax:
 *           type: integer
 *           minimum: 0
 *           description: Maximum fare in Naira
 *         estimatedDuration:
 *           type: integer
 *           minimum: 0
 *           description: Estimated duration in minutes
 *         pickupPoint:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           description: Where to board the vehicle
 *         dropoffPoint:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           description: Where to alight from the vehicle
 *     Route:
 *       type: object
 *       required:
 *         - startLocationId
 *         - endLocationId
 *         - vehicleTypes
 *         - estimatedFareMin
 *         - estimatedFareMax
 *         - estimatedDuration
 *         - steps
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Route unique identifier
 *         startLocationId:
 *           type: string
 *           format: uuid
 *           description: Starting location ID
 *         endLocationId:
 *           type: string
 *           format: uuid
 *           description: Destination location ID
 *         vehicleTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [bus, taxi, keke, okada, train]
 *           minItems: 1
 *           description: Available transportation methods
 *         estimatedFareMin:
 *           type: integer
 *           minimum: 0
 *           description: Minimum total fare in Naira
 *         estimatedFareMax:
 *           type: integer
 *           minimum: 0
 *           description: Maximum total fare in Naira
 *         estimatedDuration:
 *           type: integer
 *           minimum: 0
 *           description: Estimated total duration in minutes
 *         difficulty:
 *           type: string
 *           enum: [Easy, Medium, Hard]
 *           description: Route difficulty level
 *         isActive:
 *           type: boolean
 *           description: Whether route is active
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: User who created the route
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RouteStep'
 *           description: Route steps
 *         averageRating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Average user rating
 *         totalRatings:
 *           type: integer
 *           description: Total number of ratings
 *         usageCount:
 *           type: integer
 *           description: Number of times route was used
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     FareFeedback:
 *       type: object
 *       required:
 *         - routeStepId
 *         - actualFarePaid
 *         - vehicleTypeUsed
 *         - dateOfTravel
 *         - rating
 *       properties:
 *         routeStepId:
 *           type: string
 *           format: uuid
 *           description: Route step ID
 *         actualFarePaid:
 *           type: integer
 *           minimum: 0
 *           description: Actual fare paid in Naira
 *         vehicleTypeUsed:
 *           type: string
 *           enum: [bus, taxi, keke, okada, train, walking]
 *           description: Vehicle type used
 *         dateOfTravel:
 *           type: string
 *           format: date
 *           description: Date of travel
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating (1-5 stars)
 *         comments:
 *           type: string
 *           maxLength: 500
 *           description: Additional comments
 */

/**
 * @swagger
 * /api/v1/routes/search:
 *   get:
 *     summary: Search for routes between two locations
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Starting location ID
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Destination location ID
 *       - in: query
 *         name: vehicleTypes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [bus, taxi, keke, okada, train]
 *         description: Filter by vehicle types
 *       - in: query
 *         name: maxFare
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Maximum fare filter
 *       - in: query
 *         name: maxDuration
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Maximum duration filter (minutes)
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Easy, Medium, Hard]
 *         description: Filter by difficulty levels
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Routes found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 *       400:
 *         description: Invalid search parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get('/search',
  rateLimiter.search,
  optionalAuth,
  validate(routeValidators.search, 'query'),
  routeController.searchRoutes
);

/**
 * @swagger
 * /api/v1/routes/popular:
 *   get:
 *     summary: Get most popular routes
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of routes to return
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, all]
 *           default: week
 *         description: Time frame for popularity calculation
 *     responses:
 *       200:
 *         description: Popular routes retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 *       500:
 *         description: Internal server error
 */
router.get('/popular',
  routeController.getPopularRoutes
);

/**
 * @swagger
 * /api/v1/routes:
 *   post:
 *     summary: Create a new route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startLocationId
 *               - endLocationId
 *               - vehicleTypes
 *               - estimatedFareMin
 *               - estimatedFareMax
 *               - estimatedDuration
 *               - steps
 *             properties:
 *               startLocationId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               endLocationId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [bus, taxi, keke, okada, train]
 *                 example: ["bus", "keke"]
 *               estimatedFareMin:
 *                 type: integer
 *                 minimum: 0
 *                 example: 200
 *               estimatedFareMax:
 *                 type: integer
 *                 minimum: 0
 *                 example: 400
 *               estimatedDuration:
 *                 type: integer
 *                 minimum: 0
 *                 example: 45
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *                 example: "Medium"
 *               steps:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RouteStep'
 *                 example:
 *                   - stepNumber: 1
 *                     fromLocationId: "123e4567-e89b-12d3-a456-426614174000"
 *                     toLocationId: "123e4567-e89b-12d3-a456-426614174002"
 *                     vehicleType: "bus"
 *                     instructions: "Take BRT bus from Ojuelegba to CMS"
 *                     pickupPoint: "Ojuelegba BRT Station"
 *                     dropoffPoint: "CMS BRT Station"
 *                     estimatedDuration: 25
 *                     fareMin: 100
 *                     fareMax: 150
 *     responses:
 *       201:
 *         description: Route created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/',
  authenticate,
  rateLimiter.create,
  validate(routeValidators.create),
  routeController.createRoute
);

/**
 * @swagger
 * /api/v1/routes/{id}:
 *   get:
 *     summary: Get route details by ID
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update route details
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [bus, taxi, keke, okada, train]
 *               estimatedFareMin:
 *                 type: integer
 *                 minimum: 0
 *               estimatedFareMax:
 *                 type: integer
 *                 minimum: 0
 *               estimatedDuration:
 *                 type: integer
 *                 minimum: 0
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Route updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/v1/routes/{id}/feedback:
 *   post:
 *     summary: Submit feedback for a route step
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeStepId
 *               - actualFarePaid
 *               - vehicleTypeUsed
 *               - dateOfTravel
 *               - rating
 *             properties:
 *               routeStepId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the route step
 *               actualFarePaid:
 *                 type: integer
 *                 minimum: 0
 *                 description: Actual fare paid in Naira
 *               vehicleTypeUsed:
 *                 type: string
 *                 enum: [bus, taxi, keke, okada, train, walking]
 *                 description: Vehicle type used
 *               dateOfTravel:
 *                 type: string
 *                 format: date
 *                 description: Date of travel (YYYY-MM-DD)
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating (1-5 stars)
 *               comments:
 *                 type: string
 *                 maxLength: 500
 *                 description: Additional comments
 *             example:
 *               routeStepId: "123e4567-e89b-12d3-a456-426614174003"
 *               actualFarePaid: 150
 *               vehicleTypeUsed: "bus"
 *               dateOfTravel: "2024-01-15"
 *               rating: 4
 *               comments: "Bus was on time and comfortable"
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/FareFeedback'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Route or route step not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/feedback',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate(routeValidators.feedback),
  routeController.submitFeedback
);

/**
 * @swagger
 * /api/v1/routes/{id}/rate:
 *   post:
 *     summary: Rate a route overall
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Overall route rating (1-5 stars)
 *               review:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional review text
 *             example:
 *               rating: 4
 *               review: "Good route with reliable transport options"
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Route not found
 *       409:
 *         description: User has already rated this route
 *       500:
 *         description: Internal server error
 */
router.post('/:id/rate',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate({
    rating: require('joi').number().integer().min(1).max(5).required(),
    review: require('joi').string().max(500).optional()
  }),
  routeController.rateRoute
);

/**
 * @swagger
 * /api/v1/routes/{id}/use:
 *   post:
 *     summary: Mark route as used (for analytics)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: When user started using the route
 *               completedSteps:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of completed route step IDs
 *     responses:
 *       200:
 *         description: Route usage recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/use',
  authenticate,
  validate(queryValidators.id, 'params'),
  routeController.recordRouteUsage
);

/**
 * @swagger
 * /api/v1/routes/{id}/alternatives:
 *   get:
 *     summary: Get alternative routes to the same destination
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: Number of alternative routes to return
 *     responses:
 *       200:
 *         description: Alternative routes found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/alternatives',
  validate(queryValidators.id, 'params'),
  routeController.getAlternativeRoutes
);

/**
 * @swagger
 * /api/v1/routes/my-routes:
 *   get:
 *     summary: Get routes created by current user
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of routes per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *           default: all
 *         description: Filter by route status
 *     responses:
 *       200:
 *         description: User routes retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/my-routes',
  authenticate,
  routeController.getUserRoutes
);

/**
 * @swagger
 * /api/v1/routes/{id}/analytics:
 *   get:
 *     summary: Get route analytics (for route creators)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Route ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *           default: month
 *         description: Analytics period
 *     responses:
 *       200:
 *         description: Route analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     usageCount:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 *                     feedbackCount:
 *                       type: integer
 *                     popularTimes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     fareAnalytics:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not the route creator
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/analytics',
  authenticate,
  validate(queryValidators.id, 'params'),
  routeController.getRouteAnalytics
);

module.exports = router;