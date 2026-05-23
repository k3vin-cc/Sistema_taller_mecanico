let vehiculoEditandoId = null;
let selectsMarcas = {};
let selectsTransmisiones = {};
let selectsTracciones = {};
let selectsCombustibles = {};
let selectsImagenes = {};
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');
let toastTimer;

function showToast(type, message) {
    if (!toast || !toastMessage) return;

    clearTimeout(toastTimer);
    toast.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info', 'is-hidden', 'is-visible');
    const className = {
        success: 'toast-success',
        error: 'toast-error',
        warning: 'toast-warning',
        info: 'toast-info'
    }[type] || 'toast-info';
    toast.classList.add(className);
    toastMessage.textContent = message || '';

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = setTimeout(hideToast, 4200);
}

function hideToast() {
    if (!toast) return;
    toast.classList.remove('is-visible');
    toastTimer = setTimeout(() => toast.classList.add('is-hidden'), 250);
}


let paginaActual = 1;
let vehiculosPorPagina = 20;
let todasLasTarjetas = [];
let tarjetasFiltradas = [];

function subirImagenEdicion() {
    const inputImagen = document.getElementById('editInputImagen');
    const file = inputImagen.files[0];
    const estadoDiv = document.getElementById('editEstadoImagen');
    
    if (!file) {
        estadoDiv.textContent = '❌ Por favor selecciona una imagen';
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
        estadoDiv.textContent = `❌ Archivo demasiado grande (máx 16MB)`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
        estadoDiv.textContent = `❌ Tipo de archivo no permitido. Acepta: PNG, JPG, GIF, WebP`;
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    const formData = new FormData();
    formData.append('imagen', file);
    
    estadoDiv.textContent = '⏳ Subiendo imagen...';
    estadoDiv.style.color = '#1976d2';
    
    fetch('/api/imagenes', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        
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
        if (data && data.success) {
            
            return fetch(`/api/imagenes/${data.imagen_id}/actualizar-nombre`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vehiculo_id: vehiculoEditandoId })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(d => {
                        throw new Error(d.error || 'Error al renombrar imagen');
                    });
                }
                return response.json();
            })
            .then(renameData => {
                if (renameData.success) {
                    console.log('✓ Imagen renombrada:', renameData.nuevo_nombre);
                }
                return data;
            });
        } else {
            throw new Error(data && data.error ? data.error : 'Error al subir imagen');
        }
    })
    .then(data => {
        estadoDiv.textContent = `✅ Imagen subida exitosamente`;
        estadoDiv.style.color = '#388e3c';
        
        inputImagen.value = '';
        
        
        return cargarSelectsImagenes(data.imagen_id);
    })
    .catch(error => {
        console.error('Error al subir imagen:', error);
        let errorMsg = error.message || 'Error al subir imagen';
        
        if (error instanceof SyntaxError) {
            errorMsg = 'Error de comunicación (respuesta inválida)';
        } else if (error instanceof TypeError) {
            errorMsg = 'Error de red. Verifica tu conexión.';
        }
        
        estadoDiv.textContent = `❌ ${errorMsg}`;
        estadoDiv.style.color = '#d32f2f';
    });
}

