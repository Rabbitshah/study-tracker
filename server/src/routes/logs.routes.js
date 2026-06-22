const express = require('express');
const router = express.Router();
const { getLogs, createLog, updateLog, endDay } = require('../controllers/logs.controller');

// IMPORTANT: /end-day must be defined before /:id to avoid route collision
router.post('/end-day', endDay);

router.get('/', getLogs);
router.post('/', createLog);
router.patch('/:id', updateLog);

module.exports = router;
