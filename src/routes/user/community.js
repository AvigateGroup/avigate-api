// routes/user/community.js
const express = require('express')
const router = express.Router()
const communityController = require('../../controllers/user/communityController')
const { authenticate } = require('../../middleware/user/auth')
const { validationMiddleware } = require('../../middleware/user/validation')
const rateLimiter = require('../../middleware/rateLimiter')

// Community feed
router.get(
    '/feed',
    rateLimiter.general,
    communityController.getCommunityFeed
)

// Create community post
router.post(
    '/posts',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateCreateCommunityPost,
    communityController.createCommunityPost
)

// Get community post details
router.get(
    '/posts/:postId',
    rateLimiter.general,
    communityController.getCommunityPost
)

// Vote on community post
router.post(
    '/posts/:postId/vote',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateVotePost,
    communityController.voteCommunityPost
)

// Report community post
router.post(
    '/posts/:postId/report',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateReportPost,
    communityController.reportCommunityPost
)

// Safety reports
router.post(
    '/safety-reports',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateCreateSafetyReport,
    communityController.createSafetyReport
)

router.get(
    '/safety-reports',
    rateLimiter.general,
    communityController.getSafetyReports
)

router.post(
    '/safety-reports/:reportId/vote',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateVoteSafetyReport,
    communityController.voteSafetyReport
)

// Route contributions
router.post(
    '/route-contributions',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateRouteContribution,
    communityController.submitRouteContribution
)

// User feedback
router.post(
    '/feedback',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateUserFeedback,
    communityController.submitUserFeedback
)

module.exports = router