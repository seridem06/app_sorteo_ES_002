const express = require('express');
const router = express.Router();

const clientes = [
  { id: 1, nombre: 'Juan Pérez',    ticket: 'A-001' },
  { id: 2, nombre: 'María García',  ticket: 'A-002' },
  { id: 3, nombre: 'Carlos López',  ticket: 'A-003' },
];

router.get('/', (req, res) => {
  res.json({ proyecto: 'app_sorteo_ES_002', clientes });
});

module.exports = router;