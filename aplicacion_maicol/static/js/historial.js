

const clienteInput = document.getElementById('clienteInput');
const vehiculoInput = document.getElementById('vehiculoInput');
const historialBody = document.getElementById('historialBody');
const panelTitle = document.getElementById('panelTitle');
const panelSubtitle = document.getElementById('panelSubtitle');
const clienteSuggest = document.getElementById('clienteSuggest');
const vehiculoSuggest = document.getElementById('vehiculoSuggest');
const ordenFechaSelect = document.getElementById('ordenFecha');
let currentOrdenId = null;

const state = {
	clientes: [],
	vehiculos: [],
	allVehiculos: [],
	selectedClienteId: null,
	selectedVehiculoId: null,
	historialCompleto: [],
	paginaActual: 1,
	trabajosPorPagina: 10,
};

init();

function init() {
	loadClientes();
	loadVehiculosGlobal();
	clienteInput?.addEventListener('change', onClienteChange);
	clienteInput?.addEventListener('input', () => renderClienteSuggestions(clienteInput.value));
	clienteInput?.addEventListener('focus', () => renderClienteSuggestions(clienteInput.value));
	clienteInput?.addEventListener('blur', () => hideSuggestions(clienteSuggest));
	vehiculoInput?.addEventListener('change', onVehiculoChange);
	vehiculoInput?.addEventListener('input', () => renderVehiculoSuggestions(vehiculoInput.value));
	vehiculoInput?.addEventListener('focus', () => renderVehiculoSuggestions(vehiculoInput.value));
	vehiculoInput?.addEventListener('blur', () => hideSuggestions(vehiculoSuggest));
	ordenFechaSelect?.addEventListener('change', () => renderHistorialConPaginacion());
}

async function loadVehiculosGlobal() {
	try {
		const res = await fetch('/api/vehiculos');
		const data = await res.json();
		state.allVehiculos = Array.isArray(data) ? data : [];
		if (vehiculoInput) {
			vehiculoInput.disabled = false;
			vehiculoInput.placeholder = 'Busca por patente o modelo';
		}
	} catch (err) {
		console.error('Error cargando vehículos', err);
	}
}

async function loadClientes() {
	try {
		const res = await fetch('/api/clientes');
		const data = await res.json();
		state.clientes = Array.isArray(data) ? data : [];
		renderClientes();
	} catch (err) {
		console.error('Error cargando clientes', err);
	}
}

function renderClientes() {
	
}

async function onClienteChange() {
	const value = clienteInput.value.trim();
	const match = state.clientes.find((c) => `${c.nombres} ${c.apellidos}`.trim().toLowerCase() === value.toLowerCase());

	if (!match) {
		state.selectedClienteId = null;
		state.vehiculos = [];
		resetVehiculoInput('Selecciona primero un cliente');
		renderHistorialEmpty('Selecciona un cliente para cargar sus vehículos');
		return;
	}

	state.selectedClienteId = match.id;
	loadVehiculos(match.id);
}

function resetVehiculoInput(placeholder = '') {
	vehiculoInput.value = '';
	const disable = !state.allVehiculos.length;
	vehiculoInput.placeholder = disable ? placeholder : 'Busca por patente o modelo';
	vehiculoInput.disabled = disable;
	vehiculoSuggest.hidden = true;
}

async function loadVehiculos(clienteId) {
	try {
		vehiculoInput.disabled = false;
		vehiculoInput.placeholder = 'Busca por patente o modelo';
		const url = `/api/vehiculos?cliente_id=${encodeURIComponent(String(clienteId))}`;
		console.log('Cargando vehículos con URL:', url);
		const res = await fetch(url);
		
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		
		const data = await res.json();
		state.vehiculos = Array.isArray(data) ? data : [];
		console.log('Vehículos cargados:', state.vehiculos);
		renderVehiculos();
		renderHistorialEmpty('Selecciona un vehículo para ver su historial');
	} catch (err) {
		console.error('Error cargando vehículos', err);
		resetVehiculoInput('Error al cargar vehículos');
	}
}

function renderVehiculos() {
	
	vehiculoInput.focus();
}

