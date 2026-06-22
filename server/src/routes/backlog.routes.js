const express = require('express');
const router = express.Router();
const { getBacklog, clearBacklog } = require('../controllers/backlog.controller');

router.get('/', getBacklog);
router.delete('/:subject_id', clearBacklog);

module.exports = router;