function subirImagenEdicionCamara() {
    const inputCamara = document.getElementById('editInputCamara');
    const file = inputCamara.files[0];
    const estadoDiv = document.getElementById('editEstadoImagen');
    
    if (!file) {
        estadoDiv.textContent = '❌ Por favor captura una foto';
        estadoDiv.style.color = '#d32f2f';
        return;
    }
    
    
    const maxSize = 16 * 1024 * 1024;
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
    
    const formData = new FormData();
    formData.append('imagen', file);
    
    estadoDiv.textContent = '⏳ Subiendo foto...';
    estadoDiv.style.color = '#1976d2';
    
    fetch('/api/imagenes', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        
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
        if (data && data.success) {
            
            return fetch(`/api/imagenes/${data.imagen_id}/actualizar-nombre`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vehiculo_id: vehiculoEditandoId })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(d => {
                        throw new Error(d.error || 'Error al renombrar imagen');
                    });
                }
                return response.json();
            })
            .then(renameData => {
                if (renameData.success) {
                    console.log('✓ Imagen renombrada:', renameData.nuevo_nombre);
                }
                return data;
            });
        } else {
            throw new Error(data && data.error ? data.error : 'Error al subir foto');
        }
    })
    .then(data => {
        estadoDiv.textContent = `✅ Foto subida exitosamente`;
        estadoDiv.style.color = '#388e3c';
        
        inputCamara.value = '';
        
        
        return cargarSelectsImagenes(data.imagen_id);
    })
    .catch(error => {
        console.error('Error al subir foto:', error);
        let errorMsg = error.message || 'Error al subir foto';
        
        if (error instanceof SyntaxError) {
            errorMsg = 'Error de comunicación (respuesta inválida)';
        } else if (error instanceof TypeError) {
            errorMsg = 'Error de red. Verifica tu conexión.';
        }
        
        estadoDiv.textContent = `❌ ${errorMsg}`;
        estadoDiv.style.color = '#d32f2f';
    });
}

function cargarSelectsImagenes(imagenSeleccionada = null) {
    return fetch('/api/imagenes')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editImagen');
            select.innerHTML = '<option value="">-- Seleccionar Imagen --</option>';
            
            data.sort((a, b) => a.nombre_imagen.localeCompare(b.nombre_imagen));
            data.forEach(imagen => {
                const option = document.createElement('option');
                option.value = imagen.id;
                option.textContent = imagen.nombre_imagen;
                select.appendChild(option);
            });
            if (imagenSeleccionada && imagenSeleccionada !== '' && imagenSeleccionada !== 'None') {
                select.value = imagenSeleccionada;
                
                actualizarPreviewImagen(imagenSeleccionada);
            }
        });
}

function actualizarPreviewImagen(imagenId) {
    fetch('/api/imagenes')
        .then(response => response.json())
        .then(data => {
            const imagen = data.find(img => img.id == imagenId);
            if (imagen) {
                const previewImg = document.getElementById('imagenEditPreview');
                previewImg.src = '/uploads/' + imagen.nombre_imagen;
                previewImg.style.display = 'block';
            }
        });
}

function abrirImagenGrande(src) {
    const modal = document.getElementById('modalImagenGrande');
    const img = document.getElementById('imagenGrande');
    img.src = src;
    modal.style.display = 'block';
}

function filtrarTabla() {
    const filtroNombre = document.getElementById('filtro-nombre').value.toLowerCase();
    const filtroPatente = document.getElementById('filtro-patente').value.toLowerCase();
    const filtroTipo = document.getElementById('filtro-tipo').value.toLowerCase();
    const filtroModelo = document.getElementById('filtro-modelo').value.toLowerCase();
    
    
    tarjetasFiltradas = todasLasTarjetas.filter(tarjeta => {
        const nombre = tarjeta.getAttribute('data-nombre').toLowerCase();
        const patente = tarjeta.getAttribute('data-patente').toLowerCase();
        const tipo = tarjeta.getAttribute('data-tipo').toLowerCase();
        const modelo = tarjeta.getAttribute('data-modelo').toLowerCase();
        
        const coincideNombre = nombre.includes(filtroNombre);
        const coincidePatente = patente.includes(filtroPatente);
        const coincideTipo = tipo.includes(filtroTipo);
        const coincideModelo = modelo.includes(filtroModelo);
        
        return coincideNombre && coincidePatente && coincideTipo && coincideModelo;
    });
    
    
    paginaActual = 1;
    mostrarPagina();
}

function limpiarFiltros() {
    document.getElementById('filtro-nombre').value = '';
    document.getElementById('filtro-patente').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-modelo').value = '';
    filtrarTabla();
}

