
// services/fare/fareValidationService.js
const { FareFeedback } = require('../../models')
const { logger } = require('../../utils/logger')

class FareValidationService {
    constructor() {
        this.validationThresholds = {
            deviationPercentage: 50, // 50% deviation from average
            minimumFeedbackCount: 3,
            maximumReasonableFare: 50000, // 50,000 NGN
        }
    }

    // Validate fare feedback
    async validateFareFeedback(fareFeedback) {
        try {
            const validationResults = {
                isValid: true,
                warnings: [],
                errors: [],
                verificationScore: 10,
            }

            // Check amount reasonableness
            if (fareFeedback.amountPaid > this.validationThresholds.maximumReasonableFare) {
                validationResults.warnings.push('Fare amount seems unusually high')
                validationResults.verificationScore -= 3
            }

            // Check against historical data
            if (fareFeedback.routeId) {
                const historicalCheck = await this.checkAgainstHistoricalData(fareFeedback)
                if (!historicalCheck.isReasonable) {
                    validationResults.warnings.push(historicalCheck.message)
                    validationResults.verificationScore -= 2
                }
            }

            // Check fare type consistency
            if (fareFeedback.fareType === 'fixed' && fareFeedback.suggestedAmount) {
                const difference = Math.abs(fareFeedback.amountPaid - fareFeedback.suggestedAmount)
                if (difference > fareFeedback.suggestedAmount * 0.1) {
                    validationResults.warnings.push('Fixed fare differs from suggested amount')
                    validationResults.verificationScore -= 1
                }
            }

            // Check passenger count reasonableness
            if (fareFeedback.passengerCount > 10) {
                validationResults.warnings.push('Unusually high passenger count')
                validationResults.verificationScore -= 1
            }

            validationResults.isValid = validationResults.errors.length === 0
            validationResults.verificationScore = Math.max(0, Math.min(10, validationResults.verificationScore))

            return validationResults
        } catch (error) {
            logger.error('Validate fare feedback error:', error)
            return {
                isValid: false,
                warnings: [],
                errors: ['Validation failed'],
                verificationScore: 0,
            }
        }
    }

    // Check fare against historical data
    async checkAgainstHistoricalData(fareFeedback) {
        try {
            const historicalData = await FareFeedback.getAverageFare(
                fareFeedback.routeId,
                fareFeedback.vehicleType,
                30
            )

            if (!historicalData || !historicalData.averageFare) {
                return {
                    isReasonable: true,
                    message: 'No historical data available for comparison',
                }
            }

            if (parseInt(historicalData.feedbackCount) < this.validationThresholds.minimumFeedbackCount) {
                return {
                    isReasonable: true,
                    message: 'Insufficient historical data for reliable comparison',
                }
            }

            const avgFare = parseFloat(historicalData.averageFare)
            const deviation = Math.abs(fareFeedback.amountPaid - avgFare) / avgFare * 100

            if (deviation > this.validationThresholds.deviationPercentage) {
                return {
                    isReasonable: false,
                    message: `Fare deviates ${deviation.toFixed(0)}% from historical average of ₦${avgFare.toFixed(0)}`,
                    historicalAverage: avgFare,
                    deviation: deviation,
                }
            }

            return {
                isReasonable: true,
                message: 'Fare is within reasonable range',
                historicalAverage: avgFare,
                deviation: deviation,
            }
        } catch (error) {
            logger.error('Check against historical data error:', error)
            return {
                isReasonable: true,
                message: 'Could not validate against historical data',
            }
        }
    }

    // Calculate user trust score for fare reporting
    calculateUserTrustScore(user, fareFeedbackHistory = []) {
        let trustScore = 50 // Base score

        // Reputation bonus
        if (user.reputationScore > 200) {
            trustScore += 20
        } else if (user.reputationScore > 100) {
            trustScore += 10
        }

        // Contribution bonus
        if (user.totalContributions > 50) {
            trustScore += 15
        } else if (user.totalContributions > 20) {
            trustScore += 10
        } else if (user.totalContributions > 10) {
            trustScore += 5
        }

        // Historical accuracy bonus
        const verifiedFeedbacks = fareFeedbackHistory.filter(f => f.isVerified && !f.isDisputed)
        if (verifiedFeedbacks.length > 10) {
            trustScore += 10
        } else if (verifiedFeedbacks.length > 5) {
            trustScore += 5
        }

        // Dispute penalty
        const disputedFeedbacks = fareFeedbackHistory.filter(f => f.isDisputed)
        trustScore -= disputedFeedbacks.length * 5

        return Math.max(0, Math.min(100, trustScore))
    }
}

module.exports = new FareValidationService()