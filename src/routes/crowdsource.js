const express = require('express');
const router = express.Router();
const crowdsourceController = require('../controllers/crowdsourceController');
const { crowdsourceValidators, validate, queryValidators } = require('../utils/validators');
const { authenticate, requireVerified, requireMinReputation } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @swagger
 * components:
 *   schemas:
 *     RouteUpdate:
 *       type: object
 *       required:
 *         - routeId
 *         - updateType
 *         - newValue
 *       properties:
 *         routeId:
 *           type: string
 *           format: uuid
 *           description: ID of the route to update
 *         updateType:
 *           type: string
 *           enum: [fare, duration, availability, condition]
 *           description: Type of update being submitted
 *         newValue:
 *           oneOf:
 *             - type: integer
 *               minimum: 0
 *               maximum: 100000
 *             - type: boolean
 *             - type: string
 *               enum: [good, fair, poor]
 *           description: New value for the update (type depends on updateType)
 *         comments:
 *           type: string
 *           maxLength: 300
 *           description: Additional comments about the update
 *         confidence:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           default: 3
 *           description: Confidence level in this update (1-5)
 *     FareReport:
 *       type: object
 *       required:
 *         - routeStepId
 *         - actualFarePaid
 *         - vehicleTypeUsed
 *         - dateOfTravel
 *         - timeOfDay
 *       properties:
 *         routeStepId:
 *           type: string
 *           format: uuid
 *           description: ID of the route step
 *         actualFarePaid:
 *           type: integer
 *           minimum: 0
 *           maximum: 100000
 *           description: Actual fare paid in Naira
 *         vehicleTypeUsed:
 *           type: string
 *           enum: [bus, taxi, keke, okada, train, walking]
 *           description: Type of vehicle used
 *         dateOfTravel:
 *           type: string
 *           format: date
 *           description: Date of travel
 *         timeOfDay:
 *           type: string
 *           enum: [morning, afternoon, evening, night]
 *           description: Time of day when travel occurred
 *         trafficCondition:
 *           type: string
 *           enum: [light, moderate, heavy]
 *           description: Traffic condition during travel
 *         weatherCondition:
 *           type: string
 *           enum: [clear, rainy, cloudy]
 *           description: Weather condition during travel
 *     NewRouteProposal:
 *       type: object
 *       required:
 *         - startLocationId
 *         - endLocationId
 *         - vehicleTypes
 *         - estimatedFareMin
 *         - estimatedFareMax
 *         - estimatedDuration
 *         - description
 *         - steps
 *       properties:
 *         startLocationId:
 *           type: string
 *           format: uuid
 *           description: Starting location ID
 *         endLocationId:
 *           type: string
 *           format: uuid
 *           description: Ending location ID
 *         vehicleTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [bus, taxi, keke, okada, train]
 *           minItems: 1
 *           description: Available vehicle types for this route
 *         estimatedFareMin:
 *           type: integer
 *           minimum: 0
 *           maximum: 100000
 *           description: Minimum estimated fare in Naira
 *         estimatedFareMax:
 *           type: integer
 *           minimum: 0
 *           maximum: 100000
 *           description: Maximum estimated fare in Naira
 *         estimatedDuration:
 *           type: integer
 *           minimum: 0
 *           maximum: 1440
 *           description: Estimated duration in minutes
 *         description:
 *           type: string
 *           minLength: 20
 *           maxLength: 500
 *           description: Detailed description of the route
 *         steps:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - stepNumber
 *               - fromLocationId
 *               - toLocationId
 *               - vehicleType
 *               - instructions
 *               - pickupPoint
 *               - dropoffPoint
 *               - estimatedDuration
 *             properties:
 *               stepNumber:
 *                 type: integer
 *                 minimum: 1
 *               fromLocationId:
 *                 type: string
 *                 format: uuid
 *               toLocationId:
 *                 type: string
 *                 format: uuid
 *               vehicleType:
 *                 type: string
 *                 enum: [bus, taxi, keke, okada, train, walking]
 *               instructions:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               pickupPoint:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               dropoffPoint:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               estimatedDuration:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 1440
 *               fareMin:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100000
 *               fareMax:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100000
 *         confidence:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           default: 3
 *           description: Confidence level in this route proposal
 *     CrowdsourceContribution:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         contributionType:
 *           type: string
 *           enum: [route_update, fare_report, new_route, location_update]
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         data:
 *           type: object
 *           description: Contribution data
 *         confidence:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         reputationAwarded:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/crowdsource/route-update:
 *   post:
 *     summary: Submit a route update
 *     description: Allow users to submit updates about existing routes (fare changes, availability, condition)
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RouteUpdate'
 *           examples:
 *             fareUpdate:
 *               summary: Fare update example
 *               value:
 *                 routeId: "123e4567-e89b-12d3-a456-426614174000"
 *                 updateType: "fare"
 *                 newValue: 250
 *                 comments: "Fare increased due to fuel price hike"
 *                 confidence: 4
 *             availabilityUpdate:
 *               summary: Availability update example
 *               value:
 *                 routeId: "123e4567-e89b-12d3-a456-426614174000"
 *                 updateType: "availability"
 *                 newValue: false
 *                 comments: "Route temporarily closed for road repairs"
 *                 confidence: 5
 *     responses:
 *       201:
 *         description: Route update submitted successfully
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
 *                   $ref: '#/components/schemas/CrowdsourceContribution'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient reputation
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/route-update',
  authenticate,
  requireVerified,
  requireMinReputation(10), // Minimum reputation to submit route updates
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.routeUpdate),
  asyncHandler(crowdsourceController.submitRouteUpdate)
);

