from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openpyxl
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

app = FastAPI()

# Configuración de CORS para permitir frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/subir-excel-eje/")
def subir_excel_eje(file: UploadFile = File(...)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx")
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(file.file.read())
    wb = openpyxl.load_workbook(temp_path)
    ws = wb.active

    # Buscar todas las filas que sean encabezado de tabla y procesar solo los valores debajo de cada encabezado
    encabezado = "APROPIACION VIGENTE DEP.GSTO."
    encabezado_normalizado = encabezado.replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip().upper()
    filas = list(ws.iter_rows())
    indices_encabezado = []
    col_ap = None
    # Buscar todas las filas donde esté el encabezado y la columna AP
    for i, row in enumerate(filas):
        for idx, cell in enumerate(row):
            cell_value = str(cell.value).replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip().upper()
            if encabezado_normalizado == cell_value:
                indices_encabezado.append((i, idx))
    if not indices_encabezado:
        os.remove(temp_path)
        raise HTTPException(status_code=400, detail="No se encontró la columna APROPIACION")
    count = 0
    with engine.begin() as conn:
        for idx_e, (fila_enc, col_ap) in enumerate(indices_encabezado):
            fila = fila_enc + 1  # Primera fila de datos después del encabezado
            while fila < len(filas):
                cell = filas[fila][col_ap]
                # Si encontramos otro encabezado, paramos
                cell_value = str(cell.value).replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip().upper()
                if cell_value == encabezado_normalizado:
                    break
                # Si la celda está vacía, paramos (fin de tabla)
                if cell.value is None:
                    break
                # Solo guardar si está en negrita y es numérico
                if cell.font.bold:
                    try:
                        valor = float(cell.value)
                        conn.execute(text("INSERT INTO apropiacion_vigente (valor) VALUES (:valor)"), {"valor": valor})
                        count += 1
                    except (ValueError, TypeError):
                        pass
                fila += 1
    os.remove(temp_path)
    return {"message": f"Datos cargados: {count}"}

@app.get("/apropiaciones/")
def get_apropiaciones():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, valor FROM apropiacion_vigente"))
        data = result.fetchall()
    return [{"id": row[0], "valor": float(row[1])} for row in data]

@app.get("/apropiaciones/suma/")
def get_suma_apropiaciones():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT SUM(valor) FROM apropiacion_vigente"))
        suma = result.scalar()
    suma_float = float(suma) if suma else 0.0
    # Formato contable: puntos de miles y millones
    suma_formateada = f"{suma_float:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    # Ejemplo: 1.234.567,89
    return {"suma": suma_float, "suma_formateada": suma_formateada}
