const express = require('express');
const app = express();
const PORT = 9000;

const clientes = require('./routes/clientes');
const productos = require('./routes/productos');

app.use(express.static('public'));
app.use('/clientes', clientes);
app.use('/productos', productos);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Servidor app_sorteo_ES_002 corriendo en http://localhost:${PORT}`);
});