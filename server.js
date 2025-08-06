const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuración básica
const PORT = process.env.PORT || 3000;

// Almacenamiento en memoria (simulando una base de datos)
const fs = require('fs');
const dbPath = './db.json';

let prendas = [];
const usuarios = {};

// Cargar prendas desde db.json al iniciar el servidor
function cargarPrendas() {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    const json = JSON.parse(data);
    prendas = json.prendas || [];
    console.log('Prendas cargadas desde db.json');
  } catch (error) {
    console.log('No se pudo cargar db.json, iniciando con prendas vacías');
    prendas = [];
  }
}

// Guardar prendas en db.json
function guardarPrendas() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify({ prendas }, null, 2));
    console.log('Prendas guardadas en db.json');
  } catch (error) {
    console.error('Error al guardar prendas:', error);
  }
}

cargarPrendas();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuración de Socket.io
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Manejar nombre de usuario
  socket.on('setUsername', (username) => {
    usuarios[socket.id] = username;
    console.log(`Usuario ${username} registrado con socket ID ${socket.id}`);
  });

  // Obtener todas las prendas
  socket.on('getPrendas', () => {
    socket.emit('prendasActualizadas', prendas);
  });

  // Agregar nueva prenda
  socket.on('addPrenda', (nuevaPrenda) => {
    prendas.unshift(nuevaPrenda);
    guardarPrendas();
    io.emit('nuevaPrenda', nuevaPrenda);
    console.log(`Nueva prenda agregada: ${nuevaPrenda.nombre}`);
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id, usuarios[socket.id] || 'Anónimo');
    delete usuarios[socket.id];
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});