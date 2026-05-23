
const selectCliente = document.getElementById('clienteSelect');
const selectMarca = document.getElementById('marcaSelect');
const selectTransmision = document.getElementById('transmisionSelect');
const selectTraccion = document.getElementById('traccionSelect');
const selectCombustible = document.getElementById('combustibleSelect');
const selectImagen = document.getElementById('imagenSelect');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

let toastTimer;

function showToast(type, message) {
    if (!toast || !toastMessage) return;

    clearTimeout(toastTimer);
    toast.classList.remove('toast-success', 'toast-error', 'is-hidden', 'is-visible');
    toast.classList.add(type === 'error' ? 'toast-error' : 'toast-success');
    toastMessage.textContent = message || '';

    requestAnimationFrame(() => {
        toast.classList.add('is-visible');
    });

    toastTimer = setTimeout(hideToast, 4200);
}

function hideToast() {
    if (!toast) return;

    toast.classList.remove('is-visible');
    toastTimer = setTimeout(() => {
        toast.classList.add('is-hidden');
    }, 250);
}


let imagenSeleccionadaId = null;


document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
    cargarMarcas();
    cargarTransmisiones();
    cargarTracciones();
    cargarCombustibles();
    cargarImagenes();
    
    
    const inputImagen = document.getElementById('inputImagen');
    const inputCamara = document.getElementById('inputCamara');
    
    if (inputImagen) {
        inputImagen.addEventListener('change', function(event) {
            previewImagen(event);
            
            setTimeout(() => subirImagen(), 500);
        });
    }
    
    
    if (inputCamara) {
        inputCamara.addEventListener('change', function(event) {
            previewImagen(event);
            
            setTimeout(() => subirImagenCamara(), 500);
        });
    }

    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }

    const serverSuccess = toast && toast.dataset.serverSuccess === 'true';
    if (serverSuccess) {
        setTimeout(() => showToast('success', 'Dato guardado correctamente'), 150);
    }
});


function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const isActive = content.classList.contains('active');
    
    content.classList.toggle('active');
    header.classList.toggle('active');
    
    if (isActive) {
        content.style.maxHeight = '0px';
    } else {
        content.style.maxHeight = '2000px';
    }
}


