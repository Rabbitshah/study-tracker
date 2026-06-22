const express = require('express');
const router = express.Router();
const { getSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/subjects.controller');

router.get('/', getSubjects);
router.post('/', createSubject);
router.patch('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
