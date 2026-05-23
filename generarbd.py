import os
import sqlite3

base_datos_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "base_datos")
os.makedirs(base_datos_dir, exist_ok=True)

conexion = sqlite3.connect(os.path.join(base_datos_dir, "taller.db"))
cursor = conexion.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    numero_contacto TEXT NOT NULL,
    numero_contacto_alternativo TEXT,
    correo_electronico TEXT NOT NULL,
    direccion TEXT
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS imagenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_imagen TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS marca (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS tipo_combustible (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS transmision (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS traccion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS vehiculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    marca_id INTEGER NOT NULL,
    imagen_id INTEGER,
    modelo TEXT NOT NULL,
    anio_elaboracion INTEGER NOT NULL,
    patente TEXT NOT NULL,
    color TEXT,
    numero_chasis TEXT NOT NULL,
    cilindrada TEXT,
    tipo_aceite TEXT,
    transmision_id INTEGER,
    traccion_id INTEGER,
    tipo_combustible_id INTEGER,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (marca_id) REFERENCES marca(id),
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id),
    FOREIGN KEY (transmision_id) REFERENCES transmision(id),
    FOREIGN KEY (traccion_id) REFERENCES traccion(id),
    FOREIGN KEY (tipo_combustible_id) REFERENCES tipo_combustible(id)
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS orden_servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_os TEXT NOT NULL,
    fecha_ingreso TEXT NOT NULL,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    total REAL DEFAULT 0,
    observaciones TEXT,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id)
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS detalle_trabajo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    costo_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (os_id) REFERENCES orden_servicio(id)
);
""")

conexion.commit()
conexion.close()

print("Base de datos creada exitosamente SIN UNIQUE.")
