// controllers/user/directionsController.js
const {
    DirectionShare,
    Location,
    UserInteraction,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { generateSecureRandomString } = require('../../services/user/authService')
const routePlanningService = require('../../services/navigation/routePlanningService')
const QRCode = require('qrcode')


const directionsController = {
    // Create a new direction share
    createDirectionShare: async (req, res) => {
        try {
            const user = req.user
            const {
                title,
                description,
                startLocation,
                endLocation,
                customInstructions,
                preferredTransportModes = [],
                isPublic = false,
                allowedUsers = [],
                accessCode,
                expiresAt,
                maxUses,
                cityRestriction,
            } = req.body

            // Validate input
            if (!startLocation && !endLocation) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one location (start or end) is required',
                })
            }

            // Generate unique share ID
            let shareId
            let shareExists = true
            let attempts = 0

            while (shareExists && attempts < 10) {
                shareId = generateSecureRandomString(12, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
                const existing = await DirectionShare.findOne({ where: { shareId } })
                shareExists = !!existing
                attempts++
            }

            if (shareExists) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate unique share ID',
                })
            }

            // Process locations
            let startLocationId = null
            let endLocationId = null
            let startLat = null
            let startLng = null
            let endLat = null
            let endLng = null
            let startAddress = null
            let endAddress = null

            if (startLocation) {
                if (startLocation.id) {
                    startLocationId = startLocation.id
                    const loc = await Location.findByPk(startLocation.id)
                    if (loc) {
                        startLat = loc.latitude
                        startLng = loc.longitude
                        startAddress = loc.getFullAddress()
                    }
                } else {
                    startLat = startLocation.latitude
                    startLng = startLocation.longitude
                    startAddress = startLocation.address || startLocation.name
                }
            }

            if (endLocation) {
                if (endLocation.id) {
                    endLocationId = endLocation.id
                    const loc = await Location.findByPk(endLocation.id)
                    if (loc) {
                        endLat = loc.latitude
                        endLng = loc.longitude
                        endAddress = loc.getFullAddress()
                    }
                } else {
                    endLat = endLocation.latitude
                    endLng = endLocation.longitude
                    endAddress = endLocation.address || endLocation.name
                }
            }

            // Create direction share
            const directionShare = await DirectionShare.create({
                shareId,
                createdBy: user.id,
                title,
                description,
                startLocationId,
                endLocationId,
                startLat,
                startLng,
                endLat,
                endLng,
                startAddress,
                endAddress,
                customInstructions,
                preferredTransportModes,
                isPublic,
                allowedUsers,
                accessCode,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses,
                cityRestriction,
                shareUrl: `${req.protocol}://${req.get('host')}/directions/${shareId}`,
            })

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'direction_share_create',
                resourceId: directionShare.id,
                resourceType: 'direction_share',
                interactionData: {
                    isPublic,
                    hasExpiry: !!expiresAt,
                    hasMaxUses: !!maxUses,
                },
                ipAddress: req.ip,
            })

            res.status(201).json({
                success: true,
                message: 'Direction share created successfully',
                data: {
                    directionShare: directionShare.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Create direction share error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create direction share',
                error: error.message,
            })
        }
    },

    // Get direction share by share ID
    getDirectionShare: async (req, res) => {
        try {
            const { shareId } = req.params
            const user = req.user

            const directionShare = await DirectionShare.findByShareId(shareId)

            if (!directionShare) {
                return res.status(404).json({
                    success: false,
                    message: 'Direction share not found',
                })
            }

            // Check access permissions
            if (!directionShare.canAccess(user?.id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this direction share',
                    requiresAuth: !user,
                    isExpired: directionShare.isExpired(),
                })
            }

            // Increment usage
            const incrementResult = await directionShare.incrementUsage(user?.id)
            if (!incrementResult) {
                return res.status(403).json({
                    success: false,
                    message: 'Direction share has reached maximum usage or is expired',
                })
            }

            // Generate route if locations are available
            let routeOptions = null
            if ((directionShare.startLat && directionShare.startLng) && 
                (directionShare.endLat && directionShare.endLng)) {
                
                const routeResult = await routePlanningService.planRoute(
                    {
                        latitude: directionShare.startLat,
                        longitude: directionShare.startLng,
                        address: directionShare.startAddress,
                    },
                    {
                        latitude: directionShare.endLat,
                        longitude: directionShare.endLng,
                        address: directionShare.endAddress,
                    },
                    {
                        transportModes: directionShare.preferredTransportModes.length > 0 
                            ? directionShare.preferredTransportModes 
                            : ['bus', 'taxi', 'keke_napep', 'walking'],
                        maxAlternatives: 3,
                        includeRealTime: true,
                    }
                )

                if (routeResult.success) {
                    routeOptions = routeResult.routes
                }
            }

            // Log access
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'direction_share_access',
                resourceId: directionShare.id,
                resourceType: 'direction_share',
                interactionData: {
                    shareId,
                    hasRoutes: !!routeOptions,
                },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    directionShare: {
                        ...directionShare.toJSON(),
                        routeOptions,
                    },
                },
            })
        } catch (error) {
            logger.error('Get direction share error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get direction share',
                error: error.message,
            })
        }
    },

    // Get user's direction shares
    getUserDirectionShares: async (req, res) => {
        try {
            const user = req.user
            const {
                includeExpired = false,
                limit = 20,
                offset = 0,
            } = req.query

            const directionShares = await DirectionShare.findByUser(
                user.id,
                includeExpired === 'true'
            )

            // Apply pagination
            const paginatedShares = directionShares.slice(
                parseInt(offset),
                parseInt(offset) + parseInt(limit)
            )

            res.json({
                success: true,
                data: {
                    directionShares: paginatedShares,
                    total: directionShares.length,
                    hasMore: directionShares.length > parseInt(offset) + parseInt(limit),
                },
            })
        } catch (error) {
            logger.error('Get user direction shares error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get direction shares',
                error: error.message,
            })
        }
    },

    // Update direction share
    updateDirectionShare: async (req, res) => {
        try {
            const { shareId } = req.params
            const user = req.user
            const updates = req.body

            const directionShare = await DirectionShare.findOne({
                where: { shareId, createdBy: user.id },
            })

            if (!directionShare) {
                return res.status(404).json({
                    success: false,
                    message: 'Direction share not found or access denied',
                })
            }

            // Update allowed fields
            const allowedUpdates = [
                'title', 'description', 'customInstructions', 'preferredTransportModes',
                'isPublic', 'allowedUsers', 'accessCode', 'expiresAt', 'maxUses'
            ]

            for (const field of allowedUpdates) {
                if (updates[field] !== undefined) {
                    directionShare[field] = updates[field]
                }
            }

            await directionShare.save()

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'direction_share_update',
                resourceId: directionShare.id,
                resourceType: 'direction_share',
                interactionData: { updatedFields: Object.keys(updates) },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: 'Direction share updated successfully',
                data: {
                    directionShare: directionShare.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Update direction share error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update direction share',
                error: error.message,
            })
        }
    },

    // Delete direction share
    deleteDirectionShare: async (req, res) => {
        try {
            const { shareId } = req.params
            const user = req.user

            const directionShare = await DirectionShare.findOne({
                where: { shareId, createdBy: user.id },
            })

            if (!directionShare) {
                return res.status(404).json({
                    success: false,
                    message: 'Direction share not found or access denied',
                })
            }

            // Soft delete by setting status to disabled
            directionShare.status = 'disabled'
            await directionShare.save()

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'direction_share_delete',
                resourceId: directionShare.id,
                resourceType: 'direction_share',
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: 'Direction share deleted successfully',
            })
        } catch (error) {
            logger.error('Delete direction share error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to delete direction share',
                error: error.message,
            })
        }
    },

    // Get public direction shares
    getPublicDirectionShares: async (req, res) => {
        try {
            const {
                city,
                limit = 20,
                offset = 0,
            } = req.query

            const directionShares = await DirectionShare.findPublic(city, parseInt(limit))

            res.json({
                success: true,
                data: {
                    directionShares,
                    filters: { city },
                    total: directionShares.length,
                },
            })
        } catch (error) {
            logger.error('Get public direction shares error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get public direction shares',
                error: error.message,
            })
        }
    },

    // Generate QR code for direction share
    generateQRCode: async (req, res) => {
    try {
        const { shareId } = req.params
        const user = req.user
        const { format = 'data_url' } = req.query // 'data_url', 'buffer', or 'svg'

        const directionShare = await DirectionShare.findOne({
            where: { shareId, createdBy: user.id },
        })

        if (!directionShare) {
            return res.status(404).json({
                success: false,
                message: 'Direction share not found or access denied',
            })
        }

        let qrCodeData

        try {
            switch (format) {
                case 'svg':
                    qrCodeData = await QRCode.toString(directionShare.shareUrl, {
                        type: 'svg',
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    })
                    break

                case 'buffer':
                    qrCodeData = await QRCode.toBuffer(directionShare.shareUrl, {
                        width: 300,
                        margin: 2,
                    })
                    // Return as image
                    res.setHeader('Content-Type', 'image/png')
                    res.setHeader('Content-Disposition', `inline; filename="qr-${shareId}.png"`)
                    return res.send(qrCodeData)

                case 'data_url':
                default:
                    qrCodeData = await QRCode.toDataURL(directionShare.shareUrl, {
                        width: 300,
                        margin: 2,
                        errorCorrectionLevel: 'M'
                    })
                    break
            }

            // Optionally store the QR code URL/data in the database
            directionShare.qrCodeGenerated = true
            directionShare.qrCodeGeneratedAt = new Date()
            await directionShare.save()

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'direction_share_qr_generate',
                resourceId: directionShare.id,
                resourceType: 'direction_share',
                interactionData: { format },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    qrCode: qrCodeData,
                    shareUrl: directionShare.shareUrl,
                    format,
                },
            })
        } catch (qrError) {
            logger.error('QR code generation error:', qrError)
            return res.status(500).json({
                success: false,
                message: 'Failed to generate QR code',
                error: qrError.message,
            })
        }
    } catch (error) {
        logger.error('Generate QR code error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to generate QR code',
            error: error.message,
        })
    }
},

}

module.exports = directionsController