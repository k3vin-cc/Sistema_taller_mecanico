
let periodoActual = 'dia';
let anoSeleccionado = new Date().getFullYear();
let todosLosTrabajos = []; 

const periodos = {
    dia: { icon: '📅', label: 'Hoy', icon_emoji: '📅' },
    semana: { icon: '📆', label: 'Esta Semana', icon_emoji: '📆' },
    mes: { icon: '📊', label: 'Este Mes', icon_emoji: '📊' },
    anio: { icon: '📈', label: 'Este Año', icon_emoji: '📈' }
};


function obtenerEtiquetaPeriodo(periodo, anio = null) {
    const anoTarget = anio || anoSeleccionado;
    const anoActual = new Date().getFullYear();
    
    if (periodo === 'dia') {
        if (anoTarget === anoActual) return 'Hoy';
        return `${anoTarget}-12-31`;
    } else if (periodo === 'semana') {
        if (anoTarget === anoActual) return 'Esta Semana';
        return `Semana de ${anoTarget}`;
    } else if (periodo === 'mes') {
        if (anoTarget === anoActual) return 'Este Mes';
        return `Diciembre ${anoTarget}`;
    } else if (periodo === 'anio') {
        if (anoTarget === anoActual) return 'Este Año';
        return `Año ${anoTarget}`;
    }
    return periodos[periodo].label;
}


function obtenerRangoFechas(periodo, anio = null) {
    const anoTarget = anio || anoSeleccionado;
    let hoy = new Date();
    
    
    if (anio && anio !== new Date().getFullYear()) {
        hoy = new Date(anoTarget, 11, 31); 
    } else {
        hoy.setHours(0, 0, 0, 0); 
    }
    
    let inicio, fin;
    
    if (periodo === 'dia') {
        
        inicio = new Date(hoy);
        fin = new Date(hoy);
        fin.setDate(fin.getDate() + 1);
        fin.setMilliseconds(fin.getMilliseconds() - 1);
    } else if (periodo === 'semana') {
        
        const dia = hoy.getDay(); 
        const diferencia = dia === 0 ? -6 : 1 - dia; 
        
        inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() + diferencia); 
        inicio.setHours(0, 0, 0, 0);
        
        fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6); 
        fin.setHours(23, 59, 59, 999);
    } else if (periodo === 'mes') {
        
        inicio = new Date(anoTarget, hoy.getMonth(), 1);
        inicio.setHours(0, 0, 0, 0);
        
        fin = new Date(anoTarget, hoy.getMonth() + 1, 0);
        fin.setHours(23, 59, 59, 999);
    } else if (periodo === 'anio') {
        
        inicio = new Date(anoTarget, 0, 1);
        inicio.setHours(0, 0, 0, 0);
        
        fin = new Date(anoTarget, 11, 31);
        fin.setHours(23, 59, 59, 999);
    }
    
    return { inicio, fin };
}


function filtrarTrabajosPorPeriodo(trabajos, periodo) {
    const { inicio, fin } = obtenerRangoFechas(periodo, anoSeleccionado);
    
    return trabajos.filter(trabajo => {
        const fechaTrabajo = new Date(trabajo.fecha_ingreso);
        return fechaTrabajo >= inicio && fechaTrabajo <= fin;
    });
}


async function inicializarSelectorAnios() {
    try {
        const response = await fetch('/api/anos-disponibles');
        const data = await response.json();
        
        const anos = data.anos || [];
        const yearSelect = document.getElementById('yearSelect');
        
        if (yearSelect && anos.length > 0) {
            
            yearSelect.innerHTML = '';
            
            
            anos.sort((a, b) => b - a).forEach(ano => {
                const option = document.createElement('option');
                option.value = ano;
                option.textContent = `${ano}${ano === new Date().getFullYear() ? ' (Actual)' : ''}`;
                option.selected = ano === anoSeleccionado;
                yearSelect.appendChild(option);
            });
            
            
            yearSelect.addEventListener('change', function(e) {
                anoSeleccionado = parseInt(e.target.value);
                cargarEstadisticas();
            });
        }
    } catch (error) {
        console.error('Error al inicializar selector de años:', error);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    inicializarSelectorAnios();
    cargarEstadisticas();
    configurarEventosCartas();
});