function cargarSelectsMarca(marcaSeleccionada = null) {
    return fetch('/api/marcas')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editMarca');
            select.innerHTML = '<option value="">-- Seleccionar Marca --</option>';
            data.forEach(marca => {
                const option = document.createElement('option');
                option.value = marca.id;
                option.textContent = marca.nombre;
                select.appendChild(option);
            });
            if (marcaSeleccionada && marcaSeleccionada !== '' && marcaSeleccionada !== 'None') {
                select.value = marcaSeleccionada;
            }
        });
}

function cargarSelectsTransmision(transmisionSeleccionada = null) {
    return fetch('/api/transmisiones')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editTransmision');
            select.innerHTML = '<option value="">-- Seleccionar Transmisión --</option>';
            data.forEach(transmision => {
                const option = document.createElement('option');
                option.value = transmision.id;
                option.textContent = transmision.nombre;
                select.appendChild(option);
            });
            if (transmisionSeleccionada && transmisionSeleccionada !== '' && transmisionSeleccionada !== 'None') {
                select.value = transmisionSeleccionada;
            }
        });
}

function cargarSelectsTraccion(traccionSeleccionada = null) {
    return fetch('/api/tracciones')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editTraccion');
            select.innerHTML = '<option value="">-- Seleccionar Tracción --</option>';
            data.forEach(traccion => {
                const option = document.createElement('option');
                option.value = traccion.id;
                option.textContent = traccion.nombre;
                select.appendChild(option);
            });
            if (traccionSeleccionada && traccionSeleccionada !== '' && traccionSeleccionada !== 'None') {
                select.value = traccionSeleccionada;
            }
        });
}

function cargarSelectsCombustible(combustibleSeleccionado = null) {
    return fetch('/api/combustibles')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('editCombustible');
            select.innerHTML = '<option value="">-- Seleccionar Combustible --</option>';
            data.forEach(combustible => {
                const option = document.createElement('option');
                option.value = combustible.id;
                option.textContent = combustible.nombre;
                select.appendChild(option);
            });
            if (combustibleSeleccionado && combustibleSeleccionado !== '' && combustibleSeleccionado !== 'None') {
                select.value = combustibleSeleccionado;
            }
        });
}

