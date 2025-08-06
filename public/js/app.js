// Variables globales
let socket;
let username = '';
let prendas = [];
let selectedTallas = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales
    const usernameModal = new bootstrap.Modal(document.getElementById('usernameModal'));
    usernameModal.show();
    
    // Configurar eventos
    setupEventListeners();
    
    // Inicializar conexión Socket.io después de obtener el nombre de usuario
    document.getElementById('saveUsernameBtn').addEventListener('click', function() {
        const usernameInput = document.getElementById('usernameInput').value.trim();
        if (usernameInput) {
            username = usernameInput;
            document.getElementById('usernameDisplay').textContent = username;
            document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
            
            // Guardar en localStorage
            localStorage.setItem('sunStyleUsername', username);
            
            usernameModal.hide();
            initializeSocket();
        } else {
            showToast('Por favor ingresa un nombre de usuario válido', 'error');
        }
    });
    
    // Verificar si ya hay un nombre de usuario guardado
    const savedUsername = localStorage.getItem('sunStyleUsername');
    if (savedUsername) {
        username = savedUsername;
        document.getElementById('usernameInput').value = username;
        document.getElementById('usernameDisplay').textContent = username;
        document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
        usernameModal.hide();
        initializeSocket();
    }
});

function initializeSocket() {
    // Conectar al servidor Socket.io (Render)
    socket = io('https://sunstyle.onrender.com');
    
    socket.on('connect', () => {
        console.log('Conectado al servidor');
        showToast('Conectado al servidor');
        
        // Enviar el nombre de usuario al servidor
        socket.emit('setUsername', username);
        
        // Solicitar las prendas existentes
        socket.emit('getPrendas');
    });
    
    socket.on('connect_error', (err) => {
        console.error('Error de conexión:', err.message);
        // The CORS error will trigger this event
        showToast(`No se pudo conectar al servidor: ${err.message}`, 'error');
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado del servidor');
        showToast('Desconectado del servidor', 'error');
    });
    
    socket.on('prendasActualizadas', (prendasActualizadas) => {
        prendas = prendasActualizadas;
        renderPrendas();
    });
    
    socket.on('nuevaPrenda', (nuevaPrenda) => {
        prendas.unshift(nuevaPrenda);
        renderPrendas();
        showToast(`Nueva prenda agregada: ${nuevaPrenda.nombre}`);
    });
    
    socket.on('error', (error) => {
        console.error('Error:', error);
        showToast(`Error: ${error.message}`, 'error');
    });
}

function setupEventListeners() {
    // Selector de tallas
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tag = this.getAttribute('data-tag');
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                if (!selectedTallas.includes(tag)) {
                    selectedTallas.push(tag);
                }
            } else {
                selectedTallas = selectedTallas.filter(t => t !== tag);
            }
            
            document.getElementById('prendaTallas').value = selectedTallas.join(',');
        });
    });
    
    // Vista previa de imagen
    document.getElementById('prendaImagen').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('prendaImagePreview');
                preview.src = event.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Guardar prenda - CÓDIGO CORREGIDO
    document.getElementById('savePrendaBtn').addEventListener('click', function() {
        const nombre = document.getElementById('prendaNombre').value.trim();
        const descripcion = document.getElementById('prendaDescripcion').value.trim();
        const precio = parseFloat(document.getElementById('prendaPrecio').value);
        const tallas = selectedTallas;
        const categoria = document.getElementById('prendaCategoria').value;
        const color = document.getElementById('prendaColor').value;
        const imagenInput = document.getElementById('prendaImagen');
        
        // Validación mejorada
        if (!nombre || nombre.length < 3) {
            showToast('El nombre debe tener al menos 3 caracteres', 'error');
            return;
        }
        
        if (!descripcion || descripcion.length < 10) {
            showToast('La descripción debe tener al menos 10 caracteres', 'error');
            return;
        }
        
        if (isNaN(precio) || precio <= 0) {
            showToast('Ingresa un precio válido mayor a 0', 'error');
            return;
        }
        
        if (tallas.length === 0) {
            showToast('Selecciona al menos una talla', 'error');
            return;
        }
        
        if (imagenInput.files.length === 0) {
            showToast('Debes seleccionar una imagen', 'error');
            return;
        }
        
        const file = imagenInput.files[0];
        
        // Validar tamaño de imagen (máximo 10MB)
        if (file.size > 10485760) {
            showToast('La imagen no debe pesar más de 10MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const nuevaPrenda = {
                id: Date.now().toString(),
                nombre,
                descripcion,
                precio,
                tallas,
                categoria,
                color,
                imagen: event.target.result,
                vendedor: username,
                fecha: new Date().toLocaleString()
            };
            
            // Debug: Mostrar en consola lo que se enviará
            console.log('Enviando prenda:', nuevaPrenda);
            
            // Emitir al servidor con callback para manejar la respuesta
            socket.emit('addPrenda', nuevaPrenda, (response) => {
                // Callback para manejar la respuesta del servidor
                if (response.success) {
                    showToast(`Prenda "${nuevaPrenda.nombre}" publicada correctamente`);
                    
                    // Limpiar formulario
                    document.getElementById('prendaForm').reset();
                    document.getElementById('prendaImagePreview').style.display = 'none';
                    
                    // Limpiar tallas seleccionadas
                    selectedTallas = [];
                    document.querySelectorAll('.tag-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // Cerrar modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addPrendaModal'));
                    modal.hide();
                } else {
                    showToast(`Error al publicar: ${response.message}`, 'error');
                }
            });
        };
        
        reader.onerror = function() {
            showToast('Error al leer la imagen', 'error');
        };
        
        reader.readAsDataURL(file);
    });
    
    // Buscador de prendas
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredPrendas = prendas.filter(prenda => 
            prenda.nombre.toLowerCase().includes(searchTerm) || 
            prenda.descripcion.toLowerCase().includes(searchTerm) ||
            prenda.categoria.toLowerCase().includes(searchTerm)
        ); 
        
        renderPrendas(filteredPrendas);
    });
}

function showToast(message, type = 'success') {
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.show();
}
