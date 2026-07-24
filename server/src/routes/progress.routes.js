const express = require('express');
const router = express.Router();
const {
  getOverview,
  getStreak,
  getWeekly,
  getGRE,
  getLearnedVocab,
  toggleLearnedVocab,
  syncLearnedVocab,
  resetLearnedVocab
} = require('../controllers/progress.controller');

router.get('/overview', getOverview);
router.get('/streak', getStreak);
router.get('/weekly', getWeekly);
router.get('/gre', getGRE);

router.get('/vocab', getLearnedVocab);
router.post('/vocab/toggle', toggleLearnedVocab);
router.post('/vocab/sync', syncLearnedVocab);
router.post('/vocab/reset', resetLearnedVocab);

module.exports = router;