async function cargarEstadisticas() {
    try {
        const response = await fetch(`/api/estadisticas?ano=${anoSeleccionado}`);
        const stats = await response.json();

        
        const cards = {
            dia: document.querySelector('[data-periodo="dia"] .stat-amount'),
            semana: document.querySelector('[data-periodo="semana"] .stat-amount'),
            mes: document.querySelector('[data-periodo="mes"] .stat-amount'),
            anio: document.querySelector('[data-periodo="anio"] .stat-amount')
        };

        if (cards.dia) cards.dia.textContent = formatCurrency(stats.hoy || 0);
        if (cards.semana) cards.semana.textContent = formatCurrency(stats.semana || 0);
        if (cards.mes) cards.mes.textContent = formatCurrency(stats.mes || 0);
        if (cards.anio) cards.anio.textContent = formatCurrency(stats.anio || 0);

        
        await cambiarPeriodo('dia');
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}


function configurarEventosCartas() {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const periodo = this.getAttribute('data-periodo');
            cambiarPeriodo(periodo);
        });
        
        card.setAttribute('tabindex', '0');
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                const periodo = this.getAttribute('data-periodo');
                cambiarPeriodo(periodo);
            }
        });
    });
}


async function cambiarPeriodo(periodo) {
    periodoActual = periodo;

    
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-periodo="${periodo}"]`).classList.add('active');

    
    actualizarTitulo(periodo);

    
    await cargarTrabajosPeriodo(periodo);
}


function actualizarTitulo(periodo) {
    const titulo = document.querySelector('.panel-title h2');
    if (titulo) {
        const periodoData = periodos[periodo];
        const etiqueta = obtenerEtiquetaPeriodo(periodo, anoSeleccionado);
        titulo.textContent = `${periodoData.icon_emoji} Trabajos realizados: ${etiqueta}`;
    }
}


async function cargarTrabajosPeriodo(periodo) {
    try {
        const url = `/api/trabajos-periodo?periodo=${periodo}&ano=${anoSeleccionado}`;
        console.log('Fetching:', url);
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API error:', errorData);
            throw new Error(errorData.error || 'Error al cargar los trabajos');
        }
        
        const trabajos = await response.json();
        console.log('Trabajos recibidos:', trabajos);
        
        
        todosLosTrabajos = trabajos;
        
        
        renderTrabajos(trabajos, periodo);
        
        
        if (periodo === 'anio') {
            renderResumenMensual(trabajos);
            mostrarTablaTrabajos(false); 
        } else {
            ocultarResumenMensual();
            mostrarTablaTrabajos(true); 
        }
    } catch (error) {
        console.error('Error cargando trabajos:', error);
        mostrarError(error.message || 'Error al cargar los trabajos');
    }
}


function renderTrabajos(trabajos, periodo = 'dia') {
    const tbody = document.querySelector('.trabajos-table tbody');
    
    if (!tbody) return;

    console.log('Renderizando trabajos:', trabajos.length);

    if (!trabajos || trabajos.length === 0) {
        console.log('No hay trabajos para mostrar');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-msg" style="padding: 50px; font-size: 1.1rem;">
                    📋 No hay trabajos registrados para este período
                </td>
            </tr>
        `;
        return;
    }

    
    if (periodo === 'mes' || periodo === 'anio') {
        renderTrabajosConSemanas(trabajos);
    } else {
        renderTrabajosSimple(trabajos);
    }
}


