


let clientesData = [];
let vehiculosData = [];
let clienteSeleccionado = null;
let funcionConfirmacion = null;
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


function mostrarModal(titulo, mensaje, tipo = 'info') {
    const modal = document.getElementById('notificacionModal');
    const icon = document.getElementById('modalIcon');
    const title = document.querySelector('#notificacionModal .modal-title');
    const body = document.getElementById('modalBody');
    
    const iconos = {
        'success': '✓',
        'error': '✕',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    title.textContent = titulo;
    body.textContent = mensaje;
    icon.textContent = iconos[tipo] || 'ℹ️';
    icon.className = `modal-icon ${tipo}`;
    
    modal.classList.add('show');
}

function cerrarModal() {
    const modal = document.getElementById('notificacionModal');
    modal.classList.remove('show');
}

function mostrarConfirmacion(titulo, mensaje, funcion) {
    const modal = document.getElementById('confirmacionModal');
    const title = document.getElementById('confirmTitle');
    const body = document.getElementById('confirmBody');
    
    title.textContent = titulo;
    body.textContent = mensaje;
    funcionConfirmacion = funcion;
    
    modal.classList.add('show');
}

function confirmarAccion() {
    document.getElementById('confirmacionModal').classList.remove('show');
    if (funcionConfirmacion) {
        funcionConfirmacion();
    }
}

function cancelarConfirmacion() {
    document.getElementById('confirmacionModal').classList.remove('show');
    funcionConfirmacion = null;
}


window.addEventListener('click', function(event) {
    const notifModal = document.getElementById('notificacionModal');
    const confirmModal = document.getElementById('confirmacionModal');
    
    if (event.target === notifModal) {
        cerrarModal();
    }
    if (event.target === confirmModal) {
        cancelarConfirmacion();
    }
});


window.addEventListener('load', function() {
    console.log('Window load event triggered');
    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }
    establecerFechaActual();
    cargarClientes();
    cargarVehiculos();
    configurarEventos();
    establecerNumeroOrdenTemporal();
    calcularTotales();
    inicializarTarjetasYTabla();
    inicializarBusquedaClientePatente();
});


function inicializarTarjetasYTabla() {
    
    const tarjetasIniciales = document.querySelectorAll('.tarjeta-trabajo');
    tarjetasIniciales.forEach(tarjeta => {
        const cantidadInput = tarjeta.querySelector('.cantidad');
        const costoInput = tarjeta.querySelector('.costo');
        const descripcionInput = tarjeta.querySelector('.descripcion');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('input', function() {
                calcularSubtotalTarjeta(tarjeta);
                sincronizarTabla();
                calcularTotales();
            });
            cantidadInput.addEventListener('change', function() {
                calcularSubtotalTarjeta(tarjeta);
                sincronizarTabla();
                calcularTotales();
            });
        }
        
        if (costoInput) {
            costoInput.addEventListener('input', function() {
                calcularSubtotalTarjeta(tarjeta);
                sincronizarTabla();
                calcularTotales();
            });
            costoInput.addEventListener('change', function() {
                calcularSubtotalTarjeta(tarjeta);
                sincronizarTabla();
                calcularTotales();
            });
        }

        if (descripcionInput) {
            descripcionInput.addEventListener('input', function() {
                sincronizarTabla();
            });
        }
    });

    
    const filasIniciales = document.querySelectorAll('.fila-trabajo');
    filasIniciales.forEach(fila => {
        const cantidadInput = fila.querySelector('.cantidad');
        const costoInput = fila.querySelector('.costo');
        const descripcionInput = fila.querySelector('.descripcion');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('input', function() {
                calcularSubtotalFila(fila);
                sincronizarTarjetas();
                calcularTotales();
            });
            cantidadInput.addEventListener('change', function() {
                calcularSubtotalFila(fila);
                sincronizarTarjetas();
                calcularTotales();
            });
        }
        
        if (costoInput) {
            costoInput.addEventListener('input', function() {
                calcularSubtotalFila(fila);
                sincronizarTarjetas();
                calcularTotales();
            });
            costoInput.addEventListener('change', function() {
                calcularSubtotalFila(fila);
                sincronizarTarjetas();
                calcularTotales();
            });
        }

        if (descripcionInput) {
            descripcionInput.addEventListener('input', function() {
                sincronizarTarjetas();
            });
        }
    });
}


