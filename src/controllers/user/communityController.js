// controllers/user/communityController.js
const {
    CommunityPost,
    SafetyReport,
    RouteContribution,
    UserFeedback,
    Location,
    Route,
    User,
    Admin,
    UserInteraction,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const communityController = {
    // Get community feed
    getCommunityFeed: async (req, res) => {
        try {
            const user = req.user
            const {
                type,
                city,
                locationId,
                isUrgent,
                limit = 20,
                offset = 0,
            } = req.query

            // Build where conditions
            const where = {
                isActive: true,
                [Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [Op.gt]: new Date() } },
                ],
            }

            if (type) where.type = type
            if (isUrgent === 'true') where.isUrgent = true
            if (locationId) where.locationId = locationId

            // Include filters
            const include = [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                },
                {
                    model: Location,
                    as: 'location',
                    required: false,
                },
                {
                    model: Route,
                    as: 'route',
                    required: false,
                },
            ]

            // Add city filter through location
            if (city) {
                include[1].where = { city }
                include[1].required = true
            }

            const posts = await CommunityPost.findAll({
                where,
                include,
                order: [
                    ['isUrgent', 'DESC'],
                    ['isFeatured', 'DESC'],
                    ['lastInteractionAt', 'DESC'],
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
            })

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'community_feed_view',
                resourceType: 'community_post',
                interactionData: { type, city, isUrgent, postsCount: posts.length },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    posts,
                    filters: { type, city, locationId, isUrgent },
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: posts.length === parseInt(limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Get community feed error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get community feed',
                error: error.message,
            })
        }
    },

    // Create community post
    createCommunityPost: async (req, res) => {
        try {
            const user = req.user
            const {
                type,
                title,
                content,
                locationId,
                routeId,
                affectedAreas = [],
                isUrgent = false,
                expiresAt,
                tags = [],
                attachments = [],
            } = req.body

            // Validate input
            if (!type || !title || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Type, title, and content are required',
                })
            }

            // Check if location exists if provided
            if (locationId) {
                const location = await Location.findByPk(locationId)
                if (!location) {
                    return res.status(404).json({
                        success: false,
                        message: 'Location not found',
                    })
                }
            }

            // Check if route exists if provided
            if (routeId) {
                const route = await Route.findByPk(routeId)
                if (!route) {
                    return res.status(404).json({
                        success: false,
                        message: 'Route not found',
                    })
                }
            }

            // Create post
            const post = await CommunityPost.create({
                authorId: user.id,
                type,
                title,
                content,
                locationId,
                routeId,
                affectedAreas,
                isUrgent,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                tags,
                attachments,
            })

            // Update user reputation
            await user.updateReputation(5) // +5 for creating a post

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'community_post_create',
                resourceId: post.id,
                resourceType: 'community_post',
                interactionData: { type, isUrgent },
                ipAddress: req.ip,
            })

            // Fetch complete post with associations
            const completePost = await CommunityPost.findByPk(post.id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                    },
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                ],
            })

            res.status(201).json({
                success: true,
                message: 'Community post created successfully',
                data: {
                    post: completePost,
                },
            })
        } catch (error) {
            logger.error('Create community post error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create community post',
                error: error.message,
            })
        }
    },

    // Get community post details
    getCommunityPost: async (req, res) => {
        try {
            const { postId } = req.params
            const user = req.user

            const post = await CommunityPost.findByPk(postId, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                    },
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                ],
            })

            if (!post || !post.isVisible()) {
                return res.status(404).json({
                    success: false,
                    message: 'Community post not found',
                })
            }

            // Increment view count
            await post.incrementView()

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'community_post_view',
                resourceId: postId,
                resourceType: 'community_post',
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    post,
                },
            })
        } catch (error) {
            logger.error('Get community post error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get community post',
                error: error.message,
            })
        }
    },

    // Vote on community post
    voteCommunityPost: async (req, res) => {
        try {
            const { postId } = req.params
            const { voteType } = req.body // 'upvote' or 'downvote'
            const user = req.user

            if (!['upvote', 'downvote'].includes(voteType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vote type must be either "upvote" or "downvote"',
                })
            }

            const post = await CommunityPost.findByPk(postId)

            if (!post || !post.isVisible()) {
                return res.status(404).json({
                    success: false,
                    message: 'Community post not found',
                })
            }

            // Check if user is the author
            if (post.authorId === user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot vote on your own post',
                })
            }

            // Add vote
            if (voteType === 'upvote') {
                await post.addUpvote()
            } else {
                await post.addDownvote()
            }

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'community_post_vote',
                resourceId: postId,
                resourceType: 'community_post',
                interactionData: { voteType },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: `Post ${voteType}d successfully`,
                data: {
                    upvotes: post.upvotes,
                    downvotes: post.downvotes,
                    score: post.getScore(),
                },
            })
        } catch (error) {
            logger.error('Vote community post error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to vote on post',
                error: error.message,
            })
        }
    },

    // Report community post
    reportCommunityPost: async (req, res) => {
        try {
            const { postId } = req.params
            const { reason } = req.body
            const user = req.user

            const post = await CommunityPost.findByPk(postId)

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Community post not found',
                })
            }

            // Add report
            await post.addReport()

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'community_post_report',
                resourceId: postId,
                resourceType: 'community_post',
                interactionData: { reason },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: 'Post reported successfully',
                data: {
                    reportCount: post.reportCount,
                    isActive: post.isActive,
                },
            })
        } catch (error) {
            logger.error('Report community post error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to report post',
                error: error.message,
            })
        }
    },

    // Create safety report
    createSafetyReport: async (req, res) => {
        try {
            const user = req.user
            const {
                locationId,
                routeId,
                latitude,
                longitude,
                safetyLevel,
                incidentType,
                description,
                timeOfIncident,
                isAnonymous = false,
                severity = 3,
                affectsTransport = false,
                transportModes = [],
                recommendedAction,
                attachments = [],
            } = req.body

            // Validate required fields
            if (!safetyLevel || !incidentType || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Safety level, incident type, and description are required',
                })
            }

            // Validate that either location/route or coordinates are provided
            if (!locationId && !routeId && (!latitude || !longitude)) {
                return res.status(400).json({
                    success: false,
                    message: 'Either location, route, or coordinates must be provided',
                })
            }

            // Create safety report
            const safetyReport = await SafetyReport.create({
                reportedBy: user.id,
                locationId,
                routeId,
                latitude,
                longitude,
                safetyLevel,
                incidentType,
                description,
                timeOfIncident: timeOfIncident ? new Date(timeOfIncident) : null,
                isAnonymous,
                severity,
                affectsTransport,
                transportModes,
                recommendedAction,
                attachments,
                ipAddress: req.ip,
            })

            // Update user reputation
            await user.updateReputation(10) // +10 for creating a safety report

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'safety_report_create',
                resourceId: safetyReport.id,
                resourceType: 'safety_report',
                interactionData: { safetyLevel, incidentType, severity },
                userLat: latitude,
                userLng: longitude,
                ipAddress: req.ip,
            })

            // Fetch complete report with associations
            const completeReport = await SafetyReport.findByPk(safetyReport.id, {
                include: [
                    {
                        model: User,
                        as: 'reporter',
                        attributes: isAnonymous ? [] : ['id', 'firstName', 'lastName'],
                    },
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                ],
            })

            res.status(201).json({
                success: true,
                message: 'Safety report created successfully',
                data: {
                    safetyReport: completeReport,
                },
            })
        } catch (error) {
            logger.error('Create safety report error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create safety report',
                error: error.message,
            })
        }
    },

    // Get safety reports
    getSafetyReports: async (req, res) => {
        try {
            const user = req.user
            const {
                locationId,
                routeId,
                safetyLevel,
                incidentType,
                minSeverity,
                resolved,
                lat,
                lng,
                radius = 5000,
                limit = 20,
                offset = 0,
            } = req.query

            let where = {}
            let include = [
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                },
                { model: Location, as: 'location', required: false },
                { model: Route, as: 'route', required: false },
            ]

            // Apply filters
            if (locationId) where.locationId = locationId
            if (routeId) where.routeId = routeId
            if (safetyLevel) where.safetyLevel = safetyLevel
            if (incidentType) where.incidentType = incidentType
            if (minSeverity) where.severity = { [Op.gte]: parseInt(minSeverity) }
            if (resolved !== undefined) where.isResolved = resolved === 'true'

            let reports
            
            // Location-based search
            if (lat && lng) {
                const latitude = parseFloat(lat)
                const longitude = parseFloat(lng)
                const radiusKm = parseInt(radius) / 1000

                reports = await SafetyReport.findInArea(latitude, longitude, radiusKm)
                
                // Apply additional filters
                reports = reports.filter(report => {
                    if (locationId && report.locationId !== locationId) return false
                    if (routeId && report.routeId !== routeId) return false
                    if (safetyLevel && report.safetyLevel !== safetyLevel) return false
                    if (incidentType && report.incidentType !== incidentType) return false
                    if (minSeverity && report.severity < parseInt(minSeverity)) return false
                    if (resolved !== undefined && report.isResolved !== (resolved === 'true')) return false
                    return true
                })
            } else {
                reports = await SafetyReport.findAll({
                    where,
                    include,
                    order: [['severity', 'DESC'], ['createdAt', 'DESC']],
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                })
            }

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'safety_reports_view',
                resourceType: 'safety_report',
                interactionData: {
                    filters: { locationId, routeId, safetyLevel, incidentType },
                    reportsCount: reports.length,
                },
                userLat: lat ? parseFloat(lat) : null,
                userLng: lng ? parseFloat(lng) : null,
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    safetyReports: reports,
                    filters: { locationId, routeId, safetyLevel, incidentType, minSeverity, resolved },
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: reports.length === parseInt(limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Get safety reports error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get safety reports',
                error: error.message,
            })
        }
    },

    // Vote on safety report
    voteSafetyReport: async (req, res) => {
        try {
            const { reportId } = req.params
            const { voteType } = req.body // 'upvote' or 'downvote'
            const user = req.user

            if (!['upvote', 'downvote'].includes(voteType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vote type must be either "upvote" or "downvote"',
                })
            }

            const report = await SafetyReport.findByPk(reportId)

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Safety report not found',
                })
            }

            // Check if user is the reporter
            if (report.reportedBy === user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot vote on your own report',
                })
            }

            // Add vote
            if (voteType === 'upvote') {
                report.upvotes += 1
            } else {
                report.downvotes += 1
            }

            await report.save(['upvotes', 'downvotes'])

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'safety_report_vote',
                resourceId: reportId,
                resourceType: 'safety_report',
                interactionData: { voteType },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: `Safety report ${voteType}d successfully`,
                data: {
                    upvotes: report.upvotes,
                    downvotes: report.downvotes,
                    credibilityScore: report.getCredibilityScore(),
                },
            })
        } catch (error) {
            logger.error('Vote safety report error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to vote on safety report',
                error: error.message,
            })
        }
    },

    // Submit route contribution
    submitRouteContribution: async (req, res) => {
        try {
            const user = req.user
            const {
                contributionType,
                routeId,
                routeName,
                routeDescription,
                startLocationId,
                endLocationId,
                transportMode,
                estimatedFare,
                estimatedDuration,
                routeSteps = [],
                supportingEvidence = [],
                contributorNotes,
            } = req.body

            // Validate input
            if (!contributionType) {
                return res.status(400).json({
                    success: false,
                    message: 'Contribution type is required',
                })
            }

            // Create route contribution
            const contribution = await RouteContribution.create({
                contributorId: user.id,
                contributionType,
                routeId,
                routeName,
                routeDescription,
                startLocationId,
                endLocationId,
                transportMode,
                estimatedFare,
                estimatedDuration,
                routeSteps,
                supportingEvidence,
                contributorNotes,
            })

            // Update user reputation
            await user.updateReputation(15) // +15 for contributing a route

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'route_contribution_submit',
                resourceId: contribution.id,
                resourceType: 'route_contribution',
                interactionData: { contributionType, transportMode },
                ipAddress: req.ip,
            })

            res.status(201).json({
                success: true,
                message: 'Route contribution submitted successfully',
                data: {
                    contribution,
                },
            })
        } catch (error) {
            logger.error('Submit route contribution error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to submit route contribution',
                error: error.message,
            })
        }
    },

    // Submit user feedback
    submitUserFeedback: async (req, res) => {
        try {
            const user = req.user
            const {
                type,
                feedbackCategory,
                title,
                description,
                routeId,
                locationId,
                rating,
                isAnonymous = false,
                contactEmail,
                priority = 3,
                attachments = [],
                tags = [],
            } = req.body

            // Validate input
            if (!type || !title || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Type, title, and description are required',
                })
            }

            // Create user feedback
            const feedback = await UserFeedback.create({
                userId: user.id,
                type,
                feedbackCategory,
                title,
                description,
                routeId,
                locationId,
                rating,
                isAnonymous,
                contactEmail: contactEmail || user.email,
                priority,
                attachments,
                tags,
                deviceInfo: {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                },
                ipAddress: req.ip,
            })

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'user_feedback_submit',
                resourceId: feedback.id,
                resourceType: 'user_feedback',
                interactionData: { type, feedbackCategory, priority },
                ipAddress: req.ip,
            })

            res.status(201).json({
                success: true,
                message: 'Feedback submitted successfully',
                data: {
                    feedback: {
                        id: feedback.id,
                        type: feedback.type,
                        title: feedback.title,
                        status: feedback.status,
                        createdAt: feedback.createdAt,
                    },
                },
            })
        } catch (error) {
            logger.error('Submit user feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to submit feedback',
                error: error.message,
            })
        }
    },
}

module.exports = communityController