const express = require('express');
const router = express.Router();
const directionController = require('../controllers/directionController');
const { directionValidators, validate, queryValidators } = require('../utils/validators');
const { authenticate, optionalAuth, requireVerified } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserDirection:
 *       type: object
 *       required:
 *         - title
 *         - startLocationId
 *         - endLocationId
 *         - routeData
 *         - totalEstimatedFare
 *         - totalEstimatedDuration
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Direction unique identifier
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 100
 *           description: Direction title
 *           example: "Quick route from VI to Ikeja"
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Optional description
 *           example: "Best route during rush hour avoiding traffic"
 *         startLocationId:
 *           type: string
 *           format: uuid
 *           description: Starting location ID
 *         endLocationId:
 *           type: string
 *           format: uuid
 *           description: Destination location ID
 *         routeData:
 *           type: object
 *           description: Complete route information with steps
 *           properties:
 *             steps:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stepNumber:
 *                     type: integer
 *                   vehicleType:
 *                     type: string
 *                     enum: [bus, taxi, keke, okada, train, walking]
 *                   instructions:
 *                     type: string
 *                   duration:
 *                     type: integer
 *                   fare:
 *                     type: integer
 *         totalEstimatedFare:
 *           type: integer
 *           minimum: 0
 *           description: Total fare in Naira
 *           example: 1500
 *         totalEstimatedDuration:
 *           type: integer
 *           minimum: 0
 *           description: Total duration in minutes
 *           example: 45
 *         shareCode:
 *           type: string
 *           length: 8
 *           pattern: '^[A-Z0-9]{8}$'
 *           description: Unique share code
 *           example: "ABC12345"
 *         isPublic:
 *           type: boolean
 *           description: Whether direction is publicly visible
 *           default: false
 *         usageCount:
 *           type: integer
 *           minimum: 0
 *           description: Number of times direction was accessed
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: Creator user ID
 *         startLocation:
 *           $ref: '#/components/schemas/Location'
 *         endLocation:
 *           $ref: '#/components/schemas/Location'
 *         creator:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     DirectionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             direction:
 *               $ref: '#/components/schemas/UserDirection'
 *     DirectionListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             directions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserDirection'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pages:
 *                   type: integer
 */

/**
 * @swagger
 * /api/v1/directions/create:
 *   post:
 *     summary: Create a new shareable direction
 *     tags: [Directions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startLocationId
 *               - endLocationId
 *               - routeData
 *               - totalEstimatedFare
 *               - totalEstimatedDuration
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *                 example: "Quick route from VI to Ikeja"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Best route during rush hour"
 *               startLocationId:
 *                 type: string
 *                 format: uuid
 *               endLocationId:
 *                 type: string
 *                 format: uuid
 *               routeData:
 *                 type: object
 *                 description: Complete route with steps
 *                 example:
 *                   steps:
 *                     - stepNumber: 1
 *                       vehicleType: "walking"
 *                       instructions: "Walk to bus stop"
 *                       duration: 5
 *                     - stepNumber: 2
 *                       vehicleType: "bus"
 *                       instructions: "Take bus to destination"
 *                       duration: 30
 *                       fare: 200
 *               totalEstimatedFare:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1500
 *               totalEstimatedDuration:
 *                 type: integer
 *                 minimum: 0
 *                 example: 45
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Direction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/create',
  authenticate,
  requireVerified,
  rateLimiter.create,
  validate(directionValidators.create),
  directionController.create
);

/**
 * @swagger
 * /api/v1/directions/{shareCode}:
 *   get:
 *     summary: Get direction by share code
 *     tags: [Directions]
 *     parameters:
 *       - in: path
 *         name: shareCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9]{8}$'
 *           example: "ABC12345"
 *         description: 8-character share code
 *     responses:
 *       200:
 *         description: Direction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionResponse'
 *       404:
 *         description: Direction not found
 *       500:
 *         description: Internal server error
 */
router.get('/:shareCode',
  optionalAuth,
  validate(directionValidators.shareCode, 'params'),
  directionController.getByShareCode
);

/**
 * @swagger
 * /api/v1/directions/my-directions:
 *   get:
 *     summary: Get current user's directions
 *     tags: [Directions]
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
 *         description: Items per page
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: Filter by public/private status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, usageCount, title]
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
 *         description: Directions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/my-directions',
  authenticate,
  validate(queryValidators.pagination, 'query'),
  directionController.getUserDirections
);

/**
 * @swagger
 * /api/v1/directions/{id}:
 *   get:
 *     summary: Get direction by ID
 *     tags: [Directions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Direction ID
 *     responses:
 *       200:
 *         description: Direction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Direction not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update direction
 *     tags: [Directions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Direction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               routeData:
 *                 type: object
 *               totalEstimatedFare:
 *                 type: integer
 *                 minimum: 0
 *               totalEstimatedDuration:
 *                 type: integer
 *                 minimum: 0
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Direction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Direction not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete direction
 *     tags: [Directions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Direction ID
 *     responses:
 *       200:
 *         description: Direction deleted successfully
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
 *         description: Access denied
 *       404:
 *         description: Direction not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/v1/directions/{id}/use:
 *   post:
 *     summary: Track usage of a direction
 *     tags: [Directions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Direction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usageType:
 *                 type: string
 *                 enum: [view, follow, share]
 *                 default: view
 *                 description: Type of usage
 *               feedback:
 *                 type: string
 *                 maxLength: 300
 *                 description: Optional feedback
 *     responses:
 *       200:
 *         description: Usage tracked successfully
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
 *                     usageCount:
 *                       type: integer
 *       404:
 *         description: Direction not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/use',
  optionalAuth,
  validate(queryValidators.id, 'params'),
  directionController.trackUsage
);

/**
 * @swagger
 * /api/v1/directions/public:
 *   get:
 *     summary: Get public directions
 *     tags: [Directions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: fromLocationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by start location
 *       - in: query
 *         name: toLocationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by end location
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
 *         description: Maximum duration filter in minutes
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, usageCount, totalEstimatedFare, totalEstimatedDuration]
 *           default: usageCount
 *     responses:
 *       200:
 *         description: Public directions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectionListResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/v1/directions/popular:
 *   get:
 *     summary: Get most popular directions
 *     tags: [Directions]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of directions to return
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, all]
 *           default: month
 *         description: Time frame for popularity calculation
 *     responses:
 *       200:
 *         description: Popular directions retrieved successfully
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
 *                     directions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserDirection'
 *       500:
 *         description: Internal server error
 */
router.get('/popular',
  optionalAuth,
  validate({
    limit: require('joi').number().integer().min(1).max(20).default(10),
    timeframe: require('joi').string().valid('week', 'month', 'all').default('month')
  }, 'query'),
  directionController.getPopularDirections
);

module.exports = router;