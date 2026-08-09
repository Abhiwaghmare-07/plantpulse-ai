const express = require('express');
const router = express.Router();
const {
  createMachine,
  getAllMachines,
  getMachine,
  deleteMachine,
} = require('../controllers/machineController');

router.post('/', createMachine);
router.get('/', getAllMachines);
router.get('/:machineId', getMachine);
router.delete('/:machineId', deleteMachine);

module.exports = router;