function cargarClientes() {
    if (!selectCliente) return;
    
    fetch('/api/clientes')
        .then(response => response.json())
        .then(data => {
            selectCliente.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
            
            data.sort((a, b) => {
                const nombreA = `${a.nombres} ${a.apellidos}`;
                const nombreB = `${b.nombres} ${b.apellidos}`;
                return nombreA.localeCompare(nombreB);
            });
            data.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = `${cliente.nombres} ${cliente.apellidos}`;
                selectCliente.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando clientes:', error));
}


function cargarMarcas() {
    if (!selectMarca) return;
    
    fetch('/api/marcas')
        .then(response => response.json())
        .then(data => {
            selectMarca.innerHTML = '<option value="">-- Seleccionar Marca --</option>';
            
            data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.forEach(marca => {
                const option = document.createElement('option');
                option.value = marca.id;
                option.textContent = marca.nombre;
                selectMarca.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando marcas:', error));
}


function cargarTransmisiones() {
    if (!selectTransmision) return;
    
    fetch('/api/transmisiones')
        .then(response => response.json())
        .then(data => {
            selectTransmision.innerHTML = '<option value="">-- Seleccionar Transmisión --</option>';
            
            data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.forEach(transmision => {
                const option = document.createElement('option');
                option.value = transmision.id;
                option.textContent = transmision.nombre;
                selectTransmision.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando transmisiones:', error));
}


function cargarTracciones() {
    if (!selectTraccion) return;
    
    fetch('/api/tracciones')
        .then(response => response.json())
        .then(data => {
            selectTraccion.innerHTML = '<option value="">-- Seleccionar Tracción --</option>';
            
            data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.forEach(traccion => {
                const option = document.createElement('option');
                option.value = traccion.id;
                option.textContent = traccion.nombre;
                selectTraccion.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando tracciones:', error));
}


function cargarCombustibles() {
    if (!selectCombustible) return;
    
    fetch('/api/combustibles')
        .then(response => response.json())
        .then(data => {
            selectCombustible.innerHTML = '<option value="">-- Seleccionar Combustible --</option>';
            
            data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.forEach(combustible => {
                const option = document.createElement('option');
                option.value = combustible.id;
                option.textContent = combustible.nombre;
                selectCombustible.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando combustibles:', error));
}


function cargarImagenes() {
    if (!selectImagen) return Promise.resolve();
    
    return fetch('/api/imagenes')
        .then(response => response.json())
        .then(data => {
            selectImagen.innerHTML = '<option value="">-- Seleccionar Imagen --</option>';
            
            data.sort((a, b) => a.nombre_imagen.localeCompare(b.nombre_imagen));
            data.forEach(imagen => {
                const option = document.createElement('option');
                option.value = imagen.id;
                option.textContent = imagen.nombre_imagen;
                selectImagen.appendChild(option);
            });
            return data;
        })
        .catch(error => {
            console.error('Error cargando imágenes:', error);
            return [];
        });
}


function previewImagen(event) {
    const file = event.target.files[0];
    const previewImg = document.getElementById('imagenPreview');
    const estadoDiv = document.getElementById('estadoImagen');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            estadoDiv.textContent = `Archivo seleccionado: ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}


function subirImagen() {
    const inputImagen = document.getElementById('inputImagen');
    const file = inputImagen.files[0];
    const estadoDiv = document.getElementById('estadoImagen');
    
    if (!file) {
        estadoDiv.textContent = '❌ Por favor selecciona una imagen';
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const maxSize = 32 * 1024 * 1024;
    if (file.size > maxSize) {
        estadoDiv.textContent = `❌ Archivo demasiado grande (máx 16MB, tu archivo: ${(file.size / (1024*1024)).toFixed(2)}MB)`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
        estadoDiv.textContent = `❌ Tipo de archivo no permitido. Acepta: PNG, JPG, GIF, WebP`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    
    const formData = new FormData();
    formData.append('imagen', file);
    
    
    const vehiculoIdInput = document.querySelector('input[name="id"]');
    if (vehiculoIdInput && vehiculoIdInput.value) {
        formData.append('vehiculo_id', vehiculoIdInput.value);
        console.log('ID de vehículo:', vehiculoIdInput.value);
    } else {
        console.log('Sin ID de vehículo (nuevo registro)');
    }
    
    estadoDiv.textContent = '⏳ Subiendo imagen...';
    estadoDiv.style.color = '#1976d2';
    
    console.log('Iniciando envío a /api/imagenes');
    
    fetch('/api/imagenes', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Respuesta recibida. Status:', response.status);
        
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Respuesta no es JSON. Content-Type:', contentType);
            throw new Error(`Error del servidor (${response.status}). La respuesta no es válida.`);
        }
        
        
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `Error ${response.status}`);
            });
        }
        
        return response.json();
    })
    .then(data => {
        console.log('Datos JSON recibidos:', data);
        if (data && data.success) {
            imagenSeleccionadaId = data.imagen_id;
            estadoDiv.textContent = `✅ Imagen subida exitosamente (ID: ${data.imagen_id})`;
            estadoDiv.style.color = '#388e3c';
            console.log('Imagen guardada. ID:', data.imagen_id, 'Ruta:', data.nombre_imagen);
            
            
            inputImagen.value = '';
            
            
            cargarImagenes().then(() => {
                console.log('Imágenes recargas. Seleccionando imagen ID:', data.imagen_id);
                if (selectImagen) {
                    selectImagen.value = data.imagen_id;
                    console.log('✓ Imagen seleccionada en el select');
                }
            });
        } else {
            const errorMsg = (data && data.error) || 'Error desconocido al subir imagen';
            estadoDiv.textContent = `❌ Error: ${errorMsg}`;
            estadoDiv.style.color = '#d32f2f';
            console.error('Error en respuesta:', errorMsg);
        }
    })
    .catch(error => {
        console.error('Error al subir imagen:', error);
        let errorMsg = 'Error al subir imagen';
        
        if (error instanceof SyntaxError) {
            errorMsg = 'Error de comunicación con el servidor (respuesta inválida)';
        } else if (error instanceof TypeError) {
            errorMsg = 'Error de red. Verifica tu conexión.';
        } else {
            errorMsg = error.message;
        }
        
        estadoDiv.textContent = `❌ ${errorMsg}`;
        estadoDiv.style.color = '#d32f2f';
    });
}


function subirImagenCamara() {
    const inputCamara = document.getElementById('inputCamara');
    const file = inputCamara.files[0];
    const estadoDiv = document.getElementById('estadoImagen');
    
    if (!file) {
        estadoDiv.textContent = '❌ Por favor captura una foto';
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const maxSize = 32 * 1024 * 1024;
    if (file.size > maxSize) {
        estadoDiv.textContent = `❌ Foto demasiado grande (máx 16MB)`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
        estadoDiv.textContent = `❌ Tipo de archivo no permitido`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    console.log('Foto capturada:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    
    const formData = new FormData();
    formData.append('imagen', file);
    
    
    const vehiculoIdInput = document.querySelector('input[name="id"]');
    if (vehiculoIdInput && vehiculoIdInput.value) {
        formData.append('vehiculo_id', vehiculoIdInput.value);
        console.log('ID de vehículo:', vehiculoIdInput.value);
    } else {
        console.log('Sin ID de vehículo (nuevo registro)');
    }
    
    estadoDiv.textContent = '⏳ Subiendo foto...';
    estadoDiv.style.color = '#1976d2';
    
    console.log('Iniciando envío a /api/imagenes');
    
    fetch('/api/imagenes', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Respuesta recibida. Status:', response.status);
        
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Respuesta no es JSON. Content-Type:', contentType);
            throw new Error(`Error del servidor (${response.status}). La respuesta no es válida.`);
        }
        
        
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `Error ${response.status}`);
            });
        }
        
        return response.json();
    })
    .then(data => {
        console.log('Datos JSON recibidos:', data);
        if (data && data.success) {
            imagenSeleccionadaId = data.imagen_id;
            estadoDiv.textContent = `✅ Foto subida exitosamente (ID: ${data.imagen_id})`;
            estadoDiv.style.color = '#388e3c';
            console.log('Foto guardada. ID:', data.imagen_id, 'Ruta:', data.nombre_imagen);
            
            
            inputCamara.value = '';
            
            
            cargarImagenes().then(() => {
                console.log('Imágenes recargas. Seleccionando imagen ID:', data.imagen_id);
                if (selectImagen) {
                    selectImagen.value = data.imagen_id;
                    console.log('✓ Foto seleccionada en el select');
                }
            });
        } else {
            const errorMsg = (data && data.error) || 'Error desconocido al subir foto';
            estadoDiv.textContent = `❌ Error: ${errorMsg}`;
            estadoDiv.style.color = '#d32f2f';
            console.error('Error en respuesta:', errorMsg);
        }
    })
    .catch(error => {
        console.error('Error al subir foto:', error);
        let errorMsg = 'Error al subir foto';
        
        if (error instanceof SyntaxError) {
            errorMsg = 'Error de comunicación con el servidor (respuesta inválida)';
        } else if (error instanceof TypeError) {
            errorMsg = 'Error de red. Verifica tu conexión.';
        } else {
            errorMsg = error.message;
        }
        
        estadoDiv.textContent = `❌ ${errorMsg}`;
        estadoDiv.style.color = '#d32f2f';
    });
}


function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}


const mainForm = document.getElementById('mainForm');

if (mainForm) {
    mainForm.addEventListener('submit', function(e) {
        e.preventDefault();

        
        const tablaSelect = document.getElementById('tabla');
        const tabla = tablaSelect ? tablaSelect.value : 'cliente';

        
        const formData = new FormData(this);
        const datos = {};

        
        for (let [key, value] of formData.entries()) {
            if (value !== '') {
                if (key.includes('_id')) {
                    datos[key] = parseInt(value) || value;
                } else if (key === 'anio_elaboracion') {
                    datos[key] = parseInt(value) || value;
                } else {
                    datos[key] = value;
                }
            }
        }

        
        if (tabla === 'vehiculo') {
            console.log('DEBUG Vehículo:', {
                imagen_id: datos.imagen_id,
                selectImagen_value: selectImagen ? selectImagen.value : 'null',
                todos_datos: datos
            });
        }

        
        let endpoint = '';

        switch(tabla) {
            case 'cliente':
                endpoint = '/api/clientes';
                break;
            case 'vehiculo':
                endpoint = '/api/vehiculos';
                break;
            case 'marca':
                endpoint = '/api/marcas';
                break;
            case 'transmision':
                endpoint = '/api/transmisiones';
                break;
            case 'traccion':
                endpoint = '/api/tracciones';
                break;
            case 'combustible':
                endpoint = '/api/combustibles';
                break;
            default:
                console.error('Tabla no válida');
                return;
        }

        console.log('Enviando datos:', datos, 'a:', endpoint);

        
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
        .then(async response => {
            let payload = null;
            try {
                payload = await response.json();
            } catch (_) {
                
            }

            if (!response.ok) {
                const mensaje = payload && payload.error ? payload.error : `HTTP ${response.status}`;
                throw new Error(mensaje);
            }
            return payload;
        })
        .then(data => {
            if (data && data.success) {
                
                if (tabla === 'vehiculo' && data.vehiculo_id && data.imagen_id) {
                    console.log('Renombrando imagen:', data.imagen_id, 'para vehículo:', data.vehiculo_id);
                    
                    fetch(`/api/imagenes/${data.imagen_id}/actualizar-nombre`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ vehiculo_id: data.vehiculo_id })
                    })
                    .then(response => response.json())
                    .then(renameData => {
                        if (renameData.success) {
                            console.log('✓ Imagen renombrada:', renameData.nuevo_nombre);
                        } else {
                            console.warn('⚠ No se pudo renombrar la imagen:', renameData.error);
                        }
                    })
                    .catch(error => {
                        console.error('Error al renombrar imagen:', error);
                    });
                }
                
                showToast('success', data.message || 'Dato guardado correctamente');
                mainForm.reset();
                cargarClientes();
                cargarMarcas();
                cargarTransmisiones();
                cargarTracciones();
                cargarCombustibles();
                cargarImagenes();
            } else {
                showToast('error', data && data.error ? `Error: ${data.error}` : 'No se pudo guardar');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', `Error al enviar datos: ${error.message}`);
        });
    });
}
