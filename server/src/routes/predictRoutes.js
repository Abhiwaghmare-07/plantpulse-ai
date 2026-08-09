const express = require('express');
const router = express.Router();
const { manualPredict } = require('../controllers/predictController');

router.post('/manual', manualPredict);

module.exports = router;