function abrirModal(id) {
    const modal = document.getElementById('modalEditar');
    const tarjeta = document.querySelector(`.vehiculo-card[data-id="${id}"]`);
    
    if (!tarjeta) {
        console.error('No se encontró la tarjeta del vehículo con ID:', id);
        return;
    }
    
    vehiculoEditandoId = id;
    
    
    const patente = tarjeta.querySelector('.card-patente').textContent.replace('📍 ', '').trim();
    const titulo = tarjeta.querySelector('.card-title h4').textContent.trim();
    const [marca, ...modeloParts] = titulo.split(' ');
    const modelo = modeloParts.join(' ');
    const anio = tarjeta.querySelector('.card-year').textContent.replace('📅 ', '').trim();
    
    
    const detalles = tarjeta.querySelectorAll('.detail-item');
    let color = '', chasis = '', cilindrada = '', tipoAceite = '';
    
    detalles.forEach(detalle => {
        const label = detalle.querySelector('.detail-label').textContent;
        const value = detalle.querySelector('.detail-value').textContent.trim();
        
        if (label.includes('Color')) color = value;
        else if (label.includes('Chasis')) chasis = value;
        else if (label.includes('Cilindrada')) cilindrada = value;
        else if (label.includes('Aceite')) tipoAceite = value !== 'No especificado' ? value : '';
    });

    
    if (!tipoAceite) {
        const aceiteEl = tarjeta.querySelector('.aceite-info .aceite-value');
        if (aceiteEl) {
            const val = aceiteEl.textContent.trim();
            tipoAceite = val !== 'No especificado' ? val : '';
        }
    }
    
    
    document.getElementById('editPatente').value = patente;
    document.getElementById('editModelo').value = modelo;
    document.getElementById('editAnio').value = anio;
    document.getElementById('editColor').value = color;
    document.getElementById('editChasis').value = chasis;
    document.getElementById('editCilindrada').value = cilindrada;
    document.getElementById('editTipoAceite').value = tipoAceite;
    
    
    const btn = tarjeta.querySelector('button.btn-editar');
    let clienteId = btn.getAttribute('data-cliente-id');
    let marcaId = btn.getAttribute('data-marca-id');
    let imagenId = btn.getAttribute('data-imagen-id');
    let transmisionId = btn.getAttribute('data-transmision-id');
    let traccionId = btn.getAttribute('data-traccion-id');
    let combustibleId = btn.getAttribute('data-combustible-id');
    
    
    window.clienteIdEdicion = clienteId;
    
    
    marcaId = (marcaId && marcaId !== '' && marcaId !== 'None') ? marcaId : '';
    imagenId = (imagenId && imagenId !== '' && imagenId !== 'None') ? imagenId : '';
    transmisionId = (transmisionId && transmisionId !== '' && transmisionId !== 'None') ? transmisionId : '';
    traccionId = (traccionId && traccionId !== '' && traccionId !== 'None') ? traccionId : '';
    combustibleId = (combustibleId && combustibleId !== '' && combustibleId !== 'None') ? combustibleId : '';
    
    console.log('Valores obtenidos - ClienteID:', clienteId, 'Marca:', marcaId, 'Imagen:', imagenId, 'Transmisión:', transmisionId, 'Tracción:', traccionId, 'Combustible:', combustibleId);
    
    
    Promise.all([
        cargarSelectsMarca(marcaId),
        cargarSelectsTransmision(transmisionId),
        cargarSelectsTraccion(traccionId),
        cargarSelectsCombustible(combustibleId),
        cargarSelectsImagenes(imagenId)
    ]).then(() => {
        console.log('Selects cargados correctamente');
        modal.style.display = 'block';
    });
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
    vehiculoEditandoId = null;
}

function eliminarVehiculo(id, patente) {
    if (confirm('¿Estás seguro de que deseas eliminar el vehículo con patente ' + patente + '?')) {
        fetch('/api/vehiculos/' + id, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('success', 'Vehículo eliminado exitosamente');
                setTimeout(() => location.reload(), 1200);
            } else {
                showToast('error', data.error ? `Error al eliminar: ${data.error}` : 'No se pudo eliminar');
            }
        })
        .catch(error => {
            showToast('error', 'Error: ' + error);
        });
    }
}