async function onVehiculoChange() {
	const value = vehiculoInput.value.trim();
	const baseListado = state.selectedClienteId ? state.vehiculos : state.allVehiculos;
	const match = baseListado.find((v) => `${v.patente} · ${v.marca || ''} ${v.modelo || ''}`.trim().toLowerCase() === value.toLowerCase())
		|| baseListado.find((v) => v.patente && v.patente.toLowerCase() === value.toLowerCase());

	if (!match) {
		state.selectedVehiculoId = null;
		renderHistorialEmpty('Selecciona un vehículo válido para mostrar el historial');
		return;
	}

	state.selectedVehiculoId = match.id;
	state.selectedClienteId = match.cliente_id;
	state.paginaActual = 1;

	
	const clienteNombre = getClienteNombrePorId(match.cliente_id);
	if (clienteNombre) {
		clienteInput.value = clienteNombre;
	}
	state.vehiculos = state.allVehiculos.filter((v) => String(v.cliente_id) === String(match.cliente_id));
	updateHeaders();
	
	loadHistorial(match.id);
}

async function loadHistorial(vehiculoId) {
	try {
		state.historialFiltrado = null;
		const res = await fetch(`/api/historial/${vehiculoId}`);
		const data = await res.json();
		const historial = Array.isArray(data) ? data : [];
		state.historialCompleto = historial;
		state.paginaActual = 1;
		renderHistorialConPaginacion();
	} catch (err) {
		console.error('Error cargando historial', err);
		renderHistorialEmpty('No se pudo cargar el historial');
	}
}

function renderHistorialConPaginacion() {
	
	if (!state.historialFiltrado) {
		const historial = state.historialCompleto;
		
		
		const serviciosUnicos = {};
		historial.forEach((item) => {
			if (!serviciosUnicos[item.id]) {
				serviciosUnicos[item.id] = item;
			}
		});

		state.historialFiltrado = ordenarPorFecha(Object.values(serviciosUnicos));
	} else {
		state.historialFiltrado = ordenarPorFecha(state.historialFiltrado);
	}

	if (!state.historialFiltrado.length) {
		renderHistorialEmpty('No hay registros de historial para este vehículo en el rango de fechas seleccionado');
		actualizarControlesPaginacion(0, 0);
		return;
	}

	const inicio = (state.paginaActual - 1) * state.trabajosPorPagina;
	const fin = inicio + state.trabajosPorPagina;
	const trabajosVisibles = state.historialFiltrado.slice(inicio, fin);

	historialBody.innerHTML = '';
	trabajosVisibles.forEach((item) => {
		const tr = document.createElement('tr');
		tr.style.cursor = 'pointer';

		const fecha = safeValue(item.fecha_servicio);
		const tipo = safeValue(item.tipo_trabajo);
		const costo = formatCurrency(item.costo);
		const obs = safeValue(item.observaciones);

		tr.innerHTML = `
			<td>${fecha || '—'}</td>
			<td><span class="badge">${tipo || 'Sin dato'}</span></td>
			<td style="display: none;"></td>
			<td class="costo">${costo}</td>
			<td>${obs || '—'}</td>
		`;

		tr.addEventListener('click', () => abrirModalDetalle(item.id));
		historialBody.appendChild(tr);
	});

	actualizarControlesPaginacion(state.historialFiltrado.length, state.paginaActual);
}

function actualizarControlesPaginacion(total, paginaActual) {
	const totalPaginas = Math.ceil(total / state.trabajosPorPagina);
	
	
	const inicio = total === 0 ? 0 : (paginaActual - 1) * state.trabajosPorPagina + 1;
	const fin = Math.min(paginaActual * state.trabajosPorPagina, total);
	const paginacionInfo = document.getElementById('paginacionInfo');
	if (paginacionInfo) {
		paginacionInfo.textContent = `Mostrando ${inicio}-${fin} de ${total} trabajos`;
	}
	
	
	const paginaElement = document.getElementById('paginaActual');
	if (paginaElement) {
		paginaElement.textContent = `Página ${paginaActual} de ${totalPaginas || 1}`;
	}
	
	
	const btnAnterior = document.getElementById('btnAnterior');
	const btnSiguiente = document.getElementById('btnSiguiente');
	
	if (btnAnterior) {
		btnAnterior.disabled = paginaActual === 1 || total === 0;
	}
	
	if (btnSiguiente) {
		btnSiguiente.disabled = paginaActual >= totalPaginas || total === 0;
	}
}

