const express = require('express');
const serialController = require('../services/serialController');
const router = express.Router();

router.post('/change-port', (req, res) => {
  const { comPort } = req.body;
  if (!comPort) return res.status(400).send({ error: 'COM port is required' });
  
  const message = serialController.changePort(comPort);
  res.json({ message });
});

module.exports = router;
