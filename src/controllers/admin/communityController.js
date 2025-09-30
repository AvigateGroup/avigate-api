// controllers/admin/communityController.js
const {
    CommunityPost,
    SafetyReport,
    RouteContribution,
    UserFeedback,
    User,
    Location,
    Route,
    Admin,
    AuditLog,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const communityController = {
    // Get all community posts with moderation filters
    getAllCommunityPosts: async (req, res) => {
        try {
            const admin = req.admin
            const {
                type,
                isVerified,
                isActive,
                isUrgent,
                isFeatured,
                reportedOnly,
                minReports = 0,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            const where = {}
            if (type) where.type = type
            if (isVerified !== undefined) where.isVerified = isVerified === 'true'
            if (isActive !== undefined) where.isActive = isActive === 'true'
            if (isUrgent !== undefined) where.isUrgent = isUrgent === 'true'
            if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true'
            
            if (reportedOnly === 'true' || minReports > 0) {
                where.reportCount = { [Op.gte]: parseInt(minReports) || 1 }
            }

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: posts } = await CommunityPost.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'reputationScore'],
                    },
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                    {
                        model: Admin,
                        as: 'verifier',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_community_posts',
                resource: 'community_post',
                metadata: { filters: { type, isVerified, reportedOnly }, count: posts.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    posts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { type, isVerified, isActive, reportedOnly },
                },
            })
        } catch (error) {
            logger.error('Admin get community posts error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get community posts',
                error: error.message,
            })
        }
    },

    // Moderate community post
    moderateCommunityPost: async (req, res) => {
        try {
            const { postId } = req.params
            const { action, reason, isFeatured } = req.body
            const admin = req.admin

            const validActions = ['verify', 'disable', 'feature', 'delete']
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
                })
            }

            const post = await CommunityPost.findByPk(postId)

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'Community post not found',
                })
            }

            const oldValues = post.toJSON()

            switch (action) {
                case 'verify':
                    post.isVerified = true
                    post.verifiedBy = admin.id
                    post.verifiedAt = new Date()
                    break
                case 'disable':
                    post.isActive = false
                    post.moderationNotes = reason
                    break
                case 'feature':
                    post.isFeatured = isFeatured !== undefined ? isFeatured : true
                    break
                case 'delete':
                    await post.destroy()
                    
                    // Log deletion
                    await AuditLog.create({
                        adminId: admin.id,
                        action: 'delete_community_post',
                        resource: 'community_post',
                        resourceId: postId,
                        oldValues,
                        metadata: { reason },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        severity: 'high',
                    })

                    return res.json({
                        success: true,
                        message: 'Community post deleted successfully',
                    })
            }

            if (action !== 'delete') {
                await post.save()
            }

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: `moderate_community_post_${action}`,
                resource: 'community_post',
                resourceId: postId,
                oldValues,
                newValues: post.toJSON(),
                metadata: { action, reason },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: `Community post ${action}d successfully`,
                data: { post },
            })
        } catch (error) {
            logger.error('Admin moderate community post error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to moderate community post',
                error: error.message,
            })
        }
    },

    // Get all safety reports
    getAllSafetyReports: async (req, res) => {
        try {
            const admin = req.admin
            const {
                safetyLevel,
                incidentType,
                isVerified,
                isResolved,
                minSeverity,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            const where = {}
            if (safetyLevel) where.safetyLevel = safetyLevel
            if (incidentType) where.incidentType = incidentType
            if (isVerified !== undefined) where.isVerified = isVerified === 'true'
            if (isResolved !== undefined) where.isResolved = isResolved === 'true'
            if (minSeverity) where.severity = { [Op.gte]: parseInt(minSeverity) }

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: reports } = await SafetyReport.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'reporter',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                    {
                        model: User,
                        as: 'verifier',
                        attributes: ['id', 'firstName', 'lastName'],
                    },
                    {
                        model: User,
                        as: 'resolver',
                        attributes: ['id', 'firstName', 'lastName'],
                    },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_safety_reports',
                resource: 'safety_report',
                metadata: { filters: { safetyLevel, incidentType, isResolved }, count: reports.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    safetyReports: reports,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { safetyLevel, incidentType, isVerified, isResolved, minSeverity },
                },
            })
        } catch (error) {
            logger.error('Admin get safety reports error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get safety reports',
                error: error.message,
            })
        }
    },

    // Verify safety report
    verifySafetyReport: async (req, res) => {
        try {
            const { reportId } = req.params
            const { verificationScore, notes } = req.body
            const admin = req.admin

            const report = await SafetyReport.findByPk(reportId)

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Safety report not found',
                })
            }

            const oldValues = report.toJSON()

            report.isVerified = true
            report.verifiedBy = admin.id
            report.verificationScore = verificationScore || 8.0
            
            if (notes) {
                await report.addStatusUpdate(notes, admin.id)
            }

            await report.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'verify_safety_report',
                resource: 'safety_report',
                resourceId: reportId,
                oldValues,
                newValues: report.toJSON(),
                metadata: { verificationScore, notes },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Safety report verified successfully',
                data: { safetyReport: report },
            })
        } catch (error) {
            logger.error('Admin verify safety report error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify safety report',
                error: error.message,
            })
        }
    },

    // Resolve safety report
    resolveSafetyReport: async (req, res) => {
        try {
            const { reportId } = req.params
            const { resolution } = req.body
            const admin = req.admin

            if (!resolution) {
                return res.status(400).json({
                    success: false,
                    message: 'Resolution notes are required',
                })
            }

            const report = await SafetyReport.findByPk(reportId)

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Safety report not found',
                })
            }

            const oldValues = report.toJSON()

            await report.markResolved(admin.id, resolution)

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'resolve_safety_report',
                resource: 'safety_report',
                resourceId: reportId,
                oldValues,
                newValues: report.toJSON(),
                metadata: { resolution },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Safety report resolved successfully',
                data: { safetyReport: report },
            })
        } catch (error) {
            logger.error('Admin resolve safety report error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to resolve safety report',
                error: error.message,
            })
        }
    },

    // Get all route contributions
    getAllRouteContributions: async (req, res) => {
        try {
            const admin = req.admin
            const {
                status,
                contributionType,
                transportMode,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            const where = {}
            if (status) where.status = status
            if (contributionType) where.contributionType = contributionType
            if (transportMode) where.transportMode = transportMode

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: contributions } = await RouteContribution.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'contributor',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'reputationScore'],
                    },
                    { model: Route, as: 'route' },
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                    {
                        model: Admin,
                        as: 'reviewer',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_route_contributions',
                resource: 'route_contribution',
                metadata: { filters: { status, contributionType }, count: contributions.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    contributions,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { status, contributionType, transportMode },
                },
            })
        } catch (error) {
            logger.error('Admin get route contributions error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get route contributions',
                error: error.message,
            })
        }
    },

    // Review route contribution
    reviewRouteContribution: async (req, res) => {
        try {
            const { contributionId } = req.params
            const { action, reviewNotes, qualityScore } = req.body
            const admin = req.admin

            const validActions = ['approve', 'reject', 'needs_review']
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
                })
            }

            const contribution = await RouteContribution.findByPk(contributionId, {
                include: [{ model: User, as: 'contributor' }],
            })

            if (!contribution) {
                return res.status(404).json({
                    success: false,
                    message: 'Route contribution not found',
                })
            }

            const oldValues = contribution.toJSON()

            contribution.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_review'
            contribution.reviewedBy = admin.id
            contribution.reviewedAt = new Date()
            contribution.reviewNotes = reviewNotes
            if (qualityScore) {
                contribution.qualityScore = qualityScore
            }

            // If approved, award reputation points
            if (action === 'approve' && contribution.contributor) {
                await contribution.contributor.updateReputation(20)
                contribution.reputationReward = 20
            }

            await contribution.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: `review_route_contribution_${action}`,
                resource: 'route_contribution',
                resourceId: contributionId,
                oldValues,
                newValues: contribution.toJSON(),
                metadata: { action, reviewNotes, qualityScore },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: `Route contribution ${action}d successfully`,
                data: { contribution },
            })
        } catch (error) {
            logger.error('Admin review route contribution error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to review route contribution',
                error: error.message,
            })
        }
    },

    // Get all user feedback
    getAllUserFeedback: async (req, res) => {
        try {
            const admin = req.admin
            const {
                type,
                status,
                priority,
                followUpRequired,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            const where = {}
            if (type) where.type = type
            if (status) where.status = status
            if (priority) where.priority = parseInt(priority)
            if (followUpRequired !== undefined) where.followUpRequired = followUpRequired === 'true'

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: feedbacks } = await UserFeedback.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                    { model: Route, as: 'route' },
                    { model: Location, as: 'location' },
                    {
                        model: Admin,
                        as: 'assignedAdmin',
                        attributes: ['id', 'firstName', 'lastName', 'email'],
                    },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_user_feedback',
                resource: 'user_feedback',
                metadata: { filters: { type, status, priority }, count: feedbacks.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    feedbacks,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { type, status, priority, followUpRequired },
                },
            })
        } catch (error) {
            logger.error('Admin get user feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get user feedback',
                error: error.message,
            })
        }
    },

    // Respond to user feedback
    respondToFeedback: async (req, res) => {
        try {
            const { feedbackId } = req.params
            const { response, status, assignTo } = req.body
            const admin = req.admin

            if (!response) {
                return res.status(400).json({
                    success: false,
                    message: 'Response is required',
                })
            }

            const feedback = await UserFeedback.findByPk(feedbackId)

            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: 'User feedback not found',
                })
            }

            const oldValues = feedback.toJSON()

            feedback.adminResponse = response
            feedback.responseAt = new Date()
            
            if (status) {
                feedback.status = status
            }
            
            if (assignTo) {
                feedback.assignedTo = assignTo
            }

            await feedback.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'respond_to_feedback',
                resource: 'user_feedback',
                resourceId: feedbackId,
                oldValues,
                newValues: feedback.toJSON(),
                metadata: { response, status, assignTo },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Response sent successfully',
                data: { feedback },
            })
        } catch (error) {
            logger.error('Admin respond to feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to respond to feedback',
                error: error.message,
            })
        }
    },
}

module.exports = communityController