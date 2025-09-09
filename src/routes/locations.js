const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { locationValidators, queryValidators, validate } = require('../utils/validators');
const { authenticate, optionalAuth, requireMinReputation } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       required:
 *         - name
 *         - latitude
 *         - longitude
 *         - address
 *         - city
 *         - state
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Location unique identifier
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Location name
 *         latitude:
 *           type: number
 *           minimum: 4.0
 *           maximum: 14.0
 *           description: Latitude coordinate (Nigeria bounds)
 *         longitude:
 *           type: number
 *           minimum: 2.5
 *           maximum: 15.0
 *           description: Longitude coordinate (Nigeria bounds)
 *         address:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           description: Full address
 *         city:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: City name
 *         state:
 *           type: string
 *           enum: [Abia, Adamawa, Akwa Ibom, Anambra, Bauchi, Bayelsa, Benue, Borno, Cross River, Delta, Ebonyi, Edo, Ekiti, Enugu, FCT, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Kogi, Kwara, Lagos, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Taraba, Yobe, Zamfara]
 *           description: Nigerian state
 *         landmarks:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of nearby landmarks
 *         locationType:
 *           type: string
 *           enum: [bus_stop, motor_park, train_station, taxi_stand, market, school, hospital, residential, commercial, landmark, other]
 *           description: Type of location
 *         isActive:
 *           type: boolean
 *           description: Whether location is active
 *         isVerified:
 *           type: boolean
 *           description: Whether location is verified
 *         searchCount:
 *           type: integer
 *           description: Number of times location was searched
 *         routeCount:
 *           type: integer
 *           description: Number of routes using this location
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LocationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/Location'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             pages:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 */

/**
 * @swagger
 * /api/v1/locations/search:
 *   get:
 *     summary: Search locations by text query
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
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
  validate(locationValidators.search, 'query'),
  locationController.searchLocations
);

/**
 * @swagger
 * /api/v1/locations/nearby:
 *   get:
 *     summary: Find nearby locations
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 4.0
 *           maximum: 14.0
 *         description: Latitude coordinate
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 2.5
 *           maximum: 15.0
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           minimum: 0.1
 *           maximum: 50
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Nearby locations found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       400:
 *         description: Invalid coordinates
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get('/nearby',
  rateLimiter.search,
  optionalAuth,
  validate(locationValidators.nearby, 'query'),
  locationController.findNearbyLocations
);

/**
 * @swagger
 * /api/v1/locations/popular:
 *   get:
 *     summary: Get most popular locations
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Popular locations retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/popular',
  locationController.getPopularLocations
);

/**
 * @swagger
 * /api/v1/locations/states/{state}:
 *   get:
 *     summary: Get locations by state
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: Nigerian state name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Locations in state retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       400:
 *         description: Invalid state name
 *       500:
 *         description: Internal server error
 */
router.get('/states/:state',
  locationController.getLocationsByState
);

/**
 * @swagger
 * /api/v1/locations:
 *   post:
 *     summary: Create a new location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *               - address
 *               - city
 *               - state
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Ojuelegba Motor Park"
 *               latitude:
 *                 type: number
 *                 minimum: 4.0
 *                 maximum: 14.0
 *                 example: 6.5244
 *               longitude:
 *                 type: number
 *                 minimum: 2.5
 *                 maximum: 15.0
 *                 example: 3.3792
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "Ojuelegba Road, Surulere, Lagos"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               landmarks:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["National Theatre", "Tafawa Balewa Square"]
 *               locationType:
 *                 type: string
 *                 enum: [bus_stop, motor_park, train_station, taxi_stand, market, school, hospital, residential, commercial, landmark, other]
 *                 example: "motor_park"
 *     responses:
 *       201:
 *         description: Location created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
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
  validate(locationValidators.create),
  locationController.createLocation
);

/**
 * @swagger
 * /api/v1/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       404:
 *         description: Location not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               landmarks:
 *                 type: array
 *                 items:
 *                   type: string
 *               locationType:
 *                 type: string
 *                 enum: [bus_stop, motor_park, train_station, taxi_stand, market, school, hospital, residential, commercial, landmark, other]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Location not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id',
  validate(queryValidators.id, 'params'),
  locationController.getLocationById
);

router.put('/:id',
  authenticate,
  requireMinReputation(100),
  validate(queryValidators.id, 'params'),
  validate(locationValidators.update),
  locationController.updateLocation
);

/**
 * @swagger
 * /api/v1/locations/{id}/verify:
 *   post:
 *     summary: Verify a location (admin action)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location verified successfully
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
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Location not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/verify',
  authenticate,
  requireMinReputation(500),
  validate(queryValidators.id, 'params'),
  locationController.verifyLocation
);

/**
 * @swagger
 * /api/v1/locations/{id}/report:
 *   post:
 *     summary: Report an issue with a location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - description
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [incorrect_info, duplicate, inappropriate, doesnt_exist, other]
 *                 description: Reason for reporting
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Detailed description of the issue
 *     responses:
 *       200:
 *         description: Report submitted successfully
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
 *         description: Location not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/report',
  authenticate,
  validate(queryValidators.id, 'params'),
  validate({
    reason: require('joi').string().valid('incorrect_info', 'duplicate', 'inappropriate', 'doesnt_exist', 'other').required(),
    description: require('joi').string().min(10).max(500).required()
  }),
  locationController.reportLocation
);

module.exports = router;