function paginaAnterior() {
	if (state.paginaActual > 1) {
		state.paginaActual--;
		renderHistorialConPaginacion();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}

function paginaSiguiente() {
	const totalPaginas = Math.ceil(state.historialFiltrado.length / state.trabajosPorPagina);
	if (state.paginaActual < totalPaginas) {
		state.paginaActual++;
		renderHistorialConPaginacion();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}

function renderHistorialEmpty(message) {
	historialBody.innerHTML = `
		<tr class="empty-row">
			<td colspan="5">${message}</td>
		</tr>
	`;
}

function renderClienteSuggestions(filter) {
	if (!clienteSuggest) return;
	
	const norm = filter.toLowerCase().trim();
	
	
	if (!norm) {
		clienteSuggest.hidden = true;
		return;
	}
	
	
	const matches = state.clientes.filter((c) => {
		const full = `${c.nombres} ${c.apellidos}`.toLowerCase();
		return full.includes(norm);
	});
	
	
	if (!matches.length) {
		clienteSuggest.hidden = true;
		return;
	}
	
	const list = document.createElement('div');
	list.className = 'suggestions-list';

	matches.forEach((c) => {
		const item = document.createElement('div');
		item.className = 'suggestion-item';
		item.innerHTML = `
			<div>
				<div class="suggestion-title">${c.nombres} ${c.apellidos}</div>
				<div class="suggestion-sub">ID ${c.id}</div>
			</div>
		`;
		item.addEventListener('mousedown', (e) => {
			e.preventDefault();
			selectCliente(c);
		});
		list.appendChild(item);
	});

	clienteSuggest.innerHTML = '';
	clienteSuggest.appendChild(list);
	clienteSuggest.hidden = false;
}

function renderVehiculoSuggestions(filter) {
	if (!vehiculoSuggest) return;
	
	const listado = state.selectedClienteId ? state.vehiculos : state.allVehiculos;

	
	if (!listado.length) {
		vehiculoSuggest.hidden = true;
		return;
	}
	
	const norm = filter.toLowerCase().trim();
	
	
	let matches = listado;
	if (norm) {
		matches = listado.filter((v) => {
			const label = `${v.patente} ${v.marca || ''} ${v.modelo || ''}`.toLowerCase();
			return label.includes(norm);
		});
	}
	
	
	if (!matches.length) {
		vehiculoSuggest.hidden = true;
		return;
	}
	
	const list = document.createElement('div');
	list.className = 'suggestions-list';

	matches.forEach((v) => {
		const item = document.createElement('div');
		item.className = 'suggestion-item';
		item.innerHTML = `
			<div>
				<div class="suggestion-title">${v.patente}</div>
				<div class="suggestion-sub">${v.marca || ''} ${v.modelo || ''} · ${getClienteNombrePorId(v.cliente_id) || 'Sin cliente'}</div>
			</div>
		`;
		item.addEventListener('mousedown', (e) => {
			e.preventDefault();
			selectVehiculo(v);
		});
		list.appendChild(item);
	});

	vehiculoSuggest.innerHTML = '';
	vehiculoSuggest.appendChild(list);
	vehiculoSuggest.hidden = false;
}

function selectCliente(cliente) {
	const label = `${cliente.nombres} ${cliente.apellidos}`.trim();
	clienteInput.value = label;
	state.selectedClienteId = cliente.id;
	hideSuggestions(clienteSuggest);
	console.log('Cliente seleccionado:', cliente.id, label);
	loadVehiculos(cliente.id);
}

function selectVehiculo(vehiculo) {
	const label = `${vehiculo.patente} · ${vehiculo.marca || ''} ${vehiculo.modelo || ''}`.trim();
	vehiculoInput.value = label;
	state.selectedVehiculoId = vehiculo.id;
	state.selectedClienteId = vehiculo.cliente_id;
	state.vehiculos = state.allVehiculos.filter((v) => String(v.cliente_id) === String(vehiculo.cliente_id));

	const clienteNombre = getClienteNombrePorId(vehiculo.cliente_id);
	if (clienteNombre) {
		clienteInput.value = clienteNombre;
	}
	hideSuggestions(vehiculoSuggest);
	updateHeaders();
	loadHistorial(vehiculo.id);
}

function hideSuggestions(container) {
	setTimeout(() => {
		if (container) container.hidden = true;
	}, 120);
}

function getClienteNombrePorId(clienteId) {
	const c = state.clientes.find((cli) => String(cli.id) === String(clienteId));
	return c ? `${c.nombres || ''} ${c.apellidos || ''}`.trim() : '';
}

function updateHeaders() {
	const vehiculoLabel = vehiculoInput.value || 'Selecciona un vehículo';
	panelTitle.textContent = vehiculoLabel;

	const clienteLabel = clienteInput.value || 'sin cliente';
	panelSubtitle.textContent = `Historial del cliente ${clienteLabel}`;
}

function safeValue(value) {
	return value === null || value === undefined ? '' : String(value);
}

function formatCurrency(value) {
	const num = Number(value);
	if (Number.isNaN(num)) return '$0';
	return num.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}

function ordenarPorFecha(lista) {
	const orden = ordenFechaSelect?.value === 'asc' ? 1 : -1;
	const copia = [...lista];
	return copia.sort((a, b) => {
		const fechaA = new Date(a.fecha_servicio);
		const fechaB = new Date(b.fecha_servicio);
		return orden * (fechaA - fechaB);
	});
}


async function abrirModalDetalle(osId) {
	const modal = document.getElementById('detalleModal');
	if (!modal) return;

	try {
		const res = await fetch(`/api/orden-servicio/${osId}`);
		const data = await res.json();
		const { orden, detalles } = data;

		if (!orden) {
			alert('No se encontró la orden de servicio');
			return;
		}

		currentOrdenId = orden.id || osId;

		
		document.getElementById('detailClienteNombre').textContent = `${orden.nombres || '—'} ${orden.apellidos || ''}`.trim();
		document.getElementById('detailClienteTel').textContent = orden.numero_contacto || '—';
		document.getElementById('detailClienteEmail').textContent = orden.correo_electronico || '—';
		document.getElementById('detailClienteDireccion').textContent = orden.direccion || '—';

		
		document.getElementById('detailVehiculoPatente').textContent = orden.patente || '—';
		document.getElementById('detailVehiculoMarca').textContent = orden.marca || '—';
		document.getElementById('detailVehiculoModelo').textContent = orden.modelo || '—';
		document.getElementById('detailVehiculoAnio').textContent = orden.anio_elaboracion || '—';
		document.getElementById('detailVehiculoColor').textContent = orden.color || '—';
		document.getElementById('detailVehiculoChasis').textContent = orden.numero_chasis || '—';
		document.getElementById('detailVehiculoCilindrada').textContent = orden.cilindrada || '—';
		document.getElementById('detailVehiculoCombustible').textContent = orden.tipo_combustible || '—';
		document.getElementById('detailVehiculoTransmision').textContent = orden.transmision || '—';
		document.getElementById('detailVehiculoTraccion').textContent = orden.traccion || '—';
		document.getElementById('detailVehiculoAceite').textContent = orden.tipo_aceite || '—';

		
		document.getElementById('detailNumeroOS').textContent = orden.numero_os || '—';
		document.getElementById('detailFechaOS').textContent = orden.fecha_ingreso || '—';

		
		const tbody = document.getElementById('detailTrabajosBody');
		tbody.innerHTML = '';
		if (detalles && detalles.length) {
			detalles.forEach((det) => {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${det.cantidad || '—'}</td>
					<td>${det.descripcion || '—'}</td>
					<td>${formatCurrency(det.costo_unitario)}</td>
					<td>${formatCurrency(det.subtotal)}</td>
				`;
				tbody.appendChild(tr);
			});
		} else {
			const tr = document.createElement('tr');
			tr.innerHTML = '<td colspan="4" style="text-align: center; color: var(--text-muted);">Sin trabajos registrados</td>';
			tbody.appendChild(tr);
		}

		
		document.getElementById('detailTotal').textContent = formatCurrency(orden.total || 0);

		
		const obsSection = document.getElementById('obsSection');
		const obsText = document.getElementById('detailObservaciones');
		if (orden.observaciones && orden.observaciones.trim()) {
			obsText.textContent = orden.observaciones;
			obsSection.style.display = 'block';
		} else {
			obsSection.style.display = 'none';
		}

		
		modal.classList.remove('hidden');
	} catch (err) {
		console.error('Error cargando detalles', err);
		alert('Error al cargar los detalles de la orden');
	}
}

function cerrarModalDetalle() {
	const modal = document.getElementById('detalleModal');
	if (modal) modal.classList.add('hidden');
	currentOrdenId = null;
}

async function eliminarServicio() {
	if (!currentOrdenId) {
		alert('No hay un servicio seleccionado para eliminar.');
		return;
	}

	const numeroOS = document.getElementById('detailNumeroOS')?.textContent.trim() || currentOrdenId;
	const confirmar = window.confirm(`¿Eliminar la orden ${numeroOS}? Esta acción no se puede deshacer.`);
	if (!confirmar) return;

	try {
		const res = await fetch(`/api/orden-servicio/${currentOrdenId}`, { method: 'DELETE' });
		if (!res.ok) {
			let message = 'No se pudo eliminar el servicio.';
			try {
				const body = await res.json();
				if (body?.message) message = body.message;
			} catch (jsonErr) {
				console.error('Error leyendo respuesta de eliminación', jsonErr);
			}
			throw new Error(message);
		}

		alert('Servicio eliminado correctamente.');
		cerrarModalDetalle();
		if (state.selectedVehiculoId) {
			await loadHistorial(state.selectedVehiculoId);
		}
	} catch (err) {
		console.error('Error eliminando servicio', err);
		alert(err.message || 'Error al eliminar el servicio.');
	}
}


function descargarPDF() {
	const numeroOS = document.getElementById('detailNumeroOS').textContent.trim();
	const vehiculo = document.getElementById('detailVehiculoPatente').textContent.trim() || 'vehículo';
	const fileName = `${numeroOS} - ${vehiculo}.pdf`;
	
	
	const tempContainer = document.createElement('div');
	tempContainer.id = 'pdfContent';
	tempContainer.style.cssText = 'background: white; color: black; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5;';
	
	
	const clienteNombre = document.getElementById('detailClienteNombre').textContent;
	const clienteTel = document.getElementById('detailClienteTel').textContent;
	const clienteEmail = document.getElementById('detailClienteEmail').textContent;
	const clienteDireccion = document.getElementById('detailClienteDireccion').textContent;
	
	const vehiculoMarca = document.getElementById('detailVehiculoMarca').textContent;
	const vehiculoModelo = document.getElementById('detailVehiculoModelo').textContent;
	const vehiculoAnio = document.getElementById('detailVehiculoAnio').textContent;
	const vehiculoColor = document.getElementById('detailVehiculoColor').textContent;
	const vehiculoChasis = document.getElementById('detailVehiculoChasis').textContent;
	const vehiculoCilindrada = document.getElementById('detailVehiculoCilindrada').textContent;
	const vehiculoCombustible = document.getElementById('detailVehiculoCombustible').textContent;
	const vehiculoTransmision = document.getElementById('detailVehiculoTransmision').textContent;
	const vehiculoTraccion = document.getElementById('detailVehiculoTraccion').textContent;
	const vehiculoAceite = document.getElementById('detailVehiculoAceite').textContent;
	
	const fechaOS = document.getElementById('detailFechaOS').textContent;
	const detailTotal = document.getElementById('detailTotal').textContent;
	const detailObservaciones = document.getElementById('detailObservaciones').textContent;
	
	
	const trabajosHTML = document.getElementById('detailTrabajosBody').innerHTML;
	
	
		tempContainer.innerHTML = `
		<div style="position: relative; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 15px;">
			<img src="/logo.png" alt="Logo Taller" style="position: absolute; top: -20px; right: 0; width: 120px; height: auto;">
			<div style="text-align: center; margin-left: 0;">
				<h1 style="color: #000; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">ORDEN DE SERVICIO</h1>
				<p style="color: #333; margin: 5px 0; font-size: 14px;">Taller Don Michel</p>
			</div>
		</div>

		<div style="margin-bottom: 20px;">
			<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">DATOS DE LA ORDEN</h2>
			<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 40%; background: #f0f0f0; color: #000;">Número de Orden:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${numeroOS}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 25%; background: #f0f0f0; color: #000;">Fecha:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${fechaOS}</td>
				</tr>
			</table>
		</div>
		
		<div style="margin-bottom: 25px;">
			<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">INFORMACIÓN DEL CLIENTE</h2>
			<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 30%; background: #f0f0f0; color: #000;">Nombre:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${clienteNombre}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Teléfono:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${clienteTel}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Email:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${clienteEmail}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Dirección:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${clienteDireccion}</td>
				</tr>
			</table>
		</div>
		
		<div style="margin-bottom: 25px;">
			<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">INFORMACIÓN DEL VEHÍCULO</h2>
			<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; width: 25%; background: #f0f0f0; color: #000;">Patente:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculo}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Marca:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoMarca}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Modelo:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoModelo}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Año:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoAnio}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Color:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoColor}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Chasis:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoChasis}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Cilindrada:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoCilindrada}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Combustible:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoCombustible}</td>
				</tr>
				<tr>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Transmisión:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoTransmision}</td>
					<td style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Tracción:</td>
					<td style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoTraccion}</td>
				</tr>
				<tr>
					<td colspan="4" style="padding: 8px; border: 1px solid #000; font-weight: bold; background: #f0f0f0; color: #000;">Tipos de Aceite:</td>
				</tr>
				<tr>
					<td colspan="4" style="padding: 8px; border: 1px solid #000; color: #000;">${vehiculoAceite}</td>
				</tr>
			</table>
		</div>
		
		<div style="margin-bottom: 25px;">
			<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">TRABAJOS REALIZADOS</h2>
			<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
				<thead>
					<tr style="background: #f0f0f0;">
						<th style="padding: 10px; border: 1px solid #000; text-align: left; color: #000; font-weight: bold; width: 80px;">Cantidad</th>
						<th style="padding: 10px; border: 1px solid #000; text-align: left; color: #000; font-weight: bold;">Descripción</th>
						<th style="padding: 10px; border: 1px solid #000; text-align: right; color: #000; font-weight: bold; width: 120px;">Costo Unit.</th>
						<th style="padding: 10px; border: 1px solid #000; text-align: right; color: #000; font-weight: bold; width: 120px;">Subtotal</th>
					</tr>
				</thead>
				<tbody style="color: #000;">
					${trabajosHTML}
				</tbody>
			</table>
		</div>
		
		<div style="margin-bottom: 25px; border: 2px solid #000; padding: 15px; background: #f0f0f0;">
			<div style="text-align: right; font-size: 18px; font-weight: bold; color: #000;">
				Total: ${detailTotal}
			</div>
		</div>
		
		${detailObservaciones && detailObservaciones !== '—' ? `
		<div style="page-break-before: always; margin-bottom: 25px;">
			<h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">OBSERVACIONES</h2>
			<div style="padding: 12px; border: 1px solid #000; color: #000; white-space: pre-wrap; word-wrap: break-word;">
				${detailObservaciones}
			</div>
		</div>
		` : ''}
		
		<div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #000; padding-top: 15px;">
		</div>
	`;
	
	// Agregar al body pero invisible
	document.body.appendChild(tempContainer);
	
	// Pequeño delay para asegurar que se renderice
	setTimeout(() => {
		// Configurar opciones para html2pdf
		const opt = {
			margin: 10,
			filename: fileName,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { scale: 2, backgroundColor: '#ffffff' },
			jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
		};
		
		// Generar PDF
		html2pdf().set(opt).from(tempContainer).save().finally(() => {
			// Eliminar el contenedor temporal después de generar el PDF
			document.body.removeChild(tempContainer);
		});
	}, 100);
}

// Cerrar modal al hacer clic en el overlay
document.addEventListener('DOMContentLoaded', () => {
	const modal = document.getElementById('detalleModal');
	if (modal) {
		modal.addEventListener('click', (e) => {
			if (e.target === modal) cerrarModalDetalle();
		});
	}
});

