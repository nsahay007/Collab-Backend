const express = require('express')
const router = express.Router()
const { listEvents, getEventDetails } = require('../controllers/eventController')
const { optionalProtect } = require('../middleware/authMiddleware')

router.get('/', optionalProtect, listEvents)
router.get('/:id', optionalProtect, getEventDetails)

module.exports = router
