from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for
import sqlite3
import os
import sys


if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import time
from PIL import Image
import io
import bcrypt
from datetime import datetime, timedelta
import ssl
import socket

def obtener_ip_local():
    """Obtiene la dirección IP local de la máquina"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-change-me')

app.config['SESSION_COOKIE_NAME'] = 'don_michel_session'


DATABASE = os.path.join(os.path.dirname(__file__), '..', 'base_datos', 'taller.db')
USERS_DATABASE = os.path.join(os.path.dirname(__file__), '..', 'base_datos', 'usuarios.db')


UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif'}


if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    print(f"✓ Carpeta de uploads creada: {UPLOAD_FOLDER}")
else:
    print(f"✓ Carpeta de uploads existe: {UPLOAD_FOLDER}")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024


@app.errorhandler(RequestEntityTooLarge)
def handle_request_entity_too_large(error):
    """Manejar 413 Request Entity Too Large devolviendo JSON legible."""
    try:
        return jsonify({'success': False, 'error': 'Archivo demasiado grande. Tamaño máximo permitido: 32MB.'}), 413
    except Exception:
        return ('Archivo demasiado grande', 413)

def allowed_file(filename):
    """Validar si el archivo tiene extensión permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    """Obtiene una conexión con la base de datos"""
    conn = sqlite3.connect(DATABASE, timeout=30.0)
    conn.row_factory = sqlite3.Row

    conn.execute('PRAGMA journal_mode=WAL')
    return conn


def get_user_db_connection():
    """Obtiene una conexión con la base de datos de usuarios"""
    conn = sqlite3.connect(USERS_DATABASE, timeout=30.0)
    conn.row_factory = sqlite3.Row

    conn.execute('PRAGMA journal_mode=WAL')
    return conn


