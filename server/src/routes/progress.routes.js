const express = require('express');
const router = express.Router();
const { getOverview, getStreak, getWeekly, getGRE } = require('../controllers/progress.controller');

router.get('/overview', getOverview);
router.get('/streak', getStreak);
router.get('/weekly', getWeekly);
router.get('/gre', getGRE);

module.exports = router;
