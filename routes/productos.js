const express = require('express');
const router = express.Router();

const productos = [
  { id: 1, nombre: 'Laptop',     precio: 2500 },
  { id: 2, nombre: 'Smartphone', precio: 1200 },
  { id: 3, nombre: 'Tablet',     precio: 800  },
];

router.get('/', (req, res) => {
  res.json({ proyecto: 'app_sorteo_ES_002', productos });
});

module.exports = router;