const express = require('express');
const router = express.Router();
const { createReading, getReadings } = require('../controllers/readingController');

router.post('/', createReading);
router.get('/:machineId', getReadings);

module.exports = router;
