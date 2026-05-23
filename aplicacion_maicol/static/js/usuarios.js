(() => {
    const tablaBody = document.getElementById('usuariosBody');
    const estado = document.getElementById('usuariosEstado');
    const form = document.getElementById('usuarioForm');
    const refrescarBtn = document.getElementById('refrescarBtn');

    let usuarios = Array.isArray(window.bootstrapUsuarios) ? window.bootstrapUsuarios : [];

    const setEstado = (msg, tipo = 'info') => {
        if (!estado) return;
        estado.textContent = msg || '';
        estado.dataset.tipo = tipo;
    };

    const formatDate = (val) => val || '—';

    const render = (lista) => {
        usuarios = lista;
        if (!tablaBody) return;

        if (!lista.length) {
            tablaBody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;">Sin usuarios registrados aún.</td></tr>';
            return;
        }

        tablaBody.innerHTML = lista.map(u => {
            const activo = Number(u.activo) === 1;
            return `
                <tr data-id="${u.id_usuario}" data-activo="${activo ? 1 : 0}">
                    <td>${u.usuario}</td>
                    <td class="mono">${u.rol || '—'}</td>
                    <td>${u.email || '—'}</td>
                    <td>${activo ? '<span class="badge success">Activo</span>' : '<span class="badge muted">Inactivo</span>'}</td>
                    <td class="mono">${formatDate(u.fecha_creacion)}</td>
                    <td class="mono">${formatDate(u.fecha_ultima_sesion)}</td>
                    <td>
                        <button class="link-btn" data-accion="toggle">${activo ? 'Desactivar' : 'Activar'}</button>
                        <button class="link-btn" data-accion="reset">Actualizar clave</button>
                        <button class="link-btn danger" data-accion="eliminar">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const fetchUsuarios = async () => {
        setEstado('Cargando usuarios...');
        try {
            const res = await fetch('/api/usuarios');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
            render(data);
            setEstado('Usuarios actualizados.');
        } catch (err) {
            console.error(err);
            setEstado(err.message || 'No se pudieron cargar los usuarios', 'error');
        }
    };

    const crearUsuario = async (payload) => {
        setEstado('Guardando usuario...');
        const res = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.error || 'No se pudo crear el usuario');
        }
        setEstado(data.message || 'Usuario creado.');
        await fetchUsuarios();
    };

    const actualizarUsuario = async (id, payload) => {
        setEstado('Actualizando usuario...');
        const res = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.error || 'No se pudo actualizar el usuario');
        }
        setEstado(data.message || 'Usuario actualizado.');
        await fetchUsuarios();
    };

    const eliminarUsuario = async (id) => {
        setEstado('Eliminando usuario...');
        const res = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.error || 'No se pudo eliminar el usuario');
        }
        setEstado(data.message || 'Usuario eliminado.');
        await fetchUsuarios();
    };

    const onFormSubmit = async (evt) => {
        evt.preventDefault();
        const payload = {
            usuario: form.usuario.value.trim(),
            email: form.email.value.trim(),
            rol: form.rol.value,
            contrasena: form.contrasena.value
        };

        if (!payload.usuario || !payload.contrasena || !payload.rol) {
            setEstado('Completa usuario, rol y contraseña.', 'error');
            return;
        }

        try {
            await crearUsuario(payload);
            form.reset();
        } catch (err) {
            console.error(err);
            setEstado(err.message, 'error');
        }
    };

    const onTableClick = async (evt) => {
        const accion = evt.target.dataset.accion;
        if (!accion) return;

        const row = evt.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;
        const activoActual = row.dataset.activo === '1';

        if (accion === 'toggle') {
            try {
                await actualizarUsuario(id, { activo: !activoActual });
            } catch (err) {
                console.error(err);
                setEstado(err.message, 'error');
            }
        }

        if (accion === 'reset') {
            const nueva = window.prompt('Nueva contraseña para el usuario:');
            if (!nueva) return;
            try {
                await actualizarUsuario(id, { contrasena: nueva });
            } catch (err) {
                console.error(err);
                setEstado(err.message, 'error');
            }
        }

        if (accion === 'eliminar') {
            const confirmar = window.confirm('¿Estás seguro de que deseas eliminar este usuario?');
            if (!confirmar) return;
            try {
                await eliminarUsuario(id);
            } catch (err) {
                console.error(err);
                setEstado(err.message, 'error');
            }
        }
    };

    if (form) form.addEventListener('submit', onFormSubmit);
    if (tablaBody) tablaBody.addEventListener('click', onTableClick);
    if (refrescarBtn) refrescarBtn.addEventListener('click', fetchUsuarios);

    render(usuarios);
    fetchUsuarios();
})();
