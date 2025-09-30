// routes/public/search.js
const express = require('express')
const router = express.Router()
const searchController = require('../../controllers/public/searchController')
const rateLimiter = require('../../middleware/rateLimiter')

// Universal search
router.get(
    '/',
    rateLimiter.general,
    searchController.search
)

// Autocomplete search
router.get(
    '/autocomplete',
    rateLimiter.general,
    searchController.autocomplete
)

// Popular searches
router.get(
    '/popular',
    rateLimiter.general,
    searchController.getPopularSearches
)

module.exports = router