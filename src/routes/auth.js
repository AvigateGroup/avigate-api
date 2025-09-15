const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { authValidators, validate } = require('../utils/validators')
const { authenticate } = require('../middleware/auth')
const rateLimiter = require('../middleware/rateLimiter')

router.post(
    '/register',
    rateLimiter.auth,
    validate(authValidators.register),
    authController.register
)

router.post(
    '/login',
    rateLimiter.auth,
    validate(authValidators.login),
    authController.login
)

router.post(
    '/google',
    rateLimiter.auth,
    validate(authValidators.googleAuth),
    authController.googleAuth
)

router.post(
    '/refresh-token',
    validate(authValidators.refreshToken),
    authController.refreshToken
)

router.post('/logout', authenticate, authController.logout)

router.get('/profile', authenticate, authController.getProfile)

router.put(
    '/profile',
    authenticate,
    validate(authValidators.updateProfile),
    authController.updateProfile
)

router.post(
    '/change-password',
    authenticate,
    validate({
        currentPassword: require('joi').string().required(),
        newPassword: require('joi').string().min(8).max(128).required(),
    }),
    authController.changePassword
)

module.exports = router
