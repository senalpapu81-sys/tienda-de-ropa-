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

  // Agregar nueva prenda con validación y callback
  socket.on('addPrenda', (nuevaPrenda, callback) => {
    try {
      // Validación básica en el servidor
      if (!nuevaPrenda || typeof nuevaPrenda !== 'object') {
        throw new Error('Datos de la prenda inválidos');
      }
      
      if (!nuevaPrenda.nombre || nuevaPrenda.nombre.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
      }
      
      if (!nuevaPrenda.descripcion || nuevaPrenda.descripcion.trim().length < 10) {
        throw new Error('La descripción debe tener al menos 10 caracteres');
      }
      
      if (!nuevaPrenda.precio || isNaN(nuevaPrenda.precio) || nuevaPrenda.precio <= 0) {
        throw new Error('El precio debe ser un número válido mayor a 0');
      }
      
      if (!nuevaPrenda.tallas || !Array.isArray(nuevaPrenda.tallas) || nuevaPrenda.tallas.length === 0) {
        throw new Error('Debes seleccionar al menos una talla');
      }
      
      if (!nuevaPrenda.imagen || !nuevaPrenda.imagen.startsWith('data:image')) {
        throw new Error('Debes seleccionar una imagen válida');
      }
      
      // Agregar a la lista
      prendas.unshift(nuevaPrenda);
      guardarPrendas();
      
      // Notificar a todos los clientes
      io.emit('nuevaPrenda', nuevaPrenda);
      
      // Responder con éxito
      if (typeof callback === 'function') {
        callback({ success: true, message: 'Prenda agregada correctamente' });
      }
      
      console.log(`Nueva prenda agregada: ${nuevaPrenda.nombre} por ${nuevaPrenda.vendedor}`);
      
    } catch (error) {
      console.error('Error al agregar prenda:', error.message);
      
      // Responder con error
      if (typeof callback === 'function') {
        callback({ success: false, message: error.message });
      }
    }
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