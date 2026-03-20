# Guia de instalacion y ejecucion en otro PC (Windows)

Esta guia deja el sistema listo en pocos pasos para un equipo nuevo.

## 1) Requisitos minimos

- Windows 10 u 11
- Python 3.10 o superior (recomendado 3.11)
- MySQL Server 8.0 (o acceso a un servidor MySQL)
- Conexion a internet (solo para instalar dependencias)

## 2) Copiar el proyecto

1. Copia toda la carpeta del proyecto al nuevo PC.
2. No cambies la estructura de carpetas.

## 3) Configurar base de datos (primera vez)

1. Crea la base de datos en MySQL con nombre `presupuesto`.
2. Importa el script `base_de_datos.sql`.

Opcion por consola MySQL:

```sql
CREATE DATABASE IF NOT EXISTS presupuesto;
USE presupuesto;
SOURCE base_de_datos.sql;
```

## 4) Configurar variables de entorno

1. Si no existe `.env`, copia `.env.example` y renombralo a `.env`.
2. Ajusta usuario y contrasena de MySQL.

Ejemplo:

```env
DATABASE_URL=mysql+pymysql://root:123456@127.0.0.1:3306/presupuesto
```

## 5) Instalacion y arranque automatico (recomendado)

1. Abre la carpeta del proyecto.
2. Ejecuta doble clic en `instalar_y_ejecutar.bat`.

Ese script hace automaticamente:

- Crea el entorno virtual `.venv` (si no existe)
- Instala paquetes desde `requirements.txt`
- Inicia la API en `http://127.0.0.1:8000`
- Abre la pagina de carga

## 6) URLs del sistema

- Inicio: http://127.0.0.1:8000/
- Carga: http://127.0.0.1:8000/upload
- Dashboard: http://127.0.0.1:8000/frontend/dashboard.html

## 7) Solucion rapida de errores

- Error de Python no encontrado:
  - Instala Python y marca la opcion "Add Python to PATH".
- Error de conexion MySQL:
  - Revisa `.env` y que MySQL este encendido.
- Puerto ocupado (8000):
  - Cierra procesos previos de Uvicorn o cambia puerto en el .bat.

## 8) Forma alternativa manual (si no usas el .bat)

```powershell
py -3 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn backend_workbench_api:app --host 127.0.0.1 --port 8000
```