function renderTrabajosConSemanas(trabajos) {
    const tbody = document.querySelector('.trabajos-table tbody');
    
    
    const trabajosPorSemana = {};
    const semanasOrdenadas = [];
    
    trabajos.forEach(trabajo => {
        const fecha = new Date(trabajo.fecha_ingreso);
        
        
        const dayOfWeek = fecha.getDay(); 
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; 
        const lunes = new Date(fecha);
        lunes.setDate(lunes.getDate() + diff);
        lunes.setHours(0, 0, 0, 0);
        
        const semanaKey = lunes.toISOString().split('T')[0]; 
        
        if (!trabajosPorSemana[semanaKey]) {
            trabajosPorSemana[semanaKey] = {
                fecha: new Date(lunes),
                trabajos: []
            };
            semanasOrdenadas.push(semanaKey);
        }
        trabajosPorSemana[semanaKey].trabajos.push(trabajo);
    });
    
    
    let filas = '';
    semanasOrdenadas.forEach(semanaKey => {
        const semanaData = trabajosPorSemana[semanaKey];
        const trabajosSemana = semanaData.trabajos;
        
        
        const trabajosPorOS = {};
        const ordenesOrdenadas = [];
        
        trabajosSemana.forEach(trabajo => {
            const os = trabajo.numero_os;
            if (!trabajosPorOS[os]) {
                trabajosPorOS[os] = [];
                ordenesOrdenadas.push(os);
            }
            trabajosPorOS[os].push(trabajo);
        });
        
        
        const fechaInicio = new Date(semanaData.fecha);
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + 6); 
        
        const totalSemana = trabajosSemana.reduce((sum, t) => sum + parseFloat(t.subtotal || 0), 0);
        
        filas += `
            <tr class="semana-header">
                <td colspan="7" style="background-color: var(--bg-secondary); font-weight: 600; padding: 12px; border-top: 2px solid var(--primary);">
                    📅 Semana del ${formatearFecha(fechaInicio.toISOString())} al ${formatearFecha(fechaFin.toISOString())} - Total: <span style="color: var(--primary);">${formatCurrency(totalSemana)}</span>
                </td>
            </tr>
        `;
        
        
        ordenesOrdenadas.forEach((os, index) => {
            const trabajosOS = trabajosPorOS[os];
            const primerTrabajo = trabajosOS[0];
            
            filas += `
                <tr>
                    <td><strong>${primerTrabajo.numero_os || 'N/A'}</strong></td>
                    <td>${formatearFecha(primerTrabajo.fecha_ingreso)}</td>
                    <td>${primerTrabajo.cliente_nombre || 'N/A'}</td>
                    <td>${primerTrabajo.vehiculo_info || 'N/A'}</td>
                    <td>${primerTrabajo.descripcion || 'N/A'}</td>
                    <td style="text-align: center;"><strong>${primerTrabajo.cantidad || 0}</strong></td>
                    <td style="text-align: right; color: var(--primary); font-weight: 600;">${formatCurrency(primerTrabajo.subtotal || 0)}</td>
                </tr>
            `;
            
            
            for (let i = 1; i < trabajosOS.length; i++) {
                const trabajo = trabajosOS[i];
                filas += `
                    <tr style="opacity: 0.8;">
                        <td colspan="4" style="text-align: right; padding-right: 20px; font-size: 0.9rem; color: var(--text-muted);">⤷ Trabajo adicional</td>
                        <td>${trabajo.descripcion || 'N/A'}</td>
                        <td style="text-align: center;"><strong>${trabajo.cantidad || 0}</strong></td>
                        <td style="text-align: right; color: var(--primary); font-weight: 600;">${formatCurrency(trabajo.subtotal || 0)}</td>
                    </tr>
                `;
            }
        });
    });
    
    tbody.innerHTML = filas;
}


function renderTrabajosSimple(trabajos) {
    const tbody = document.querySelector('.trabajos-table tbody');
    
    
    const trabajosPorOS = {};
    const ordenesOrdenadas = [];
    
    trabajos.forEach(trabajo => {
        const os = trabajo.numero_os;
        if (!trabajosPorOS[os]) {
            trabajosPorOS[os] = [];
            ordenesOrdenadas.push(os);
        }
        trabajosPorOS[os].push(trabajo);
    });

    console.log('Órdenes agrupadas:', ordenesOrdenadas.length);

    
    let filas = '';
    ordenesOrdenadas.forEach((os, index) => {
        const trabajosOS = trabajosPorOS[os];
        const primerTrabajo = trabajosOS[0];
        
        
        let cantidadTotal = 0;
        let subtotalTotal = 0;
        
        trabajosOS.forEach(t => {
            cantidadTotal += parseInt(t.cantidad || 0);
            subtotalTotal += parseFloat(t.subtotal || 0);
        });

        
        filas += `
            <tr>
                <td><strong>${primerTrabajo.numero_os || 'N/A'}</strong></td>
                <td>${formatearFecha(primerTrabajo.fecha_ingreso)}</td>
                <td>${primerTrabajo.cliente_nombre || 'N/A'}</td>
                <td>${primerTrabajo.vehiculo_info || 'N/A'}</td>
                <td>${primerTrabajo.descripcion || 'N/A'}</td>
                <td style="text-align: center;"><strong>${primerTrabajo.cantidad || 0}</strong></td>
                <td style="text-align: right; color: var(--primary); font-weight: 600;">${formatCurrency(primerTrabajo.subtotal || 0)}</td>
            </tr>
        `;

        
        for (let i = 1; i < trabajosOS.length; i++) {
            const trabajo = trabajosOS[i];
            filas += `
                <tr style="opacity: 0.8;">
                    <td colspan="4" style="text-align: right; padding-right: 20px; font-size: 0.9rem; color: var(--text-muted);">⤷ Trabajo adicional</td>
                    <td>${trabajo.descripcion || 'N/A'}</td>
                    <td style="text-align: center;"><strong>${trabajo.cantidad || 0}</strong></td>
                    <td style="text-align: right; color: var(--primary); font-weight: 600;">${formatCurrency(trabajo.subtotal || 0)}</td>
                </tr>
            `;
        }
    });

    console.log('Filas generadas:', filas.length);
    tbody.innerHTML = filas;
}


