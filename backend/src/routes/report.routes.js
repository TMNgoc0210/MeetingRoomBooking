const express = require('express');
const router = express.Router();
const { getDataChart, getSummary, getRoomUsage } = require('../controllers/report.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/chart', authMiddleware, getDataChart);
router.get('/summary', authMiddleware, getSummary);
router.get('/room-usage', authMiddleware, getRoomUsage);

module.exports = router;