function establecerNumeroOrdenTemporal() {
    
    const campo = document.getElementById('numeroOrden');
    console.log('Intentando establecer número de orden temporal...');
    console.log('Campo encontrado:', campo);
    if (campo) {
        campo.value = 'Pendiente de asignar';
        campo.readOnly = true;
        console.log('Valor establecido:', campo.value);
    } else {
        console.error('Campo numeroOrden no encontrado');
    }
}


function generarNumeroOrdenDesdeID(id) {
    const numeroFormato = id.toString().padStart(12, '0');
    return numeroFormato;
}


function establecerFechaActual() {
    const hoy = new Date();
    
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;
    document.getElementById('fechaIngreso').value = fecha;
}


function cargarClientes() {
    fetch('/api/clientes')
        .then(response => response.json())
        .then(data => {
            clientesData = data;
            const select = document.getElementById('clienteSelect');
            select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
            
            data.sort((a, b) => {
                const nombreA = `${a.nombres} ${a.apellidos}`;
                const nombreB = `${b.nombres} ${b.apellidos}`;
                return nombreA.localeCompare(nombreB);
            });
            data.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = `${cliente.nombres} ${cliente.apellidos}`;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando clientes:', error));
}


function cargarVehiculos() {
    fetch('/api/vehiculos')
        .then(response => response.json())
        .then(data => {
            vehiculosData = data;
        })
        .catch(error => console.error('Error cargando vehículos:', error));
}





function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function inicializarBusquedaClientePatente() {
    const input = document.getElementById('buscarBusqueda');
    const contenedor = document.getElementById('sugerenciasBusqueda');
    if (!input || !contenedor) return;

    let currentFocus = -1;

    const doSearch = debounce(async function() {
        const term = input.value.trim();
        if (!term) {
            contenedor.classList.add('is-hidden');
            contenedor.innerHTML = '';
            return;
        }

        const termLower = term.toLowerCase();

        
        const clientesMatches = clientesData.filter(c => {
            const full = `${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase();
            return full.includes(termLower);
        }).slice(0, 6);

        
        let vehiculosMatches = [];
        try {
            const res = await fetch(`/api/vehiculos?patente=${encodeURIComponent(term)}`);
            vehiculosMatches = await res.json();
        } catch (err) {
            console.error('Error buscando patentes:', err);
        }

        
        const items = [
            ...clientesMatches.map(c => ({ type: 'cliente', data: c })),
            ...vehiculosMatches.slice(0, 10).map(v => ({ type: 'vehiculo', data: v }))
        ];

        renderSugerencias(items);
        currentFocus = -1;
    }, 250);

    input.addEventListener('input', doSearch);

    input.addEventListener('keydown', function(e) {
        const items = Array.from(contenedor.querySelectorAll('.sugerencia-item'));
        if (e.key === 'ArrowDown') {
            currentFocus = Math.min(currentFocus + 1, items.length - 1);
            updateAria(items, currentFocus);
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            currentFocus = Math.max(currentFocus - 1, 0);
            updateAria(items, currentFocus);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (currentFocus > -1 && items[currentFocus]) {
                items[currentFocus].click();
                e.preventDefault();
            }
        } else if (e.key === 'Escape') {
            contenedor.classList.add('is-hidden');
            contenedor.innerHTML = '';
        }
    });

    
    document.addEventListener('click', function(e) {
        if (!contenedor.contains(e.target) && e.target !== input) {
            contenedor.classList.add('is-hidden');
        }
    });

    function updateAria(items, index) {
        items.forEach((it, i) => it.setAttribute('aria-selected', (i === index).toString()));
        if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
    }

    function renderSugerencias(itemsArray) {
        contenedor.innerHTML = '';
        if (!itemsArray || itemsArray.length === 0) {
            contenedor.classList.add('is-hidden');
            return;
        }

        itemsArray.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.setAttribute('role', 'option');

            if (item.type === 'cliente') {
                const c = item.data;
                div.innerHTML = `👤 <strong>${c.nombres || ''} ${c.apellidos || ''}</strong> <span style="color:#666; margin-left:8px;">Cliente</span>`;
                div.dataset.type = 'cliente';
                div.dataset.id = c.id;
            } else {
                const v = item.data;
                const cliente = clientesData.find(c => c.id == v.cliente_id) || {};
                const clienteNombre = `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim();
                div.innerHTML = `<strong>${v.patente}</strong> — ${v.marca || ''} ${v.modelo || ''} ${clienteNombre ? ' — ' + clienteNombre : ''}`;
                div.dataset.type = 'vehiculo';
                div.dataset.id = v.id;
            }

            div.addEventListener('click', function() {
                seleccionarSugerencia(item);
            });

            contenedor.appendChild(div);
        });

        contenedor.classList.remove('is-hidden');
    }

    function seleccionarSugerencia(item) {
        const clienteSelect = document.getElementById('clienteSelect');
        const vehiculoSelect = document.getElementById('vehiculoSelect');
        const buscarInput = document.getElementById('buscarBusqueda');

        
        contenedor.classList.add('is-hidden');
        contenedor.innerHTML = '';

        if (item.type === 'cliente') {
            const c = item.data;
            if (buscarInput) buscarInput.value = `${c.nombres || ''} ${c.apellidos || ''}`.trim();

            
            clienteSelect.value = c.id;
            clienteSelect.dispatchEvent(new Event('change'));

            
            setTimeout(() => {
                vehiculoSelect.focus();
            }, 80);
        } else {
            const v = item.data;
            if (buscarInput) buscarInput.value = v.patente || '';

            
            if (v.cliente_id) {
                clienteSelect.value = v.cliente_id;
                clienteSelect.dispatchEvent(new Event('change'));

                setTimeout(() => {
                    
                    const option = Array.from(vehiculoSelect.options).find(o => o.value == v.id);
                    if (option) {
                        vehiculoSelect.value = v.id;
                        vehiculoSelect.dispatchEvent(new Event('change'));
                    } else {
                        vehiculoSelect.innerHTML = `<option value="${v.id}">${v.marca || ''} ${v.modelo || ''} (${v.patente})</option>`;
                        vehiculoSelect.value = v.id;
                        cargarDatosVehiculo(v.id);
                    }
                }, 60);
            } else {
                vehiculoSelect.innerHTML = `<option value="${v.id}">${v.marca || ''} ${v.modelo || ''} (${v.patente})</option>`;
                vehiculoSelect.value = v.id;
                cargarDatosVehiculo(v.id);
            }
        }
    }
}

function configurarEventos() {
    const clienteSelect = document.getElementById('clienteSelect');
    const vehiculoSelect = document.getElementById('vehiculoSelect');
    const descuentoPorcentaje = document.getElementById('descuentoPorcentaje');
    const formulario = document.getElementById('formularioServicio');
    const tabla = document.getElementById('tablaTrabajos');

    
    const nuevoClienteSelect = clienteSelect.cloneNode(true);
    clienteSelect.parentNode.replaceChild(nuevoClienteSelect, clienteSelect);
    
    const nuevoVehiculoSelect = vehiculoSelect.cloneNode(true);
    vehiculoSelect.parentNode.replaceChild(nuevoVehiculoSelect, vehiculoSelect);
    
    const nuevoDescuento = descuentoPorcentaje.cloneNode(true);
    descuentoPorcentaje.parentNode.replaceChild(nuevoDescuento, descuentoPorcentaje);
    
    const nuevoFormulario = formulario.cloneNode(true);
    formulario.parentNode.replaceChild(nuevoFormulario, formulario);
    
    const nuevaTabla = tabla.cloneNode(true);
    tabla.parentNode.replaceChild(nuevaTabla, tabla);

    
    const newClienteSelect = document.getElementById('clienteSelect');
    const newVehiculoSelect = document.getElementById('vehiculoSelect');
    const newDescuentoPorcentaje = document.getElementById('descuentoPorcentaje');
    const newFormulario = document.getElementById('formularioServicio');
    const newTabla = document.getElementById('tablaTrabajos');

    newClienteSelect.addEventListener('change', function() {
        clienteSeleccionado = this.value;
        cargarVehiculosPorCliente(this.value);
        limpiarDatosVehiculo();
    });

    newVehiculoSelect.addEventListener('change', function() {
        cargarDatosVehiculo(this.value);
    });

    newDescuentoPorcentaje.addEventListener('change', calcularTotales);

    
    newTabla.addEventListener('change', function(e) {
        if (e.target.classList.contains('cantidad') || e.target.classList.contains('costo')) {
            const fila = e.target.closest('tr');
            calcularSubtotalFila(fila);
            sincronizarTarjetas();
            calcularTotales();
        }
    });

    
    const contenedorTarjetas = document.getElementById('tarjetasTrabajos');
    if (contenedorTarjetas) {
        contenedorTarjetas.addEventListener('change', function(e) {
            if (e.target.classList.contains('cantidad') || e.target.classList.contains('costo')) {
                const tarjeta = e.target.closest('.tarjeta-trabajo');
                calcularSubtotalTarjeta(tarjeta);
                sincronizarTabla();
                calcularTotales();
            }
        });

        contenedorTarjetas.addEventListener('input', function(e) {
            if (e.target.classList.contains('descripcion')) {
                sincronizarTabla();
            }
        });
    }

    
    const buscarBusqueda = document.getElementById('buscarBusqueda');
    if (buscarBusqueda) {
        
    }

    
    newFormulario.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarOrdenServicio();
    });
}


