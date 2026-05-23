let clienteEditandoId = null;
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
let clientesPorPagina = 20;
let todasLasTarjetas = [];
let tarjetasFiltradas = [];

function filtrarTabla() {
    const filtroNombreRaw = document.getElementById('filtro-nombre').value;
    const filtroTelefonoRaw = document.getElementById('filtro-telefono').value;
    const filtroCorreoRaw = document.getElementById('filtro-correo').value;
    const filtroDireccionRaw = document.getElementById('filtro-direccion').value;

    
    function normalizeText(str) {
        if (!str) return '';
        const base = String(str).toLowerCase();

        
        if (typeof base.normalize === 'function') {
            try {
                
                const diacriticRegex = new RegExp('\\p{Diacritic}', 'gu');
                return base.normalize('NFD').replace(diacriticRegex, '').trim();
            } catch (e) {
                
                return base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            }
        }

        
        return base.replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n').trim();
    }

    const nombreTokens = normalizeText(filtroNombreRaw).split(/\s+/).filter(Boolean);
    const telefonoTokens = normalizeText(filtroTelefonoRaw).split(/\s+/).filter(Boolean);
    const correoTokens = normalizeText(filtroCorreoRaw).split(/\s+/).filter(Boolean);
    const direccionTokens = normalizeText(filtroDireccionRaw).split(/\s+/).filter(Boolean);

    
    const allTokens = [...nombreTokens, ...telefonoTokens, ...correoTokens, ...direccionTokens];

    if (allTokens.length === 0) {
        tarjetasFiltradas = [...todasLasTarjetas];
        paginaActual = 1;
        mostrarPagina();
        return;
    }

    tarjetasFiltradas = todasLasTarjetas.filter(tarjeta => {
        const nombreElem = tarjeta.querySelector('.card-nombre');
        const nombreText = nombreElem ? nombreElem.textContent.replace(/^\W+/, '') : tarjeta.getAttribute('data-nombre') || '';
        const telefono = tarjeta.getAttribute('data-telefono') || '';
        const correo = tarjeta.getAttribute('data-correo') || '';
        const direccion = tarjeta.getAttribute('data-direccion') || '';

        const nombreNorm = normalizeText(nombreText);
        const telefonoNorm = normalizeText(telefono);
        const correoNorm = normalizeText(correo);
        const direccionNorm = normalizeText(direccion);

        return allTokens.every(tok => (
            nombreNorm.includes(tok) || telefonoNorm.includes(tok) || correoNorm.includes(tok) || direccionNorm.includes(tok)
        ));
    });
    
    
    paginaActual = 1;
    mostrarPagina();
}

function limpiarFiltros() {
    document.getElementById('filtro-nombre').value = '';
    document.getElementById('filtro-telefono').value = '';
    document.getElementById('filtro-correo').value = '';
    document.getElementById('filtro-direccion').value = '';
    filtrarTabla();
}

function abrirModal(id) {
    const modal = document.getElementById('modalEditar');
    const tarjeta = document.querySelector(`.cliente-card[data-id="${id}"]`);
    
    if (!tarjeta) {
        console.error('No se encontró la tarjeta del cliente con ID:', id);
        return;
    }
    
    clienteEditandoId = id;
    
    
    const btn = tarjeta.querySelector('button.btn-editar');
    const nombres = btn.getAttribute('data-nombres');
    const apellidos = btn.getAttribute('data-apellidos');
    const rut = btn.getAttribute('data-rut');
    const numeroContacto = btn.getAttribute('data-numero_contacto');
    const numeroContactoAlternativo = btn.getAttribute('data-numero_contacto_alternativo');
    const correoElectronico = btn.getAttribute('data-correo_electronico');
    const direccion = btn.getAttribute('data-direccion');
    
    
    document.getElementById('editNombres').value = nombres || '';
    document.getElementById('editApellidos').value = apellidos || '';
    document.getElementById('editRut').value = rut || '';
    document.getElementById('editNumeroContacto').value = numeroContacto || '';
    document.getElementById('editNumeroContactoAlternativo').value = numeroContactoAlternativo || '';
    document.getElementById('editCorreoElectronico').value = correoElectronico || '';
    document.getElementById('editDireccion').value = direccion || '';
    
    modal.style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
    clienteEditandoId = null;
}

function eliminarCliente(id, nombre) {
    if (confirm('¿Estás seguro de que deseas eliminar al cliente ' + nombre + '?')) {
        fetch('/api/clientes/' + id, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('success', 'Cliente eliminado exitosamente');
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
            const nombre = this.getAttribute('data-nombre');
            eliminarCliente(id, nombre);
        });
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', cerrarModal);
    }
    
    
    window.addEventListener('click', function(event) {
        const modalEditar = document.getElementById('modalEditar');
        
        if (event.target == modalEditar) {
            cerrarModal();
        }
    });
    
    
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    if (formEditar) {
        formEditar.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const datos = {
                nombres: document.getElementById('editNombres').value,
                apellidos: document.getElementById('editApellidos').value,
                rut: document.getElementById('editRut').value || null,
                numero_contacto: document.getElementById('editNumeroContacto').value,
                numero_contacto_alternativo: document.getElementById('editNumeroContactoAlternativo').value || null,
                correo_electronico: document.getElementById('editCorreoElectronico').value,
                direccion: document.getElementById('editDireccion').value || null
            };
            
            fetch(`/api/clientes/${clienteEditandoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('success', 'Cliente actualizado exitosamente');
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
    }
});




window.addEventListener('load', function() {
    inicializarPaginacion();
});

function inicializarPaginacion() {
    todasLasTarjetas = Array.from(document.querySelectorAll('.cliente-card'));
    tarjetasFiltradas = [...todasLasTarjetas];
    paginaActual = 1;
    mostrarPagina();
}

function mostrarPagina() {
    const inicio = (paginaActual - 1) * clientesPorPagina;
    const fin = inicio + clientesPorPagina;
    
    
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
    const totalPaginas = Math.ceil(tarjetasFiltradas.length / clientesPorPagina);
    
    
    const inicio = (paginaActual - 1) * clientesPorPagina + 1;
    const fin = Math.min(paginaActual * clientesPorPagina, tarjetasFiltradas.length);
    const infoElement = document.getElementById('paginaInfo');
    if (infoElement) {
        infoElement.textContent = `Mostrando ${inicio}-${fin} de ${tarjetasFiltradas.length} clientes`;
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
    const totalPaginas = Math.ceil(tarjetasFiltradas.length / clientesPorPagina);
    if (paginaActual < totalPaginas) {
        paginaActual++;
        mostrarPagina();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
