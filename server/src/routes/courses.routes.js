const express = require('express');
const router = express.Router();
const { getCourses, updateCourse, completeCourse } = require('../controllers/courses.controller');

router.get('/', getCourses);
router.patch('/:id', updateCourse);
router.post('/:id/complete', completeCourse);

module.exports = router;