function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}


function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CL');
    } catch {
        return fecha;
    }
}


function mostrarError(mensaje) {
    const tbody = document.querySelector('.trabajos-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-msg" style="color: var(--primary); white-space: normal; word-break: break-word;">
                    ⚠️ ${mensaje}
                </td>
            </tr>
        `;
    }
}


function renderResumenMensual(trabajos) {
    const panel = document.getElementById('resumenMensualPanel');
    const grid = document.getElementById('resumenMensualGrid');
    
    if (!panel || !grid) return;
    
    
    const meses = [
        { nombre: 'Enero', index: 0, emoji: '🟥' },
        { nombre: 'Febrero', index: 1, emoji: '🟧' },
        { nombre: 'Marzo', index: 2, emoji: '🟨' },
        { nombre: 'Abril', index: 3, emoji: '🟩' },
        { nombre: 'Mayo', index: 4, emoji: '🟦' },
        { nombre: 'Junio', index: 5, emoji: '🟪' },
        { nombre: 'Julio', index: 6, emoji: '🟥' },
        { nombre: 'Agosto', index: 7, emoji: '🟧' },
        { nombre: 'Septiembre', index: 8, emoji: '🟨' },
        { nombre: 'Octubre', index: 9, emoji: '🟩' },
        { nombre: 'Noviembre', index: 10, emoji: '🟦' },
        { nombre: 'Diciembre', index: 11, emoji: '🟪' }
    ];
    
    
    const totalesPorMes = {};
    meses.forEach(mes => {
        totalesPorMes[mes.index] = 0;
    });
    
    trabajos.forEach(trabajo => {
        if (trabajo.fecha_ingreso) {
            const fecha = new Date(trabajo.fecha_ingreso);
            const mes = fecha.getMonth();
            totalesPorMes[mes] += parseFloat(trabajo.subtotal || 0);
        }
    });
    
    
    const mesCards = meses.map(mes => `
        <div class="mes-card" data-mes="${mes.index}" style="cursor: pointer;" title="Click para ver trabajos del mes">
            <div class="mes-nombre">${mes.emoji} ${mes.nombre}</div>
            <div class="mes-total">${formatCurrency(totalesPorMes[mes.index])}</div>
        </div>
    `).join('');
    
    grid.innerHTML = mesCards;
    panel.style.display = 'block';
    
    
    document.querySelectorAll('.mes-card').forEach(card => {
        card.addEventListener('click', function() {
            const mesIndex = parseInt(this.getAttribute('data-mes'));
            mostrarTrabajosMes(mesIndex, trabajos);
        });
    });
}


function ocultarResumenMensual() {
    const panel = document.getElementById('resumenMensualPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}


function mostrarTablaTrabajos(mostrar = true) {
    const panel = document.querySelector('.trabajos-panel');
    if (panel) {
        panel.style.display = mostrar ? 'block' : 'none';
    }
}


function mostrarTrabajosMes(mesIndex, todosTrabajosAnio) {
    const panel = document.querySelector('.trabajos-panel');
    if (!panel) return;
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    
    const trabajosMes = todosTrabajosAnio.filter(trabajo => {
        if (!trabajo.fecha_ingreso) return false;
        const fecha = new Date(trabajo.fecha_ingreso);
        return fecha.getMonth() === mesIndex;
    });
    
    
    const titulo = document.querySelector('.panel-title h2');
    if (titulo) {
        titulo.textContent = `📅 Trabajos realizados: ${meses[mesIndex]}`;
    }
    
    
    renderTrabajos(trabajosMes);
    panel.style.display = 'block';
}