/**
 * @swagger
 * /api/v1/crowdsource/fare-report:
 *   post:
 *     summary: Report actual fare paid
 *     description: Submit real fare information to help improve fare estimates
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FareReport'
 *           example:
 *             routeStepId: "123e4567-e89b-12d3-a456-426614174000"
 *             actualFarePaid: 200
 *             vehicleTypeUsed: "bus"
 *             dateOfTravel: "2025-01-15"
 *             timeOfDay: "morning"
 *             trafficCondition: "moderate"
 *             weatherCondition: "clear"
 *     responses:
 *       201:
 *         description: Fare report submitted successfully
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
 *                   type: object
 *                   properties:
 *                     fareReport:
 *                       type: object
 *                     reputationAwarded:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/fare-report',
  authenticate,
  requireVerified,
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.fareReport),
  asyncHandler(crowdsourceController.submitFareReport)
);

/**
 * @swagger
 * /api/v1/crowdsource/new-route:
 *   post:
 *     summary: Propose a new route
 *     description: Submit a proposal for a new transportation route
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewRouteProposal'
 *     responses:
 *       201:
 *         description: New route proposal submitted successfully
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
 *                   $ref: '#/components/schemas/CrowdsourceContribution'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient reputation
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/new-route',
  authenticate,
  requireVerified,
  requireMinReputation(50), // Higher reputation required for route proposals
  rateLimiter.crowdsource,
  validate(crowdsourceValidators.newRoute),
  asyncHandler(crowdsourceController.proposeNewRoute)
);

/**
 * @swagger
 * /api/v1/crowdsource/location-update:
 *   post:
 *     summary: Submit location information update
 *     description: Update information about existing locations or suggest corrections
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - updateType
 *               - updateData
 *             properties:
 *               locationId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the location to update
 *               updateType:
 *                 type: string
 *                 enum: [name, address, coordinates, landmarks, status]
 *                 description: Type of update being submitted
 *               updateData:
 *                 type: object
 *                 description: Update data (structure depends on updateType)
 *               reason:
 *                 type: string
 *                 maxLength: 300
 *                 description: Reason for the update
 *               confidence:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *     responses:
 *       201:
 *         description: Location update submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient reputation
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/v1/crowdsource/contributions:
 *   get:
 *     summary: Get user's crowdsourcing contributions
 *     description: Retrieve the current user's crowdsourcing contributions with pagination
 *     tags: [Crowdsourcing]
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
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [route_update, fare_report, new_route, location_update]
 *         description: Filter by contribution type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by contribution status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, status, reputationAwarded]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Contributions retrieved successfully
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
 *                     contributions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CrowdsourceContribution'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalContributions:
 *                           type: integer
 *                         totalReputationEarned:
 *                           type: integer
 *                         approvedContributions:
 *                           type: integer
 *                         pendingContributions:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/contributions',
  authenticate,
  validate(queryValidators.pagination, 'query'),
  asyncHandler(crowdsourceController.getUserContributions)
);

/**
 * @swagger
 * /api/v1/crowdsource/leaderboard:
 *   get:
 *     summary: Get crowdsourcing leaderboard
 *     description: Get top contributors based on reputation and contributions
 *     tags: [Crowdsourcing]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: month
 *         description: Time period for leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of top contributors to return
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [reputation, contributions, accuracy]
 *           default: reputation
 *         description: Leaderboard ranking type
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
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
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: integer
 *                           userId:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           reputationScore:
 *                             type: integer
 *                           totalContributions:
 *                             type: integer
 *                           accuracyRate:
 *                             type: number
 *                             format: float
 *                     currentUser:
 *                       type: object
 *                       properties:
 *                         rank:
 *                           type: integer
 *                         score:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/leaderboard',
  validate({
    period: require('joi').string().valid('week', 'month', 'year', 'all').default('month'),
    limit: require('joi').number().integer().min(1).max(100).default(20),
    type: require('joi').string().valid('reputation', 'contributions', 'accuracy').default('reputation')
  }, 'query'),
  asyncHandler(crowdsourceController.getLeaderboard)
);

/**
 * @swagger
 * /api/v1/crowdsource/stats:
 *   get:
 *     summary: Get crowdsourcing statistics
 *     description: Get overall crowdsourcing platform statistics
 *     tags: [Crowdsourcing]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     totalContributions:
 *                       type: integer
 *                     totalContributors:
 *                       type: integer
 *                     contributionsToday:
 *                       type: integer
 *                     contributionsThisWeek:
 *                       type: integer
 *                     contributionsThisMonth:
 *                       type: integer
 *                     averageAccuracyRate:
 *                       type: number
 *                       format: float
 *                     contributionsByType:
 *                       type: object
 *                       properties:
 *                         route_update:
 *                           type: integer
 *                         fare_report:
 *                           type: integer
 *                         new_route:
 *                           type: integer
 *                         location_update:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/stats',
  asyncHandler(crowdsourceController.getCrowdsourcingStats)
);

/**
 * @swagger
 * /api/v1/crowdsource/contributions/{id}:
 *   get:
 *     summary: Get specific contribution details
 *     description: Retrieve detailed information about a specific contribution
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contribution ID
 *     responses:
 *       200:
 *         description: Contribution details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CrowdsourceContribution'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not your contribution)
 *       404:
 *         description: Contribution not found
 *       500:
 *         description: Internal server error
 */
router.get('/contributions/:id',
  authenticate,
  validate(queryValidators.id, 'params'),
  asyncHandler(crowdsourceController.getContributionDetails)
);

/**
 * @swagger
 * /api/v1/crowdsource/contributions/{id}/withdraw:
 *   delete:
 *     summary: Withdraw a pending contribution
 *     description: Allow users to withdraw their pending contributions
 *     tags: [Crowdsourcing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Contribution ID
 *     responses:
 *       200:
 *         description: Contribution withdrawn successfully
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
 *         description: Unauthorized
 *       403:
 *         description: Cannot withdraw this contribution
 *       404:
 *         description: Contribution not found
 *       500:
 *         description: Internal server error
 */
router.delete('/contributions/:id/withdraw',
  authenticate,
  validate(queryValidators.id, 'params'),
  asyncHandler(crowdsourceController.withdrawContribution)
);

module.exports = router;