function cargarVehiculosPorCliente(clienteId) {
    const select = document.getElementById('vehiculoSelect');
    
    if (!clienteId) {
        select.innerHTML = '<option value="">-- Primero selecciona un cliente --</option>';
        return;
    }

    let vehiculosCliente = vehiculosData.filter(v => v.cliente_id == clienteId);
    
    vehiculosCliente.sort((a, b) => {
        const textoA = `${a.marca} ${a.modelo}`;
        const textoB = `${b.marca} ${b.modelo}`;
        return textoA.localeCompare(textoB);
    });
    
    select.innerHTML = '<option value="">-- Seleccionar Vehículo --</option>';
    
    vehiculosCliente.forEach(vehiculo => {
        const option = document.createElement('option');
        option.value = vehiculo.id;
        option.textContent = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`;
        option.dataset = JSON.stringify(vehiculo);
        select.appendChild(option);
    });
}


function cargarDatosVehiculo(vehiculoId) {
    if (!vehiculoId) {
        limpiarDatosVehiculo();
        return;
    }

    const vehiculo = vehiculosData.find(v => v.id == vehiculoId);
    
    if (vehiculo) {
        document.getElementById('marca').value = vehiculo.marca || '';
        document.getElementById('modelo').value = vehiculo.modelo || '';
        document.getElementById('anio').value = vehiculo.anio_elaboracion || '';
        document.getElementById('patente').value = vehiculo.patente || '';
        document.getElementById('color').value = vehiculo.color || '';
        document.getElementById('chasis').value = vehiculo.numero_chasis || '';
        document.getElementById('cilindrada').value = vehiculo.cilindrada || '';
        document.getElementById('transmision').value = vehiculo.transmision || '';
        document.getElementById('traccion').value = vehiculo.traccion || '';
        document.getElementById('combustible').value = vehiculo.tipo_combustible || '';
        document.getElementById('tipoAceite').value = vehiculo.tipo_aceite || '';
        
        
        const imagenElement = document.getElementById('fotoVehiculo');
        if (vehiculo.nombre_imagen) {
            imagenElement.src = '/uploads/' + vehiculo.nombre_imagen;
            imagenElement.style.display = 'block';
        } else {
            imagenElement.style.display = 'none';
        }
    }
}


function limpiarDatosVehiculo() {
    const campos = ['marca', 'modelo', 'anio', 'patente', 'color', 'chasis', 'cilindrada', 'transmision', 'traccion', 'combustible'];
    campos.forEach(campo => {
        document.getElementById(campo).value = '';
    });
    
    
    const imagenElement = document.getElementById('fotoVehiculo');
    if (imagenElement) {
        imagenElement.style.display = 'none';
        imagenElement.src = '';
    }
}


function agregarFila() {
    const tabla = document.getElementById('tablaTrabajos').getElementsByTagName('tbody')[0];
    const fila = document.createElement('tr');
    fila.className = 'fila-trabajo';
    
    fila.innerHTML = `
        <td><input type="number" class="cantidad" value="1" min="1" step="1"></td>
        <td><input type="text" class="descripcion" placeholder="Ingresa la descripción..."></td>
        <td><input type="number" class="costo" value="" min="0" step="0.01"></td>
        <td><input type="number" class="subtotal" readonly></td>
        <td><button type="button" class="btn-eliminar-fila" onclick="eliminarFila(this)">Eliminar</button></td>
    `;
    
    tabla.appendChild(fila);
    
    
    agregarTarjeta();
    
    
    const cantidadInput = fila.querySelector('.cantidad');
    const costoInput = fila.querySelector('.costo');
    
    cantidadInput.addEventListener('change', function() {
        calcularSubtotalFila(fila);
        sincronizarTarjetas();
        calcularTotales();
    });
    
    costoInput.addEventListener('change', function() {
        calcularSubtotalFila(fila);
        sincronizarTarjetas();
        calcularTotales();
    });
}


function agregarTarjeta() {
    const contenedor = document.getElementById('tarjetasTrabajos');
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-trabajo';
    
    tarjeta.innerHTML = `
        <div class="tarjeta-header">
            <button type="button" class="btn-eliminar-tarjeta" onclick="eliminarTarjeta(this)" title="Eliminar">✕</button>
        </div>
        <div class="tarjeta-body">
            <div class="campo-tarjeta">
                <label>Cantidad</label>
                <input type="number" class="cantidad" value="1" min="1" step="1">
            </div>
            <div class="campo-tarjeta">
                <label>Descripción del Trabajo</label>
                <input type="text" class="descripcion" placeholder="Ingresa la descripción...">
            </div>
            <div class="campo-tarjeta">
                <label>Costo Unitario</label>
                <input type="number" class="costo" value="" min="0" step="0.01">
            </div>
            <div class="campo-tarjeta">
                <label>Subtotal</label>
                <input type="number" class="subtotal" readonly>
            </div>
        </div>
    `;
    
    contenedor.appendChild(tarjeta);
    
    
    const cantidadInput = tarjeta.querySelector('.cantidad');
    const costoInput = tarjeta.querySelector('.costo');
    const descripcionInput = tarjeta.querySelector('.descripcion');
    
    cantidadInput.addEventListener('input', function() {
        calcularSubtotalTarjeta(tarjeta);
        sincronizarTabla();
        calcularTotales();
    });
    
    cantidadInput.addEventListener('change', function() {
        calcularSubtotalTarjeta(tarjeta);
        sincronizarTabla();
        calcularTotales();
    });
    
    costoInput.addEventListener('input', function() {
        calcularSubtotalTarjeta(tarjeta);
        sincronizarTabla();
        calcularTotales();
    });
    
    costoInput.addEventListener('change', function() {
        calcularSubtotalTarjeta(tarjeta);
        sincronizarTabla();
        calcularTotales();
    });

    descripcionInput.addEventListener('input', function() {
        sincronizarTabla();
    });
}


function sincronizarTabla() {
    const tarjetas = document.querySelectorAll('.tarjeta-trabajo');
    const filas = document.querySelectorAll('.fila-trabajo');
    
    tarjetas.forEach((tarjeta, indice) => {
        if (filas[indice]) {
            const fila = filas[indice];
            fila.querySelector('.cantidad').value = tarjeta.querySelector('.cantidad').value;
            fila.querySelector('.descripcion').value = tarjeta.querySelector('.descripcion').value;
            fila.querySelector('.costo').value = tarjeta.querySelector('.costo').value;
            fila.querySelector('.subtotal').value = tarjeta.querySelector('.subtotal').value;
        }
    });
}


function sincronizarTarjetas() {
    const filas = document.querySelectorAll('.fila-trabajo');
    const tarjetas = document.querySelectorAll('.tarjeta-trabajo');
    
    filas.forEach((fila, indice) => {
        if (tarjetas[indice]) {
            const tarjeta = tarjetas[indice];
            tarjeta.querySelector('.cantidad').value = fila.querySelector('.cantidad').value;
            tarjeta.querySelector('.descripcion').value = fila.querySelector('.descripcion').value;
            tarjeta.querySelector('.costo').value = fila.querySelector('.costo').value;
            tarjeta.querySelector('.subtotal').value = fila.querySelector('.subtotal').value;
        }
    });
}


function eliminarFila(btn) {
    const fila = btn.closest('tr');
    const indice = Array.from(fila.parentNode.children).indexOf(fila);
    
    fila.remove();
    
    
    const tarjetas = document.querySelectorAll('.tarjeta-trabajo');
    if (tarjetas[indice]) {
        tarjetas[indice].remove();
    }
    
    calcularTotales();
}


function eliminarTarjeta(btn) {
    const tarjeta = btn.closest('.tarjeta-trabajo');
    const indice = Array.from(tarjeta.parentNode.children).indexOf(tarjeta);
    
    tarjeta.remove();
    
    
    const filas = document.querySelectorAll('.fila-trabajo');
    if (filas[indice]) {
        filas[indice].remove();
    }
    
    calcularTotales();
}


function calcularSubtotalFila(fila) {
    const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
    const costo = parseFloat(fila.querySelector('.costo').value) || 0;
    const subtotal = cantidad * costo;
    fila.querySelector('.subtotal').value = subtotal.toFixed(2);
}


function calcularSubtotalTarjeta(tarjeta) {
    const cantidad = parseFloat(tarjeta.querySelector('.cantidad').value) || 0;
    const costo = parseFloat(tarjeta.querySelector('.costo').value) || 0;
    const subtotal = cantidad * costo;
    tarjeta.querySelector('.subtotal').value = subtotal.toFixed(2);
}


function calcularTotales() {
    let subtotalTrabajos = 0;
    
    
    const vistaTabla = document.querySelector('.vista-tabla');
    const vistaTarjetas = document.querySelector('.vista-tarjetas');
    
    let elementos;
    if (vistaTarjetas && vistaTarjetas.style.display !== 'none') {
        elementos = document.querySelectorAll('.tarjeta-trabajo');
    } else {
        elementos = document.querySelectorAll('.fila-trabajo');
    }
    
    elementos.forEach(elemento => {
        const subtotal = parseFloat(elemento.querySelector('.subtotal').value) || 0;
        subtotalTrabajos += subtotal;
    });

    
    const descuentoPorcentaje = parseFloat(document.getElementById('descuentoPorcentaje').value) || 0;
    const descuentoMonto = (subtotalTrabajos * descuentoPorcentaje) / 100;
    const total = subtotalTrabajos - descuentoMonto;

    
    document.getElementById('subtotalTrabajos').textContent = subtotalTrabajos.toFixed(2);
    document.getElementById('descuentoMonto').textContent = descuentoMonto.toFixed(2);
    document.getElementById('totalTrabajos').textContent = total.toFixed(2);

    
    const totalFinalElement = document.getElementById('totalFinal');
    if (totalFinalElement) {
        totalFinalElement.textContent = total.toFixed(2);
    }
}


function limpiarFormulario() {
    document.getElementById('formularioServicio').reset();
    
    
    const tbody = document.getElementById('tablaTrabajos').getElementsByTagName('tbody')[0];
    tbody.innerHTML = `
        <tr class="fila-trabajo">
            <td><input type="number" class="cantidad" value="1" min="1" step="1"></td>
            <td><input type="text" class="descripcion" placeholder="Ingresa la descripción..."></td>
            <td><input type="number" class="costo" value="" min="0" step="0.01"></td>
            <td><input type="number" class="subtotal" readonly></td>
            <td><button type="button" class="btn-eliminar-fila" onclick="eliminarFila(this)">Eliminar</button></td>
        </tr>
    `;
    
    
    const contenedorTarjetas = document.getElementById('tarjetasTrabajos');
    contenedorTarjetas.innerHTML = `
        <div class="tarjeta-trabajo">
            <div class="tarjeta-header">
                <button type="button" class="btn-eliminar-tarjeta" onclick="eliminarTarjeta(this)" title="Eliminar">✕</button>
            </div>
            <div class="tarjeta-body">
                <div class="campo-tarjeta">
                    <label>Cantidad</label>
                    <input type="number" class="cantidad" value="1" min="1" step="1">
                </div>
                <div class="campo-tarjeta">
                    <label>Descripción del Trabajo</label>
                    <input type="text" class="descripcion" placeholder="Ingresa la descripción...">
                </div>
                <div class="campo-tarjeta">
                    <label>Costo Unitario</label>
                    <input type="number" class="costo" value="" min="0" step="0.01">
                </div>
                <div class="campo-tarjeta">
                    <label>Subtotal</label>
                    <input type="number" class="subtotal" readonly>
                </div>
            </div>
        </div>
    `;
    
    
    establecerFechaActual();
    establecerNumeroOrdenTemporal();
    calcularTotales();
    limpiarDatosVehiculo();
    
    
    configurarEventos();
}


function guardarOrdenServicio() {
    
    const clienteId = document.getElementById('clienteSelect').value;
    const vehiculoId = document.getElementById('vehiculoSelect').value;
    const fechaIngreso = document.getElementById('fechaIngreso').value;

    if (!clienteId || !vehiculoId || !fechaIngreso) {
        showToast('warning', 'Completa Cliente, Vehículo y Fecha');
        return;
    }

    
    const vistaTarjetas = document.querySelector('.vista-tarjetas');
    let elementos;
    
    if (vistaTarjetas && vistaTarjetas.style.display !== 'none') {
        elementos = document.querySelectorAll('.tarjeta-trabajo');
    } else {
        elementos = document.querySelectorAll('.fila-trabajo');
    }
    
    if (elementos.length === 0) {
        showToast('warning', 'Debes agregar al menos un trabajo');
        return;
    }

    
    const trabajos = [];
    elementos.forEach(elemento => {
        const descripcion = elemento.querySelector('.descripcion').value;
        if (descripcion.trim()) {
            trabajos.push({
                cantidad: parseFloat(elemento.querySelector('.cantidad').value),
                descripcion: descripcion,
                costo: parseFloat(elemento.querySelector('.costo').value),
                subtotal: parseFloat(elemento.querySelector('.subtotal').value)
            });
        }
    });

    if (trabajos.length === 0) {
        showToast('warning', 'Agrega al menos un trabajo con descripción');
        return;
    }

    
    const totalElement = document.getElementById('totalFinal') || document.getElementById('totalTrabajos');
    const totalValor = parseFloat(totalElement ? totalElement.textContent : '0') || 0;

    const datosOrden = {
        cliente_id: clienteId,
        vehiculo_id: vehiculoId,
        fecha_ingreso: fechaIngreso,
        observaciones: document.getElementById('observaciones').value,
        descuento_porcentaje: parseFloat(document.getElementById('descuentoPorcentaje').value) || 0,
        descuento_monto: parseFloat(document.getElementById('descuentoMonto').textContent),
        total: totalValor,
        trabajos: trabajos
    };

    
    fetch('/api/orden-servicio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosOrden)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const numero = data.numero_os ? `N° ${data.numero_os}` : '';
            showToast('success', `Orden guardada correctamente ${numero}`.trim());
            
            
            limpiarFormulario();
            
            
            establecerNumeroOrdenTemporal();
        } else {
            showToast('error', data.error ? `Error al guardar la orden: ${data.error}` : 'No se pudo guardar la orden');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Error al guardar la orden de servicio');
    });
}