def ensure_user_db():
    """Garantiza que la tabla de usuarios exista y tenga el usuario admin por defecto si está vacía"""
    db_dir = os.path.dirname(USERS_DATABASE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = get_user_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS Usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            contrasena TEXT NOT NULL,
            rol TEXT NOT NULL,
            email TEXT,
            activo INTEGER DEFAULT 1,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_ultima_sesion TIMESTAMP
        )
        """
    )
    conn.commit()

    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM Usuarios")
    count = cursor.fetchone()[0]
    if count == 0:
        salt = bcrypt.gensalt(rounds=10)
        contrasena_hash = bcrypt.hashpw('admin'.encode('utf-8'), salt)
        cursor.execute(
            "INSERT INTO Usuarios (usuario, contrasena, rol, email, activo) VALUES (?, ?, ?, ?, 1)",
            ('admin', contrasena_hash, 'admin', 'admin@example.com')
        )
        conn.commit()
    conn.close()


ensure_user_db()



def verificar_contrasena(contrasena, hash_almacenado):
    """Verifica una contraseña contra su hash bcrypt"""
    try:
        return bcrypt.checkpw(contrasena.encode('utf-8'), hash_almacenado)
    except:
        return False



@app.route('/logo.png')
def logo_static():
    """Servir logo del taller"""
    return send_from_directory(os.path.dirname(__file__), 'logo.png')


@app.before_request
def require_login():
    """Redirige a login si no hay sesión, excepto rutas públicas."""
    open_endpoints = {'login', 'static', 'logout'}

    if request.endpoint in open_endpoints:
        return


    if request.path.startswith('/uploads/'):
        return

    user = session.get('user')

    if not user:
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'No autenticado'}), 401
        return redirect(url_for('login'))

    role = user.get('rol')

    def deny(msg):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': msg}), 403
        return redirect(url_for('registro'))


    if request.path.startswith('/gestion-usuarios') or request.path.startswith('/api/usuarios'):
        if role != 'admin':
            return deny('Acceso solo para administradores')


    if role == 'usuario':

        if request.path == '/api/imagenes' and request.method == 'POST':
            pass
        elif request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
            return deny('Acceso de solo lectura')
        if request.path.startswith('/api/usuarios') or request.path.startswith('/gestion-usuarios'):
            return deny('Acceso de solo lectura')


@app.context_processor
def inject_current_user():
    return {'current_user': session.get('user')}


@app.route('/', methods=['GET', 'POST'])
def login():
    """Pantalla de inicio/login contra la base de usuarios"""
    ensure_user_db()
    error = None
    success = None


    if request.method == 'GET' and session.get('user'):
        return redirect(url_for('registro'))

    if request.method == 'POST':
        usuario = request.form.get('usuario', '').strip()
        contrasena = request.form.get('contrasena', '')

        if not usuario or not contrasena:
            error = 'Ingresa usuario y contraseña.'
        else:
            conn = get_user_db_connection()
            fila = conn.execute(
                'SELECT id_usuario, usuario, contrasena, rol, activo FROM Usuarios WHERE usuario = ?',
                (usuario,)
            ).fetchone()

            if not fila:
                error = 'El usuario no existe.'
            elif fila['activo'] != 1:
                error = 'El usuario está inactivo.'
            elif not verificar_contrasena(contrasena, fila['contrasena']):
                error = 'Contraseña incorrecta.'
            else:
                conn.execute(
                    'UPDATE Usuarios SET fecha_ultima_sesion = CURRENT_TIMESTAMP WHERE id_usuario = ?',
                    (fila['id_usuario'],)
                )
                conn.commit()
                session['user'] = {
                    'id': fila['id_usuario'],
                    'usuario': fila['usuario'],
                    'rol': fila['rol']
                }
                conn.close()
                return redirect(url_for('registro'))

            conn.close()

    return render_template('login.html', error=error, success=success)


@app.route('/logout')
def logout():
    """Cerrar sesión y volver al login."""
    session.clear()
    return redirect(url_for('login'))


@app.route('/api/diagnostico')
def diagnostico():
    """Endpoint de diagnóstico para verificar la configuración de uploads"""
    try:
        diagnostico_info = {
            'upload_folder': app.config['UPLOAD_FOLDER'],
            'exists': os.path.exists(app.config['UPLOAD_FOLDER']),
            'is_dir': os.path.isdir(app.config['UPLOAD_FOLDER']),
            'writable': os.access(app.config['UPLOAD_FOLDER'], os.W_OK),
            'absolute_path': os.path.abspath(app.config['UPLOAD_FOLDER']),
            'allowed_extensions': list(ALLOWED_EXTENSIONS)
        }
        
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            try:
                files = os.listdir(app.config['UPLOAD_FOLDER'])
                diagnostico_info['contents'] = files
                diagnostico_info['count'] = len(files)
            except Exception as e:
                diagnostico_info['error_listing'] = str(e)
        
        return jsonify(diagnostico_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/about')
def about():
    return 'Esta es la página sobre nosotros'


@app.route('/gestion-usuarios')
def gestion_usuarios():
    """Panel de gestión que consulta las dos bases de datos"""
    ensure_user_db()

    usuarios = []
    try:
        conn_usuarios = get_user_db_connection()
        filas = conn_usuarios.execute(
            '''
            SELECT 
                id_usuario, 
                usuario, 
                rol, 
                email, 
                activo, 
                fecha_creacion, 
                fecha_ultima_sesion
            FROM Usuarios
            ORDER BY usuario ASC
            '''
        ).fetchall()
        conn_usuarios.close()
        usuarios = [dict(u) for u in filas]
    except Exception:
        usuarios = []

    totales = {'clientes': 0, 'vehiculos': 0, 'ordenes': 0}
    try:
        conn_taller = get_db_connection()
        totales['clientes'] = conn_taller.execute('SELECT COUNT(*) as total FROM cliente').fetchone()['total']
        totales['vehiculos'] = conn_taller.execute('SELECT COUNT(*) as total FROM vehiculo').fetchone()['total']
        totales['ordenes'] = conn_taller.execute('SELECT COUNT(*) as total FROM orden_servicio').fetchone()['total']
        conn_taller.close()
    except Exception:
        pass

    totales['usuarios'] = len(usuarios)
    totales['usuarios_activos'] = len([u for u in usuarios if u.get('activo') == 1])
    totales['usuarios_inactivos'] = totales['usuarios'] - totales['usuarios_activos']

    return render_template('gestion_usuarios.html', usuarios=usuarios, totales=totales)


@app.route('/registro')
def registro():
    tabla = request.args.get('tabla', 'cliente')
    return render_template('registro.html', tabla=tabla)

@app.route('/clientes')
def clientes():
    """Mostrar página de clientes"""
    try:
        conn = get_db_connection()
        clientes = conn.execute('SELECT * FROM cliente').fetchall()
        conn.close()
        return render_template('clientes.html', clientes=[dict(c) for c in clientes])
    except Exception as e:
        print(f"Error: {e}")
        return render_template('clientes.html', clientes=[])

@app.route('/vehiculos')
def vehiculos():
    """Mostrar página de tablas con lista de vehículos"""
    try:
        conn = get_db_connection()

        vehiculos = conn.execute('''
            SELECT 
                v.id,
                v.cliente_id,
                v.patente,
                v.imagen_id,
                i.nombre_imagen,
                v.marca_id,
                m.nombre as marca,
                v.modelo,
                v.anio_elaboracion,
                v.color,
                v.numero_chasis,
                v.cilindrada,
                v.tipo_aceite,
                v.tipo_combustible_id,
                tc.nombre as tipo_combustible,
                v.transmision_id,
                t.nombre as transmision,
                v.traccion_id,
                tr.nombre as traccion
            FROM vehiculo v
            LEFT JOIN imagenes i ON v.imagen_id = i.id
            LEFT JOIN marca m ON v.marca_id = m.id
            LEFT JOIN tipo_combustible tc ON v.tipo_combustible_id = tc.id
            LEFT JOIN transmision t ON v.transmision_id = t.id
            LEFT JOIN traccion tr ON v.traccion_id = tr.id
            ORDER BY v.patente ASC
        ''').fetchall()
        conn.close()
        return render_template('vehiculos.html', vehiculos=[dict(v) for v in vehiculos])
    except Exception as e:
        print(f"Error: {e}")
        return render_template('vehiculos.html', vehiculos=[])

@app.route('/orden-servicio')
def orden_servicio():
    """Mostrar página de servicios"""
    return render_template('orden_servicio.html')


@app.route('/historial')
def historial():
    """Mostrar página de historial"""
    return render_template('historial.html')


@app.route('/estadisticas')
def estadisticas():
    """Mostrar página de historial de trabajos con estadísticas"""
    return render_template('estadisticas.html')


@app.route('/api/estadisticas', methods=['GET'])
def obtener_estadisticas():
    """Obtener estadísticas de ingresos por día, semana, mes y año."""
    try:
        ano = request.args.get('ano', None)
        conn = get_db_connection()
        

        ano_actual = int(conn.execute("SELECT strftime('%Y', 'now') as ano").fetchone()['ano'])
        

        if ano:
            try:
                ano_int = int(ano)
            except ValueError:
                ano = None
                ano_int = ano_actual
        else:
            ano_int = ano_actual
        



        if ano_int == ano_actual:

            hoy_total = conn.execute('''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE DATE(fecha_ingreso) = DATE('now')
            ''').fetchone()['total'] or 0
            


            esta_semana = conn.execute('''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE DATE(fecha_ingreso) >= DATE('now', 
                    CASE WHEN strftime('%w', 'now') = '0' THEN '-6'
                         WHEN strftime('%w', 'now') = '1' THEN '0'
                         WHEN strftime('%w', 'now') = '2' THEN '-1'
                         WHEN strftime('%w', 'now') = '3' THEN '-2'
                         WHEN strftime('%w', 'now') = '4' THEN '-3'
                         WHEN strftime('%w', 'now') = '5' THEN '-4'
                         WHEN strftime('%w', 'now') = '6' THEN '-5'
                    END || ' days')
                AND DATE(fecha_ingreso) <= DATE('now',
                    CASE WHEN strftime('%w', 'now') = '0' THEN '-1'
                         WHEN strftime('%w', 'now') = '1' THEN '+5'
                         WHEN strftime('%w', 'now') = '2' THEN '+4'
                         WHEN strftime('%w', 'now') = '3' THEN '+3'
                         WHEN strftime('%w', 'now') = '4' THEN '+2'
                         WHEN strftime('%w', 'now') = '5' THEN '+1'
                         WHEN strftime('%w', 'now') = '6' THEN '0'
                    END || ' days')
            ''').fetchone()['total'] or 0
            
            este_mes = conn.execute('''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE strftime('%Y-%m', fecha_ingreso) = strftime('%Y-%m', 'now')
            ''').fetchone()['total'] or 0
            
            este_anio = conn.execute('''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE strftime('%Y', fecha_ingreso) = strftime('%Y', 'now')
            ''').fetchone()['total'] or 0
        else:

            hoy_total = conn.execute(f'''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE DATE(fecha_ingreso) = DATE('{ano_int}-12-31')
            ''').fetchone()['total'] or 0
            

            esta_semana = conn.execute(f'''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE strftime('%Y', fecha_ingreso) = '{ano_int}'
                AND strftime('%W', fecha_ingreso) = strftime('%W', DATE('{ano_int}-12-31'))
            ''').fetchone()['total'] or 0
            

            este_mes = conn.execute(f'''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE strftime('%Y-%m', fecha_ingreso) = '{ano_int}-12'
            ''').fetchone()['total'] or 0
            

            este_anio = conn.execute(f'''
                SELECT SUM(total) as total FROM orden_servicio 
                WHERE strftime('%Y', fecha_ingreso) = '{ano_int}'
            ''').fetchone()['total'] or 0
        
        conn.close()
        
        return jsonify({
            'hoy': hoy_total,
            'semana': esta_semana,
            'mes': este_mes,
            'anio': este_anio
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/trabajos-periodo', methods=['GET'])
def obtener_trabajos_periodo():
    """Obtener trabajos realizados en un período específico."""
    try:
        periodo = request.args.get('periodo', 'dia')
        ano = request.args.get('ano', None)
        conn = get_db_connection()
        

        ano_actual = int(conn.execute("SELECT strftime('%Y', 'now') as ano").fetchone()['ano'])
        

        where_clause = ""
        
        if ano:
            try:
                ano_int = int(ano)
            except ValueError:
                ano = None
                ano_int = ano_actual
        else:
            ano_int = ano_actual
        


        if ano_int == ano_actual:

            if periodo == 'dia':
                where_clause = "WHERE DATE(os.fecha_ingreso) = DATE('now')"
            elif periodo == 'semana':
                where_clause = """WHERE DATE(os.fecha_ingreso) >= DATE('now', 
                    CASE WHEN strftime('%w', 'now') = '0' THEN '-6'
                         WHEN strftime('%w', 'now') = '1' THEN '0'
                         WHEN strftime('%w', 'now') = '2' THEN '-1'
                         WHEN strftime('%w', 'now') = '3' THEN '-2'
                         WHEN strftime('%w', 'now') = '4' THEN '-3'
                         WHEN strftime('%w', 'now') = '5' THEN '-4'
                         WHEN strftime('%w', 'now') = '6' THEN '-5'
                    END || ' days')
                AND DATE(os.fecha_ingreso) <= DATE('now',
                    CASE WHEN strftime('%w', 'now') = '0' THEN '-1'
                         WHEN strftime('%w', 'now') = '1' THEN '+5'
                         WHEN strftime('%w', 'now') = '2' THEN '+4'
                         WHEN strftime('%w', 'now') = '3' THEN '+3'
                         WHEN strftime('%w', 'now') = '4' THEN '+2'
                         WHEN strftime('%w', 'now') = '5' THEN '+1'
                         WHEN strftime('%w', 'now') = '6' THEN '0'
                    END || ' days')"""
            elif periodo == 'mes':
                where_clause = "WHERE strftime('%Y-%m', os.fecha_ingreso) = strftime('%Y-%m', 'now')"
            else:
                where_clause = "WHERE strftime('%Y', os.fecha_ingreso) = strftime('%Y', 'now')"
        else:

            if periodo == 'dia':

                where_clause = f"WHERE DATE(os.fecha_ingreso) = DATE('{ano_int}-12-31')"
            elif periodo == 'semana':

                where_clause = f"""WHERE strftime('%Y', os.fecha_ingreso) = '{ano_int}'
                AND strftime('%W', os.fecha_ingreso) = strftime('%W', DATE('{ano_int}-12-31'))"""
            elif periodo == 'mes':

                where_clause = f"WHERE strftime('%Y-%m', os.fecha_ingreso) = '{ano_int}-12'"
            else:

                where_clause = f"WHERE strftime('%Y', os.fecha_ingreso) = '{ano_int}'"
        
        query = f'''
            SELECT 
                os.numero_os,
                os.fecha_ingreso,
                os.fecha_ingreso AS fecha_servicio,
                COALESCE(c.nombres || ' ' || c.apellidos, 'N/A') as cliente_nombre,
                COALESCE(v.modelo || ' (' || v.patente || ')', 'N/A') as vehiculo_info,
                dt.descripcion,
                CAST(dt.cantidad AS INTEGER) as cantidad,
                CAST(dt.subtotal AS REAL) as subtotal,
                CAST(os.total AS REAL) as total
            FROM orden_servicio os
            LEFT JOIN cliente c ON os.cliente_id = c.id
            LEFT JOIN vehiculo v ON os.vehiculo_id = v.id
            LEFT JOIN detalle_trabajo dt ON dt.os_id = os.id
            {where_clause}
            ORDER BY os.fecha_ingreso DESC, dt.id ASC
        '''
        
        trabajos = conn.execute(query).fetchall()
        conn.close()
        

        result = []
        for t in trabajos:
            row = dict(t)

            if row.get('cantidad') is not None:
                row['cantidad'] = int(row['cantidad'])
            if row.get('subtotal') is not None:
                row['subtotal'] = float(row['subtotal'])
            if row.get('total') is not None:
                row['total'] = float(row['total'])
            result.append(row)
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in obtener_trabajos_periodo: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/anos-disponibles', methods=['GET'])
def obtener_anos_disponibles():
    """Obtener años disponibles en la base de datos de órdenes de servicio."""
    try:
        conn = get_db_connection()
        

        anos = conn.execute('''
            SELECT DISTINCT strftime('%Y', fecha_ingreso) as ano
            FROM orden_servicio
            WHERE fecha_ingreso IS NOT NULL
            ORDER BY ano DESC
        ''').fetchall()
        
        conn.close()
        

        anos_list = [int(row['ano']) for row in anos]
        
        return jsonify({'anos': anos_list})
    except Exception as e:
        print(f"Error in obtener_anos_disponibles: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/vehiculos', methods=['GET'])
def obtener_vehiculos():
    """Obtener vehículos, opcionalmente filtrados por cliente o por patente (búsqueda similar)."""
    try:
        cliente_id = request.args.get('cliente_id')
        patente = request.args.get('patente')
        conn = get_db_connection()
        query = '''
            SELECT 
                v.id,
                v.cliente_id,
                v.patente,
                v.imagen_id,
                i.nombre_imagen,
                v.marca_id,
                m.nombre as marca,
                v.modelo,
                v.anio_elaboracion,
                v.color,
                v.numero_chasis,
                v.cilindrada,
                v.tipo_aceite,
                v.tipo_combustible_id,
                tc.nombre as tipo_combustible,
                v.transmision_id,
                t.nombre as transmision,
                v.traccion_id,
                tr.nombre as traccion
            FROM vehiculo v
            LEFT JOIN imagenes i ON v.imagen_id = i.id
            LEFT JOIN marca m ON v.marca_id = m.id
            LEFT JOIN tipo_combustible tc ON v.tipo_combustible_id = tc.id
            LEFT JOIN transmision t ON v.transmision_id = t.id
            LEFT JOIN traccion tr ON v.traccion_id = tr.id
        '''
        params = []
        filters = []
        if cliente_id:
            filters.append('v.cliente_id = ?')
            params.append(cliente_id)
        if patente:

            filters.append('v.patente LIKE ? COLLATE NOCASE')
            params.append(f"%{patente}%")
        if filters:
            query += ' WHERE ' + ' AND '.join(filters)
        query += ' ORDER BY v.patente ASC'
        vehiculos = conn.execute(query, params).fetchall()
        conn.close()
        return jsonify([dict(v) for v in vehiculos])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/historial/<int:vehiculo_id>', methods=['GET'])
def obtener_historial(vehiculo_id):
    """Obtener historial de servicios desde ordenes y detalles."""
    try:
        conn = get_db_connection()
        try:
            historial = conn.execute('''
                SELECT 
                    os.id,
                    os.numero_os,
                    os.fecha_ingreso AS fecha_servicio,
                    dt.descripcion AS tipo_trabajo,
                    dt.descripcion AS descripcion,
                    dt.subtotal AS costo,
                    os.observaciones
                FROM orden_servicio os
                LEFT JOIN detalle_trabajo dt ON dt.os_id = os.id
                WHERE os.vehiculo_id = ?
                ORDER BY os.fecha_ingreso DESC, dt.id DESC
            ''', (vehiculo_id,)).fetchall()
        except sqlite3.OperationalError:
            historial = []
        conn.close()
        return jsonify([dict(h) for h in historial])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/orden-servicio/<int:os_id>', methods=['GET'])
def obtener_orden_servicio(os_id):
    """Obtener detalles completos de una orden de servicio."""
    try:
        conn = get_db_connection()
        orden = conn.execute('''
            SELECT 
                os.id,
                os.numero_os,
                os.fecha_ingreso,
                os.cliente_id,
                c.nombres,
                c.apellidos,
                c.numero_contacto,
                c.numero_contacto_alternativo,
                c.correo_electronico,
                c.direccion,
                os.vehiculo_id,
                v.patente,
                v.modelo,
                v.anio_elaboracion,
                v.color,
                v.numero_chasis,
                v.cilindrada,
                v.tipo_aceite,
                m.nombre as marca,
                tc.nombre as tipo_combustible,
                t.nombre as transmision,
                tr.nombre as traccion,
                os.total,
                os.observaciones
            FROM orden_servicio os
            LEFT JOIN cliente c ON os.cliente_id = c.id
            LEFT JOIN vehiculo v ON os.vehiculo_id = v.id
            LEFT JOIN marca m ON v.marca_id = m.id
            LEFT JOIN tipo_combustible tc ON v.tipo_combustible_id = tc.id
            LEFT JOIN transmision t ON v.transmision_id = t.id
            LEFT JOIN traccion tr ON v.traccion_id = tr.id
            WHERE os.id = ?
        ''', (os_id,)).fetchone()
        
        detalles = conn.execute('''
            SELECT id, cantidad, descripcion, costo_unitario, subtotal
            FROM detalle_trabajo
            WHERE os_id = ?
            ORDER BY id ASC
        ''', (os_id,)).fetchall()
        
        conn.close()
        
        return jsonify({
            'orden': dict(orden) if orden else None,
            'detalles': [dict(d) for d in detalles]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/clientes', methods=['GET'])
def obtener_clientes():
    """Obtener todos los clientes"""
    try:
        conn = get_db_connection()
        clientes = conn.execute('SELECT * FROM cliente ORDER BY nombres ASC, apellidos ASC').fetchall()
        conn.close()
        return jsonify([dict(c) for c in clientes])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/clientes', methods=['POST'])
def crear_cliente():
    """Crear un nuevo cliente"""
    conn = None
    try:
        datos = request.get_json(silent=True) or {}
        for campo in ('nombres', 'apellidos', 'numero_contacto'):
            if not datos or not datos.get(campo):
                return jsonify({'success': False, 'error': f'Falta el campo requerido: {campo}'}), 400

        rut = datos.get('rut') or ''
        correo = datos.get('correo_electronico') or ''
        alt = datos.get('numero_contacto_alternativo') or ''
        direccion = datos.get('direccion') or ''
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO cliente (nombres, apellidos, rut, numero_contacto, numero_contacto_alternativo, correo_electronico, direccion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            datos['nombres'],
            datos['apellidos'],
            rut,
            datos['numero_contacto'],
            alt,
            correo,
            direccion
        ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Cliente registrado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def actualizar_cliente(id):
    """Actualizar un cliente existente"""
    conn = None
    try:
        datos = request.get_json(silent=True) or {}
        for campo in ('nombres', 'apellidos', 'numero_contacto'):
            if not datos or not datos.get(campo):
                return jsonify({'success': False, 'error': f'Falta el campo requerido: {campo}'}), 400

        rut = datos.get('rut') or ''
        correo = datos.get('correo_electronico') or ''
        alt = datos.get('numero_contacto_alternativo') or ''
        direccion = datos.get('direccion') or ''
        conn = get_db_connection()
        conn.execute('''
            UPDATE cliente 
            SET nombres = ?, apellidos = ?, rut = ?, numero_contacto = ?, numero_contacto_alternativo = ?, correo_electronico = ?, direccion = ?
            WHERE id = ?
        ''', (
            datos['nombres'],
            datos['apellidos'],
            rut,
            datos['numero_contacto'],
            alt,
            correo,
            direccion,
            id
        ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Cliente actualizado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def eliminar_cliente(id):
    """Eliminar un cliente"""
    conn = None
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM cliente WHERE id = ?', (id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Cliente eliminado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/marcas', methods=['GET'])
def obtener_marcas():
    """Obtener todas las marcas"""
    try:
        conn = get_db_connection()
        marcas = conn.execute('SELECT * FROM marca ORDER BY nombre ASC').fetchall()
        conn.close()
        return jsonify([dict(m) for m in marcas])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/marcas', methods=['POST'])
def crear_marca():
    """Crear una nueva marca"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO marca (nombre)
            VALUES (?)
        ''', (datos['nombre'],))
        conn.commit()
        return jsonify({'success': True, 'message': 'Marca registrada exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/transmisiones', methods=['GET'])
def obtener_transmisiones():
    """Obtener todas las transmisiones"""
    try:
        conn = get_db_connection()
        transmisiones = conn.execute('SELECT * FROM transmision ORDER BY nombre ASC').fetchall()
        conn.close()
        return jsonify([dict(t) for t in transmisiones])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/transmisiones', methods=['POST'])
def crear_transmision():
    """Crear una nueva transmisión"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO transmision (nombre)
            VALUES (?)
        ''', (datos['nombre'],))
        conn.commit()
        return jsonify({'success': True, 'message': 'Transmisión registrada exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/tracciones', methods=['GET'])
def obtener_tracciones():
    """Obtener todas las tracciones"""
    try:
        conn = get_db_connection()
        tracciones = conn.execute('SELECT * FROM traccion ORDER BY nombre ASC').fetchall()
        conn.close()
        return jsonify([dict(t) for t in tracciones])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/tracciones', methods=['POST'])
def crear_traccion():
    """Crear una nueva tracción"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO traccion (nombre)
            VALUES (?)
        ''', (datos['nombre'],))
        conn.commit()
        return jsonify({'success': True, 'message': 'Tracción registrada exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/combustibles', methods=['GET'])
def obtener_combustibles():
    """Obtener todos los tipos de combustible"""
    try:
        conn = get_db_connection()
        combustibles = conn.execute('SELECT * FROM tipo_combustible ORDER BY nombre ASC').fetchall()
        conn.close()
        return jsonify([dict(c) for c in combustibles])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/combustibles', methods=['POST'])
def crear_combustible():
    """Crear un nuevo tipo de combustible"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO tipo_combustible (nombre)
            VALUES (?)
        ''', (datos['nombre'],))
        conn.commit()
        return jsonify({'success': True, 'message': 'Combustible registrado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/imagenes', methods=['GET'])
def obtener_imagenes():
    """Obtener todas las imágenes"""
    try:
        conn = get_db_connection()
        imagenes = conn.execute('SELECT * FROM imagenes ORDER BY nombre_imagen ASC').fetchall()
        conn.close()
        return jsonify([dict(i) for i in imagenes])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/imagenes', methods=['POST'])
def subir_imagen():
    """Subir una nueva imagen"""
    conn = None
    try:
        print(f"\n--- INICIANDO SUBIDA DE IMAGEN ---")
        print(f"Archivos recibidos: {request.files.keys()}")
        print(f"Datos form: {request.form}")
        

        if 'imagen' not in request.files:
            print("❌ Error: No se encontró 'imagen' en request.files")
            return jsonify({'success': False, 'error': 'No se encontró archivo de imagen'}), 400
        
        file = request.files['imagen']
        print(f"Archivo: {file.filename}")
        

        if file.filename == '':
            print("❌ Error: Nombre de archivo vacío")
            return jsonify({'success': False, 'error': 'No se seleccionó archivo'}), 400
        

        if not allowed_file(file.filename):
            allowed_list = ', '.join(sorted(ALLOWED_EXTENSIONS))
            print(f"❌ Error: Tipo de archivo no permitido: {file.filename}")
            return jsonify({'success': False, 'error': f'Tipo de archivo no permitido. Extensiones permitidas: {allowed_list}'}), 400
        

        if file is None:
            print("❌ Error: Objeto de archivo es None")
            return jsonify({'success': False, 'error': 'Error al procesar el archivo'}), 400
        

        nombre_original = secure_filename(file.filename)
        nombre_base, orig_ext = os.path.splitext(nombre_original)
        orig_ext = orig_ext.lower() or ''
        timestamp = int(time.time())


        webp_filename = f"imagen_{timestamp}_{nombre_base}.webp"
        webp_filepath = os.path.join(app.config['UPLOAD_FOLDER'], webp_filename)


        if orig_ext:
            orig_filename = f"imagen_{timestamp}_{nombre_base}{orig_ext}"
        else:
            orig_filename = f"imagen_{timestamp}_{nombre_base}"
        orig_filepath = os.path.join(app.config['UPLOAD_FOLDER'], orig_filename)

        print(f"Nombres generados -> webp: {webp_filename}, original: {orig_filename}")
        

        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            try:
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                print(f"✓ Carpeta creada: {app.config['UPLOAD_FOLDER']}")
            except Exception as e:
                print(f"❌ Error al crear carpeta: {e}")
                return jsonify({'success': False, 'error': f'No se puede crear carpeta de uploads: {str(e)}'}), 500
        

        try:
            print(f"Leyendo archivo...")
            file.stream.seek(0)
            img = Image.open(file.stream)
            print(f"✓ Imagen leída. Modo: {img.mode}, Tamaño: {img.size}")
            

            if img.mode in ('RGBA', 'LA'):
                img = img.convert('RGBA')
                print(f"✓ Imagen convertida a RGBA")
            elif img.mode == 'P':

                img = img.convert('RGB')
                print(f"✓ Imagen paleta convertida a RGB")
            elif img.mode != 'RGB':
                img = img.convert('RGB')
                print(f"✓ Imagen convertida a RGB")
            

            target_width = 1200
            target_height = 800
            
            img_ratio = img.width / img.height if img.height > 0 else 1
            target_ratio = target_width / target_height
            
            if img_ratio > target_ratio:
                new_width = target_width
                new_height = int(target_width / img_ratio) if img_ratio > 0 else target_height
            else:
                new_height = target_height
                new_width = int(target_height * img_ratio) if img_ratio > 0 else target_width
            

            new_width = max(1, min(new_width, target_width))
            new_height = max(1, min(new_height, target_height))
            
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"✓ Imagen redimensionada a {new_width}x{new_height}")
            

            img.save(webp_filepath, 'WEBP', quality=85, method=6)
            print(f"✓ Imagen guardada como WebP: {webp_filepath}")

            filename = webp_filename
            filepath = webp_filepath
            
        except Exception as e:
            print(f"⚠️ Error al convertir imagen a WebP: {str(e)}")
            print(f"   Intentando guardar original...")
            try:
                file.stream.seek(0)

                file.save(orig_filepath)
                print(f"✓ Archivo original guardado: {orig_filepath}")
                filename = orig_filename
                filepath = orig_filepath
            except Exception as save_error:
                print(f"❌ Error al guardar archivo: {str(save_error)}")
                return jsonify({'success': False, 'error': f'Error al guardar archivo: {str(save_error)}'}), 500
        

        if not os.path.exists(filepath):
            print(f"❌ Error: Archivo no se guardó en {filepath}")
            return jsonify({'success': False, 'error': 'El archivo no se guardó correctamente en el servidor'}), 500
        
        file_size = os.path.getsize(filepath)
        print(f"✓ Archivo verificado. Tamaño: {file_size} bytes")
        

        conn = get_db_connection()
        cursor = conn.cursor()
        

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='imagenes'"
        )
        if not cursor.fetchone():
            print("❌ Error: Tabla 'imagenes' no existe en la base de datos")
            return jsonify({'success': False, 'error': 'Error de configuración: tabla de imágenes no existe'}), 500
        
        cursor.execute('INSERT INTO imagenes (nombre_imagen) VALUES (?)', (filename,))
        conn.commit()
        
        imagen_id = cursor.lastrowid
        print(f"✓ Imagen registrada en BD con ID: {imagen_id}")
        
        print(f"--- SUBIDA COMPLETADA EXITOSAMENTE ---\n")
        
        return jsonify({
            'success': True,
            'imagen_id': imagen_id,
            'nombre_imagen': filename,
            'message': 'Imagen guardada exitosamente'
        }), 200
        
    except Exception as e:
        print(f"❌ ERROR NO CAPTURADO en subir_imagen: {str(e)}")
        import traceback
        traceback.print_exc()
        
        if conn:
            try:
                conn.rollback()
            except:
                pass
        

        try:
            return jsonify({
                'success': False,
                'error': f'Error al procesar imagen: {str(e)}'
            }), 500
        except:

            return {'success': False, 'error': 'Error interno del servidor'}, 500
            
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass



@app.route('/api/imagenes/<int:imagen_id>/actualizar-nombre', methods=['POST'])
def actualizar_nombre_imagen(imagen_id):
    """Actualizar el nombre de una imagen para asociarla con un vehículo"""
    conn = None
    try:
        datos = request.get_json()
        vehiculo_id = datos.get('vehiculo_id')
        
        if not vehiculo_id:
            return jsonify({'success': False, 'error': 'Se requiere vehiculo_id'}), 400
        
        print(f"\n--- ACTUALIZANDO NOMBRE DE IMAGEN {imagen_id} ---")
        print(f"Vehículo ID: {vehiculo_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        

        imagen = cursor.execute('SELECT nombre_imagen FROM imagenes WHERE id = ?', (imagen_id,)).fetchone()
        
        if not imagen:
            conn.close()
            return jsonify({'success': False, 'error': 'Imagen no encontrada'}), 404
        
        nombre_actual = imagen['nombre_imagen']
        ruta_actual = os.path.join(app.config['UPLOAD_FOLDER'], nombre_actual)
        

        if not os.path.exists(ruta_actual):
            print(f"⚠ Advertencia: Archivo no encontrado en disco: {ruta_actual}")

        


        if nombre_actual.startswith('imagen_'):

            partes = nombre_actual.split('_', 2)
            if len(partes) >= 3:
                timestamp = partes[1]
                resto = partes[2]
                nuevo_nombre = f"vehiculo_{vehiculo_id}_{timestamp}_{resto}"
            else:

                timestamp = int(time.time())
                nuevo_nombre = f"vehiculo_{vehiculo_id}_{timestamp}.webp"
        else:

            timestamp = int(time.time())
            nombre_base = os.path.splitext(nombre_actual)[0]
            nuevo_nombre = f"vehiculo_{vehiculo_id}_{timestamp}_{nombre_base}.webp"
        
        nueva_ruta = os.path.join(app.config['UPLOAD_FOLDER'], nuevo_nombre)
        
        print(f"Nombre actual: {nombre_actual}")
        print(f"Nuevo nombre: {nuevo_nombre}")
        

        if os.path.exists(ruta_actual):
            try:
                os.rename(ruta_actual, nueva_ruta)
                print(f"✓ Archivo renombrado en disco")
            except Exception as e:
                print(f"❌ Error al renombrar archivo: {e}")
                conn.close()
                return jsonify({'success': False, 'error': f'Error al renombrar archivo: {str(e)}'}), 500
        

        cursor.execute('UPDATE imagenes SET nombre_imagen = ? WHERE id = ?', (nuevo_nombre, imagen_id))
        conn.commit()
        
        print(f"✓ Nombre actualizado en BD")
        print(f"--- ACTUALIZACIÓN COMPLETADA ---\n")
        
        return jsonify({
            'success': True,
            'nuevo_nombre': nuevo_nombre,
            'message': 'Nombre de imagen actualizado exitosamente'
        })
    except Exception as e:
        print(f"❌ Error en actualizar_nombre_imagen: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/uploads/<filename>')
def download_file(filename):
    """Descargar/servir archivo de imagen"""
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        return jsonify({'error': 'Archivo no encontrado'}), 404






@app.route('/api/vehiculos', methods=['POST'])
def crear_vehiculo():
    """Crear un nuevo vehículo"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO vehiculo (cliente_id, marca_id, imagen_id, modelo, anio_elaboracion, patente, color, numero_chasis, cilindrada, tipo_aceite, transmision_id, traccion_id, tipo_combustible_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datos['cliente_id'],
            datos['marca_id'],
            datos.get('imagen_id'),
            datos['modelo'],
            datos['anio_elaboracion'],
            datos['patente'],
            datos.get('color'),
            datos['numero_chasis'],
            datos.get('cilindrada'),
            datos.get('tipo_aceite'),
            datos.get('transmision_id'),
            datos.get('traccion_id'),
            datos.get('tipo_combustible_id')
        ))
        conn.commit()
        vehiculo_id = cursor.lastrowid
        return jsonify({
            'success': True, 
            'message': 'Vehículo registrado exitosamente',
            'vehiculo_id': vehiculo_id,
            'imagen_id': datos.get('imagen_id')
        })
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/vehiculos/<int:id>', methods=['PUT'])
def actualizar_vehiculo(id):
    """Actualizar un vehículo existente"""
    conn = None
    try:
        datos = request.get_json()
        conn = get_db_connection()
        conn.execute('''
            UPDATE vehiculo 
            SET cliente_id = ?, marca_id = ?, imagen_id = ?, modelo = ?, anio_elaboracion = ?, patente = ?, color = ?, numero_chasis = ?, cilindrada = ?, tipo_aceite = ?, transmision_id = ?, traccion_id = ?, tipo_combustible_id = ?
            WHERE id = ?
        ''', (
            datos.get('cliente_id'),
            datos.get('marca_id'),
            datos.get('imagen_id'),
            datos['modelo'],
            datos['anio_elaboracion'],
            datos['patente'],
            datos.get('color'),
            datos['numero_chasis'],
            datos.get('cilindrada'),
            datos.get('tipo_aceite'),
            datos.get('transmision_id'),
            datos.get('traccion_id'),
            datos.get('tipo_combustible_id'),
            id
        ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Vehículo actualizado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/vehiculos/<int:id>', methods=['DELETE'])
def eliminar_vehiculo(id):
    """Eliminar un vehículo"""
    conn = None
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM vehiculo WHERE id = ?', (id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Vehículo eliminado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/orden-servicio', methods=['POST'])
def crear_orden_servicio():
    """Crear una nueva orden de servicio"""
    conn = None
    try:
        datos = request.get_json()
        

        conn = get_db_connection()
        


        fecha_ingreso = datos['fecha_ingreso']
        if fecha_ingreso and len(fecha_ingreso) == 10:
            fecha_ingreso = fecha_ingreso + ' 00:00:00'
        

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO orden_servicio (numero_os, fecha_ingreso, cliente_id, vehiculo_id, total, observaciones)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            '',
            fecha_ingreso,
            datos['cliente_id'],
            datos['vehiculo_id'],
            datos['total'],
            datos['observaciones']
        ))
        conn.commit()
        

        os_id = cursor.lastrowid
        

        numero_os = str(os_id).zfill(12)
        

        conn.execute('UPDATE orden_servicio SET numero_os = ? WHERE id = ?', (numero_os, os_id))
        conn.commit()
        

        for trabajo in datos.get('trabajos', []):
            conn.execute('''
                INSERT INTO detalle_trabajo (os_id, cantidad, descripcion, costo_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                os_id,
                trabajo['cantidad'],
                trabajo['descripcion'],
                trabajo['costo'],
                trabajo['subtotal']
            ))
        conn.commit()
        
        return jsonify({
            'success': True,
            'os_id': os_id,
            'numero_os': numero_os,
            'message': 'Orden de servicio guardada exitosamente'
        })
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/orden-servicio/<int:os_id>', methods=['DELETE'])
def eliminar_orden_servicio(os_id):
    """Eliminar una orden de servicio y sus detalles."""
    conn = None
    try:
        conn = get_db_connection()


        conn.execute('DELETE FROM detalle_trabajo WHERE os_id = ?', (os_id,))
        cursor = conn.execute('DELETE FROM orden_servicio WHERE id = ?', (os_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'success': False, 'message': 'Orden no encontrada'}), 404

        return jsonify({'success': True, 'message': 'Orden eliminada correctamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()






@app.route('/api/usuarios', methods=['GET'])
def api_obtener_usuarios():
    """Listado de usuarios desde la base dedicada"""
    try:
        ensure_user_db()
        conn = get_user_db_connection()
        usuarios = conn.execute(
            '''
            SELECT 
                id_usuario, 
                usuario, 
                rol, 
                email, 
                activo, 
                fecha_creacion, 
                fecha_ultima_sesion
            FROM Usuarios
            ORDER BY usuario ASC
            '''
        ).fetchall()
        conn.close()
        return jsonify([dict(u) for u in usuarios])
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/usuarios', methods=['POST'])
def api_crear_usuario():
    """Crear un nuevo usuario"""
    conn = None
    try:
        datos = request.get_json() or {}
        usuario = (datos.get('usuario') or '').strip()
        contrasena = (datos.get('contrasena') or '').strip()
        rol = (datos.get('rol') or '').strip()
        email = (datos.get('email') or '').strip()

        if not usuario or not contrasena or not rol:
            return jsonify({'success': False, 'error': 'usuario, contrasena y rol son obligatorios'}), 400


        salt = bcrypt.gensalt(rounds=10)
        contrasena_hash = bcrypt.hashpw(contrasena.encode('utf-8'), salt)

        ensure_user_db()
        conn = get_user_db_connection()
        try:
            conn.execute(
                'INSERT INTO Usuarios (usuario, contrasena, rol, email) VALUES (?, ?, ?, ?)',
                (usuario, contrasena_hash, rol, email)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'error': 'El usuario ya existe'}), 400

        return jsonify({'success': True, 'message': 'Usuario creado exitosamente'}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/usuarios/<int:id_usuario>', methods=['PUT'])
def api_actualizar_usuario(id_usuario):
    """Actualizar rol, email, estado o contraseña de un usuario"""
    conn = None
    try:
        datos = request.get_json() or {}
        updates = []
        params = []

        if 'rol' in datos:
            updates.append('rol = ?')
            params.append(datos.get('rol'))
        if 'email' in datos:
            updates.append('email = ?')
            params.append(datos.get('email'))
        if 'activo' in datos:
            updates.append('activo = ?')
            params.append(1 if datos.get('activo') else 0)
        if datos.get('contrasena'):
            updates.append('contrasena = ?')

            salt = bcrypt.gensalt(rounds=10)
            contrasena_hash = bcrypt.hashpw(datos.get('contrasena').encode('utf-8'), salt)
            params.append(contrasena_hash)

        if not updates:
            return jsonify({'success': False, 'error': 'No hay campos para actualizar'}), 400

        params.append(id_usuario)
        ensure_user_db()
        conn = get_user_db_connection()
        cursor = conn.execute(f"UPDATE Usuarios SET {', '.join(updates)} WHERE id_usuario = ?", params)
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404

        return jsonify({'success': True, 'message': 'Usuario actualizado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
def api_eliminar_usuario(id_usuario):
    """Eliminar un usuario"""
    conn = None
    try:
        ensure_user_db()
        conn = get_user_db_connection()
        cursor = conn.execute('DELETE FROM Usuarios WHERE id_usuario = ?', (id_usuario,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404

        return jsonify({'success': True, 'message': 'Usuario eliminado exitosamente'})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':

    ssl_context = None

    cert_file = os.path.join(os.path.dirname(__file__), "cert.pem")
    key_file = os.path.join(os.path.dirname(__file__), "key.pem")
    ip_local = obtener_ip_local()
    
    print("\n" + "="*70)
    print("🚀 APLICACIÓN INICIADA - TALLER AUTOSOLUTION DON MICHEL")
    print("="*70)
    print(f"✓ IP Local: {ip_local}")
    print(f"✓ Puerto: 5001")
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"\n🔒 HTTPS HABILITADO - Certificados SSL detectados")
        print(f"\n📱 Acceso desde este dispositivo:")
        print(f"   https://localhost:5001")
        print(f"\n🌐 Acceso desde otros dispositivos:")
        print(f"   https://{ip_local}:5001")
        print(f"\n⚠️  NOTA: Los navegadores pueden mostrar advertencia de certificado")
        print(f"      (Es normal, es un certificado autofirmado)")
        
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_file, key_file)
        print("="*70 + "\n")
        app.run(host="0.0.0.0", port=5001, ssl_context=ssl_context)
    else:
        print(f"\n📱 Acceso desde este dispositivo:")
        print(f"   http://localhost:5001")
        print(f"\n🌐 Acceso desde otros dispositivos:")
        print(f"   http://{ip_local}:5001")
        print("\n⚠️  Certificados SSL no encontrados.")
        print(f"   Buscado en: {cert_file}")
        print(f"   Los certificados ya están incluidos en la carpeta del proyecto")
        print("   Iniciando en HTTP sin HTTPS...\n")
        print("="*70 + "\n")
        app.run(host="0.0.0.0", port=5001)