document.addEventListener('DOMContentLoaded', function() {
    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }
    const botonesEditar = document.querySelectorAll('.btn-editar');
    const botonesEliminar = document.querySelectorAll('.btn-eliminar');
    const closeBtn = document.querySelector('.close');
    const formEditar = document.getElementById('formEditar');
    
    botonesEditar.forEach(boton => {
        boton.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            abrirModal(id);
        });
    });
    
    botonesEliminar.forEach(boton => {
        boton.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const patente = this.getAttribute('data-patente');
            eliminarVehiculo(id, patente);
        });
    });
    
    closeBtn.addEventListener('click', cerrarModal);
    
    
    const inputImagenEdit = document.getElementById('editInputImagen');
    if (inputImagenEdit) {
        inputImagenEdit.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('imagenEditPreview');
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
                
                
                setTimeout(() => subirImagenEdicion(), 500);
            }
        });
    }
    
    
    const inputCamaraEdit = document.getElementById('editInputCamara');
    if (inputCamaraEdit) {
        inputCamaraEdit.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('imagenEditPreview');
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
                
                
                setTimeout(() => subirImagenEdicionCamara(), 500);
            }
        });
    }
    
    
    window.addEventListener('click', function(event) {
        const modalEditar = document.getElementById('modalEditar');
        const modalImagen = document.getElementById('modalImagenGrande');
        
        if (event.target == modalEditar) {
            cerrarModal();
        }
        
        if (event.target == modalImagen) {
            modalImagen.style.display = 'none';
        }
    });
    
    
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    
    const selectImagen = document.getElementById('editImagen');
    if (selectImagen) {
        selectImagen.addEventListener('change', function() {
            if (this.value) {
                actualizarPreviewImagen(this.value);
            } else {
                document.getElementById('imagenEditPreview').style.display = 'none';
            }
        });
    }
    
    formEditar.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const datos = {
            cliente_id: window.clienteIdEdicion ? parseInt(window.clienteIdEdicion) : null,
            patente: document.getElementById('editPatente').value,
            modelo: document.getElementById('editModelo').value,
            anio_elaboracion: parseInt(document.getElementById('editAnio').value),
            color: document.getElementById('editColor').value,
            numero_chasis: document.getElementById('editChasis').value,
            cilindrada: document.getElementById('editCilindrada').value,
            tipo_aceite: document.getElementById('editTipoAceite').value,
            marca_id: document.getElementById('editMarca').value ? parseInt(document.getElementById('editMarca').value) : null,
            imagen_id: document.getElementById('editImagen').value ? parseInt(document.getElementById('editImagen').value) : null,
            transmision_id: document.getElementById('editTransmision').value ? parseInt(document.getElementById('editTransmision').value) : null,
            traccion_id: document.getElementById('editTraccion').value ? parseInt(document.getElementById('editTraccion').value) : null,
            tipo_combustible_id: document.getElementById('editCombustible').value ? parseInt(document.getElementById('editCombustible').value) : null
        };
        
        
        
        fetch(`/api/vehiculos/${vehiculoEditandoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('success', 'Vehículo actualizado exitosamente');
                cerrarModal();
                setTimeout(() => location.reload(), 1200);
            } else {
                showToast('error', data.error ? `Error: ${data.error}` : 'No se pudo actualizar');
            }
        })
        .catch(error => {
            showToast('error', 'Error: ' + error);
        });
    });
});




window.addEventListener('load', function() {
    inicializarPaginacion();
});

function inicializarPaginacion() {
    todasLasTarjetas = Array.from(document.querySelectorAll('.vehiculo-card'));
    tarjetasFiltradas = [...todasLasTarjetas];
    paginaActual = 1;
    mostrarPagina();
}

function mostrarPagina() {
    const inicio = (paginaActual - 1) * vehiculosPorPagina;
    const fin = inicio + vehiculosPorPagina;
    
    
    todasLasTarjetas.forEach(tarjeta => {
        tarjeta.style.display = 'none';
    });
    
    
    const tarjetasVisibles = tarjetasFiltradas.slice(inicio, fin);
    tarjetasVisibles.forEach(tarjeta => {
        tarjeta.style.display = '';
    });
    
    
    actualizarControlesPaginacion();
}

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(tarjetasFiltradas.length / vehiculosPorPagina);
    
    
    const inicio = (paginaActual - 1) * vehiculosPorPagina + 1;
    const fin = Math.min(paginaActual * vehiculosPorPagina, tarjetasFiltradas.length);
    const infoElement = document.getElementById('paginaInfo');
    if (infoElement) {
        infoElement.textContent = `Mostrando ${inicio}-${fin} de ${tarjetasFiltradas.length} vehículos`;
    }
    
    
    const paginaElement = document.getElementById('paginaActual');
    if (paginaElement) {
        paginaElement.textContent = `Página ${paginaActual} de ${totalPaginas || 1}`;
    }
    
    
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    
    if (btnAnterior) {
        btnAnterior.disabled = paginaActual === 1;
    }
    
    if (btnSiguiente) {
        btnSiguiente.disabled = paginaActual >= totalPaginas;
    }
}

function paginaAnterior() {
    if (paginaActual > 1) {
        paginaActual--;
        mostrarPagina();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function paginaSiguiente() {
    const totalPaginas = Math.ceil(tarjetasFiltradas.length / vehiculosPorPagina);
    if (paginaActual < totalPaginas) {
        paginaActual++;
        mostrarPagina();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
