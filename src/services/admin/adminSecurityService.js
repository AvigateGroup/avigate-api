// Enhanced admin security utilities
const adminSecurityUtils = {
    // Check if password meets admin requirements
    validateAdminPassword: (password) => {
        const errors = []

        if (password.length < 12) {
            errors.push('Password must be at least 12 characters long')
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter')
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter')
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number')
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character')
        }

        // Check for common weak passwords
        const commonPasswords = [
            'password123',
            'admin123456',
            'avigate123',
            'qwerty123456',
        ]

        if (
            commonPasswords.some((common) =>
                password.toLowerCase().includes(common.toLowerCase())
            )
        ) {
            errors.push('Password contains common patterns that are not secure')
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    // Generate secure admin password
    generateSecurePassword: (length = 16) => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const numbers = '0123456789'
        const symbols = '!@#$%^&*(),.?":{}|<>'

        const allChars = uppercase + lowercase + numbers + symbols
        let password = ''

        // Ensure at least one character from each category
        password += uppercase[Math.floor(Math.random() * uppercase.length)]
        password += lowercase[Math.floor(Math.random() * lowercase.length)]
        password += numbers[Math.floor(Math.random() * numbers.length)]
        password += symbols[Math.floor(Math.random() * symbols.length)]

        // Fill rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)]
        }

        // Shuffle the password
        return password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('')
    },

    // Check for suspicious admin activity
    detectSuspiciousActivity: (admin, req) => {
        const suspicious = []

        // Check for unusual IP
        if (admin.lastLoginIP && admin.lastLoginIP !== req.ip) {
            suspicious.push('login_from_new_ip')
        }

        // Check for rapid requests
        const now = Date.now()
        const lastActivity = admin.lastLoginAt
            ? new Date(admin.lastLoginAt).getTime()
            : 0
        if (now - lastActivity < 60000) {
            // Less than 1 minute
            suspicious.push('rapid_activity')
        }

        // Check user agent changes
        const currentUA = req.get('User-Agent')
        if (admin.lastUserAgent && admin.lastUserAgent !== currentUA) {
            suspicious.push('user_agent_change')
        }

        // Check for non-business hours access (if configured)
        const hour = new Date().getHours()
        if (process.env.BUSINESS_HOURS_ONLY === 'true') {
            if (hour < 6 || hour > 22) {
                // Outside 6 AM - 10 PM
                suspicious.push('non_business_hours')
            }
        }

        return suspicious
    },

    // Rate limiting for sensitive operations
    createOperationLimiter: () => {
        const limits = new Map()

        return {
            checkLimit: (
                adminId,
                operation,
                maxAttempts = 5,
                windowMs = 15 * 60 * 1000
            ) => {
                const key = `${adminId}:${operation}`
                const now = Date.now()

                if (!limits.has(key)) {
                    limits.set(key, { count: 1, firstAttempt: now })
                    return { allowed: true, remaining: maxAttempts - 1 }
                }

                const record = limits.get(key)

                // Reset window if expired
                if (now - record.firstAttempt > windowMs) {
                    limits.set(key, { count: 1, firstAttempt: now })
                    return { allowed: true, remaining: maxAttempts - 1 }
                }

                // Check if limit exceeded
                if (record.count >= maxAttempts) {
                    return {
                        allowed: false,
                        remaining: 0,
                        resetTime: new Date(record.firstAttempt + windowMs),
                    }
                }

                // Increment count
                record.count++
                return {
                    allowed: true,
                    remaining: maxAttempts - record.count,
                }
            },
        }
    },
}

module.exports = {
    adminSecurityUtils,
}
