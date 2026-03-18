from __future__ import annotations

import os
import re
from io import BytesIO
from pathlib import Path
from typing import Any
import unicodedata

import pandas as pd
import pymysql
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from pymysql.cursors import DictCursor
from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from starlette.staticfiles import StaticFiles


load_dotenv()


def get_default_connection_values() -> dict[str, Any]:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        url = make_url(database_url)
        return {
            "host": url.host or "127.0.0.1",
            "port": int(url.port or 3306),
            "user": url.username or "root",
            "password": url.password or "",
            "database": url.database,
        }

    return {
        "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "presupuesto"),
    }


DEFAULT_CONNECTION = get_default_connection_values()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
SQL_SCRIPTS = {
    "base_datos": BASE_DIR / "base_de_datos.sql",
    "base_crp": BASE_DIR / "base_crp.sql",
    "base_cdp": BASE_DIR / "base_cdp.sql",
}


class ConnectionPayload(BaseModel):
    host: str = DEFAULT_CONNECTION["host"]
    port: int = DEFAULT_CONNECTION["port"]
    user: str = DEFAULT_CONNECTION["user"]
    password: str = DEFAULT_CONNECTION["password"]
    database: str | None = DEFAULT_CONNECTION["database"]


class RunScriptPayload(ConnectionPayload):
    script_name: str


class QueryPayload(ConnectionPayload):
    query: str


class TableColumnPayload(BaseModel):
    name: str
    data_type: str = "TEXT"
    nullable: bool = True


class CreateTablePayload(ConnectionPayload):
    table_name: str
    columns: list[TableColumnPayload]
    if_exists: str = "fail"


app = FastAPI(
    title="API Carga SQL Workbench",
    description="Backend y endpoints para cargar scripts .sql en MySQL/Workbench.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


CDP_REQUIRED_HEADERS = [
    "Numero Documento",
    "Fecha de Registro",
    "Fecha de Creacion",
    "Tipo de CDP",
    "Estado",
    "Dependencia",
    "Dependencia Descripcion",
    "Rubro",
    "Descripcion",
    "Fuente",
    "Recurso",
    "Sit",
    "Valor Inicial",
    "Valor Operaciones",
    "Valor Actual",
    "Saldo por Comprometer",
    "Objeto",
    "Solicitud CDP",
]

CDP_NUMERIC_HEADERS = [
    "Valor Inicial",
    "Valor Operaciones",
    "Valor Actual",
    "Saldo por Comprometer",
]

CDP_DATETIME_HEADERS = [
    "Fecha de Registro",
    "Fecha de Creacion",
]

CRP_REQUIRED_HEADERS = [
    "Numero Documento",
    "Fecha de Registro",
    "Fecha de Creacion",
    "Estado",
    "Dependencia",
    "Dependencia Descripcion",
    "Rubro",
    "Descripcion",
    "Fuente",
    "Recurso",
    "Situacion",
    "Valor Inicial",
    "Valor Operaciones",
    "Valor Actual",
    "Saldo por Utilizar",
    "Tipo Identificacion",
    "Identificacion",
    "Nombre Razon Social",
    "Medio de Pago",
    "Tipo Cuenta",
    "Numero Cuenta",
    "Estado Cuenta",
    "Entidad Nit",
    "Entidad Descripcion",
    "Solicitud CDP",
    "CDP",
    "Compromisos",
    "Cuentas por Pagar",
    "Obligaciones",
    "Ordenes de Pago",
    "Reintegros",
]

CRP_NUMERIC_HEADERS = [
    "Valor Inicial",
    "Valor Operaciones",
    "Valor Actual",
    "Saldo por Utilizar",
    "Compromisos",
    "Cuentas por Pagar",
    "Obligaciones",
    "Ordenes de Pago",
    "Reintegros",
]

CRP_DATETIME_HEADERS = [
    "Fecha de Registro",
    "Fecha de Creacion",
]

SEGUIMIENTO_TARGET_HEADERS = [
    "Numero_Documento",
    "Fecha_Registro",
    "Fecha_Creacion",
    "Tipo_de_CDP",
    "Estado",
    "Dependencia",
    "Dependencia_Descripcion",
    "Rubro",
    "Descripcion",
    "Fuente",
    "Recurso",
    "Sit",
    "Valor_Inicial",
    "Valor_Operaciones",
    "Valor_Actual",
    "Saldo_por_Comprometer",
    "Objeto",
    "Solicitud_CDP",
]

SEGUIMIENTO_NUMERIC_HEADERS = [
    "Valor_Inicial",
    "Valor_Operaciones",
    "Valor_Actual",
    "Saldo_por_Comprometer",
]

SEGUIMIENTO_ALIASES = {
    "Numero_Documento": ["Numero_Documento", "Numero Documento"],
    "Fecha_Registro": ["Fecha_Registro", "Fecha de Registro"],
    "Fecha_Creacion": ["Fecha_Creacion", "Fecha de Creacion"],
    "Tipo_de_CDP": ["Tipo_de_CDP", "Tipo de CDP"],
    "Estado": ["Estado"],
    "Dependencia": ["Dependencia"],
    "Dependencia_Descripcion": ["Dependencia_Descripcion", "Dependencia Descripcion"],
    "Rubro": ["Rubro"],
    "Descripcion": ["Descripcion"],
    "Fuente": ["Fuente"],
    "Recurso": ["Recurso"],
    "Sit": ["Sit"],
    "Valor_Inicial": ["Valor_Inicial", "Valor Inicial"],
    "Valor_Operaciones": ["Valor_Operaciones", "Valor Operaciones"],
    "Valor_Actual": ["Valor_Actual", "Valor Actual"],
    "Saldo_por_Comprometer": ["Saldo_por_Comprometer", "Saldo por Comprometer"],
    "Objeto": ["Objeto"],
    "Solicitud_CDP": ["Solicitud_CDP", "Solicitud CDP"],
}

GENERIC_SQL_TYPE_MAP = {
    "STRING": "VARCHAR(255)",
    "TEXT": "TEXT",
    "LONGTEXT": "LONGTEXT",
    "INTEGER": "BIGINT",
    "INT": "INT",
    "BIGINT": "BIGINT",
    "NUMBER": "DECIMAL(18,2)",
    "DECIMAL": "DECIMAL(18,2)",
    "FLOAT": "DOUBLE",
    "DOUBLE": "DOUBLE",
    "BOOLEAN": "TINYINT(1)",
    "BOOL": "TINYINT(1)",
    "DATE": "DATE",
    "DATETIME": "DATETIME",
}

VARCHAR_PATTERN = re.compile(r"^VARCHAR\((\d{1,4})\)$", re.IGNORECASE)
DECIMAL_PATTERN = re.compile(r"^DECIMAL\((\d{1,2}),(\d{1,2})\)$", re.IGNORECASE)


def parse_sql_statements(script: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []

    in_single = False
    in_double = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False

    i = 0
    while i < len(script):
        c = script[i]
        nxt = script[i + 1] if i + 1 < len(script) else ""

        if in_line_comment:
            if c == "\n":
                in_line_comment = False
                buffer.append(c)
            i += 1
            continue

        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if not in_single and not in_double and not in_backtick:
            if c == "-" and nxt == "-":
                in_line_comment = True
                i += 2
                continue
            if c == "#":
                in_line_comment = True
                i += 1
                continue
            if c == "/" and nxt == "*":
                in_block_comment = True
                i += 2
                continue

        if c == "'" and not in_double and not in_backtick:
            in_single = not in_single
            buffer.append(c)
            i += 1
            continue

        if c == '"' and not in_single and not in_backtick:
            in_double = not in_double
            buffer.append(c)
            i += 1
            continue

        if c == "`" and not in_single and not in_double:
            in_backtick = not in_backtick
            buffer.append(c)
            i += 1
            continue

        if c == ";" and not in_single and not in_double and not in_backtick:
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
            i += 1
            continue

        buffer.append(c)
        i += 1

    tail = "".join(buffer).strip()
    if tail:
        statements.append(tail)

    return statements


def get_connection(payload: ConnectionPayload):
    kwargs: dict[str, Any] = {
        "host": payload.host,
        "port": payload.port,
        "user": payload.user,
        "password": payload.password,
        "charset": "utf8mb4",
        "autocommit": False,
        "cursorclass": DictCursor,
    }
    if payload.database:
        kwargs["database"] = payload.database
    return pymysql.connect(**kwargs)


def validate_identifier(name: str, label: str) -> str:
    candidate = str(name).strip()
    if not candidate:
        raise HTTPException(status_code=400, detail=f"Debes indicar un nombre de {label}.")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", candidate):
        raise HTTPException(
            status_code=400,
            detail=f"El nombre de {label} solo puede contener letras, numeros y guion bajo.",
        )
    return candidate


def sanitize_identifier(name: str) -> str:
    normalized = "".join(
        ch for ch in unicodedata.normalize("NFD", str(name).strip()) if unicodedata.category(ch) != "Mn"
    )
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", normalized)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    if not cleaned:
        cleaned = "col"
    if cleaned[0].isdigit():
        cleaned = f"t_{cleaned}"
    return cleaned.lower()


def normalize_columns(columns: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    out: list[str] = []
    for col in columns:
        base = sanitize_identifier(col)
        count = seen.get(base, 0) + 1
        seen[base] = count
        out.append(base if count == 1 else f"{base}_{count}")
    return out


def normalize_sql_type(type_name: str) -> str:
    normalized = str(type_name or "TEXT").strip().upper()

    mapped = GENERIC_SQL_TYPE_MAP.get(normalized)
    if mapped:
        return mapped

    varchar_match = VARCHAR_PATTERN.fullmatch(normalized)
    if varchar_match:
        size = int(varchar_match.group(1))
        if 1 <= size <= 65535:
            return f"VARCHAR({size})"

    decimal_match = DECIMAL_PATTERN.fullmatch(normalized)
    if decimal_match:
        precision = int(decimal_match.group(1))
        scale = int(decimal_match.group(2))
        if 1 <= precision <= 65 and 0 <= scale <= 30 and scale <= precision:
            return f"DECIMAL({precision},{scale})"

    raise HTTPException(status_code=400, detail=f"Tipo de dato no soportado: {type_name}")


def row_get_ci(row: dict[str, Any], key: str) -> Any:
    for k, value in row.items():
        if str(k).lower() == key.lower():
            return value
    return None


def get_table_columns(payload: ConnectionPayload, table_name: str) -> list[dict[str, Any]]:
    if not payload.database:
        raise HTTPException(status_code=400, detail="Debes indicar database para consultar columnas.")

    connection = get_connection(payload)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_key,
                    extra
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
                """,
                (payload.database, table_name),
            )
            rows = cursor.fetchall()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error consultando columnas: {exc}") from exc
    finally:
        connection.close()

    return rows


def get_insertable_columns(payload: ConnectionPayload, table_name: str) -> list[str]:
    rows = get_table_columns(payload, table_name)
    if not rows:
        raise HTTPException(status_code=404, detail=f"La tabla '{table_name}' no existe en la base de datos.")

    return [
        str(row_get_ci(row, "column_name"))
        for row in rows
        if "auto_increment" not in str(row_get_ci(row, "extra") or "").lower()
    ]


def get_insertable_columns_with_types(payload: ConnectionPayload, table_name: str) -> list[tuple[str, str]]:
    rows = get_table_columns(payload, table_name)
    if not rows:
        raise HTTPException(status_code=404, detail=f"La tabla '{table_name}' no existe en la base de datos.")

    result: list[tuple[str, str]] = []
    for row in rows:
        if "auto_increment" in str(row_get_ci(row, "extra") or "").lower():
            continue
        column_name = str(row_get_ci(row, "column_name"))
        data_type = str(row_get_ci(row, "data_type") or "text").lower()
        result.append((column_name, data_type))
    return result


def get_insertable_column_max_lengths(payload: ConnectionPayload, table_name: str) -> dict[str, int | None]:
    rows = get_table_columns(payload, table_name)
    if not rows:
        raise HTTPException(status_code=404, detail=f"La tabla '{table_name}' no existe en la base de datos.")

    result: dict[str, int | None] = {}
    for row in rows:
        if "auto_increment" in str(row_get_ci(row, "extra") or "").lower():
            continue
        column_name = str(row_get_ci(row, "column_name"))
        max_length_raw = row_get_ci(row, "character_maximum_length")
        max_length = int(max_length_raw) if max_length_raw is not None else None
        result[column_name] = max_length
    return result


def parse_numeric_for_mysql(value: Any) -> float | None:
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace("\u00a0", "").replace(" ", "")
    if not text or text.lower() in {"nan", "none", "null"}:
        return None

    text = re.sub(r"[^0-9,.-]", "", text)
    if not text:
        return None

    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")

    try:
        return float(text)
    except ValueError:
        return None


def coerce_dataframe_to_table_types(
    df: pd.DataFrame,
    column_types: dict[str, str],
    column_max_lengths: dict[str, int | None] | None = None,
) -> pd.DataFrame:
    result = df.copy()

    numeric_types = {"decimal", "numeric", "float", "double", "real"}
    integer_types = {"tinyint", "smallint", "mediumint", "int", "integer", "bigint"}
    datetime_types = {"datetime", "timestamp"}

    for column, data_type in column_types.items():
        if column not in result.columns:
            continue

        if data_type in numeric_types:
            result[column] = result[column].apply(parse_numeric_for_mysql)
        elif data_type in integer_types:
            result[column] = result[column].apply(parse_numeric_for_mysql)
            result[column] = result[column].apply(lambda v: int(v) if v is not None else None)
        elif data_type in datetime_types:
            parsed = pd.to_datetime(result[column], errors="coerce", dayfirst=True)
            result[column] = parsed.where(parsed.notna(), None)
        elif data_type == "date":
            parsed = pd.to_datetime(result[column], errors="coerce", dayfirst=True)
            result[column] = parsed.dt.date.where(parsed.notna(), None)

        max_length = None
        if column_max_lengths is not None:
            max_length = column_max_lengths.get(column)

        if max_length is not None and data_type in {"varchar", "char"}:
            result[column] = result[column].apply(
                lambda v: (str(v)[:max_length] if v is not None and not pd.isna(v) else None)
            )

    return result.where(pd.notna(result), None)


def build_dataframe_for_existing_table(df: pd.DataFrame, target_columns: list[str]) -> pd.DataFrame:
    df = df.copy()
    df.columns = normalize_columns([str(c) for c in df.columns])
    target_normalized = normalize_columns(target_columns)

    matched_columns = [col for col in target_normalized if col in df.columns]
    missing_columns = [col for col in target_normalized if col not in df.columns]
    extra_columns = [col for col in df.columns if col not in target_normalized]

    if not matched_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": "No hay encabezados del Excel que coincidan con la tabla destino.",
                "esperadas": target_normalized,
                "recibidas": df.columns.tolist(),
            },
        )

    for missing in missing_columns:
        df[missing] = None

    # Conserva el orden de la tabla destino para insertar correctamente.
    df = df[target_normalized]
    df = df.dropna(how="all")
    if df.empty:
        raise HTTPException(status_code=400, detail="El Excel no contiene filas con datos para cargar.")

    df.columns = target_columns
    result = df.where(pd.notna(df), None)

    # Exponer metadatos de mapeo para respuesta del endpoint.
    result.attrs["matched_columns"] = matched_columns
    result.attrs["missing_columns"] = missing_columns
    result.attrs["extra_columns"] = extra_columns
    return result


def build_dataframe_from_detected_header_row(
    df_raw: pd.DataFrame,
    target_columns: list[str],
    min_hits: int = 3,
) -> pd.DataFrame:
    target_norm = set(normalize_columns(target_columns))
    max_scan = min(80, len(df_raw))
    best_row = -1
    best_hits = 0

    for i in range(max_scan):
        row_values = [sanitize_identifier(v) for v in df_raw.iloc[i].tolist()]
        row_set = {v for v in row_values if v}
        hits = len(target_norm.intersection(row_set))
        if hits > best_hits:
            best_hits = hits
            best_row = i

    if best_row == -1 or best_hits < min_hits:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo detectar una fila de encabezados compatible con la tabla destino."
            ),
        )

    header_values = [str(v).strip() if pd.notna(v) else "" for v in df_raw.iloc[best_row].tolist()]
    data = df_raw.iloc[best_row + 1 :].copy().reset_index(drop=True)
    data.columns = header_values
    return build_dataframe_for_existing_table(data, target_columns)


def build_sqlalchemy_url(payload: ConnectionPayload) -> str:
    db_name = payload.database or ""
    return (
        f"mysql+pymysql://{payload.user}:{payload.password}"
        f"@{payload.host}:{payload.port}/{db_name}?charset=utf8mb4"
    )


def get_form_connection_payload(
    host: str,
    port: int,
    user: str,
    password: str,
    database: str | None,
) -> ConnectionPayload:
    return ConnectionPayload(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
    )


def read_excel_bytes(content_bytes: bytes) -> dict[str, pd.DataFrame]:
    try:
        return pd.read_excel(BytesIO(content_bytes), sheet_name=None, dtype=object)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"No se pudo leer el Excel: {exc}") from exc


def read_excel_sheet_raw(content_bytes: bytes, sheet_name: str) -> pd.DataFrame:
    try:
        return pd.read_excel(BytesIO(content_bytes), sheet_name=sheet_name, header=None, dtype=object)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"No se pudo leer la hoja raw '{sheet_name}': {exc}") from exc


def build_seguimiento_from_eje_table(eje_df: pd.DataFrame) -> pd.DataFrame:
    result = pd.DataFrame()
    result["Numero_Documento"] = None
    result["Fecha_Registro"] = None
    result["Fecha_Creacion"] = None
    result["Tipo_de_CDP"] = eje_df.get("TIPO")
    result["Estado"] = None
    result["Dependencia"] = eje_df.get("DEPENDENCIA DE AFECTACION DE GASTOS")
    result["Dependencia_Descripcion"] = eje_df.get("DEPENDENCIA DE AFECTACION DE GASTOS")
    result["Rubro"] = eje_df.get("CONCEPTO")
    result["Descripcion"] = eje_df.get("CONCEPTO")
    result["Fuente"] = eje_df.get("FUENTE")
    result["Recurso"] = eje_df.get("RECURSO")
    result["Sit"] = eje_df.get("SITUACION")
    result["Valor_Inicial"] = eje_df.get("APROPIACION VIGENTE DEP.GSTO")
    result["Valor_Operaciones"] = eje_df.get("TOTAL CDP MODIFICACION DEP.GSTOS")
    result["Valor_Actual"] = eje_df.get("TOTAL CDP DEP.GSTOS")
    result["Saldo_por_Comprometer"] = eje_df.get("CDP POR COMPROMETER DEP.GSTOS")
    result["Objeto"] = eje_df.get("CONCEPTO")
    result["Solicitud_CDP"] = None

    return result.where(pd.notna(result), None)


def _extract_metadata_value(df_raw: pd.DataFrame, label_hint: str, search_rows: int) -> str | None:
    target = normalize_header(label_hint)
    max_rows = min(search_rows, len(df_raw))
    for r in range(max_rows):
        row = df_raw.iloc[r].tolist()
        normalized_cells = [normalize_header(v) for v in row]
        for idx, cell in enumerate(normalized_cells):
            if target and target in cell:
                right_values = [str(v).strip() for v in row[idx + 1 :] if pd.notna(v) and str(v).strip()]
                if right_values:
                    return " ".join(right_values)
    return None


def _find_header_index(header_norm: list[str], aliases: list[str]) -> int | None:
    alias_norm = [normalize_header(a) for a in aliases]

    for idx, col in enumerate(header_norm):
        if col in alias_norm:
            return idx

    for idx, col in enumerate(header_norm):
        if any(alias and (alias in col or col in alias) for alias in alias_norm):
            return idx

    return None


def build_seguimiento_from_horizontal_row17(df_raw: pd.DataFrame) -> pd.DataFrame:
    if len(df_raw) < 17:
        raise HTTPException(status_code=400, detail="El Excel de seguimiento no tiene suficientes filas para leer encabezados.")

    header_row = 16  # Fila 17 en Excel
    raw_headers = [str(v).strip() if pd.notna(v) else "" for v in df_raw.iloc[header_row].tolist()]
    header_norm = [normalize_header(v) for v in raw_headers]

    idx_tipo = _find_header_index(header_norm, ["TIPO"])
    idx_cta = _find_header_index(header_norm, ["CTA"])
    idx_objg = _find_header_index(header_norm, ["OBJG"])
    idx_concepto = _find_header_index(header_norm, ["CONCEPTO"])
    idx_fuente = _find_header_index(header_norm, ["FUENTE"])
    idx_situacion = _find_header_index(header_norm, ["SITUACION", "SIT"])
    idx_recurso = _find_header_index(header_norm, ["RECURSO", "REC."])

    idx_valor_inicial = _find_header_index(header_norm, ["APROPIACION VIGENTE DEP.GSTO", "APROPIACION VIGENTE"])
    idx_valor_operaciones = _find_header_index(header_norm, ["TOTAL CDP MODIFICACION DEP.GSTOS", "TOTAL CDP MODIFICACION"])
    idx_valor_actual = _find_header_index(header_norm, ["TOTAL CDP DEP.GSTOS", "TOTAL CDP"])
    idx_saldo = _find_header_index(header_norm, ["CDP POR COMPROMETER DEP.GSTOS", "CDP POR COMPROMETER"])

    if idx_tipo is None or idx_concepto is None:
        raise HTTPException(
            status_code=400,
            detail="No se detectaron encabezados horizontales validos en la fila 17 para seguimiento.",
        )

    dependencia_val = _extract_metadata_value(df_raw, "DEPENDENCIA DE AFECTACION DE GASTOS", header_row)
    fecha_val = _extract_metadata_value(df_raw, "FECHA MOVIMIENTOS", header_row)

    data = df_raw.iloc[header_row + 1 :].copy().reset_index(drop=True)
    result = pd.DataFrame()

    result["Numero_Documento"] = data.iloc[:, idx_cta] if idx_cta is not None else None
    result["Fecha_Registro"] = fecha_val
    result["Fecha_Creacion"] = fecha_val
    result["Tipo_de_CDP"] = data.iloc[:, idx_tipo] if idx_tipo is not None else None
    result["Estado"] = None
    result["Dependencia"] = dependencia_val
    result["Dependencia_Descripcion"] = dependencia_val
    result["Rubro"] = data.iloc[:, idx_objg] if idx_objg is not None else None
    result["Descripcion"] = data.iloc[:, idx_concepto] if idx_concepto is not None else None
    result["Fuente"] = data.iloc[:, idx_fuente] if idx_fuente is not None else None
    result["Recurso"] = data.iloc[:, idx_recurso] if idx_recurso is not None else None
    result["Sit"] = data.iloc[:, idx_situacion] if idx_situacion is not None else None
    result["Valor_Inicial"] = data.iloc[:, idx_valor_inicial] if idx_valor_inicial is not None else None
    result["Valor_Operaciones"] = data.iloc[:, idx_valor_operaciones] if idx_valor_operaciones is not None else None
    result["Valor_Actual"] = data.iloc[:, idx_valor_actual] if idx_valor_actual is not None else None
    result["Saldo_por_Comprometer"] = data.iloc[:, idx_saldo] if idx_saldo is not None else None
    result["Objeto"] = data.iloc[:, idx_concepto] if idx_concepto is not None else None
    result["Solicitud_CDP"] = None

    result = result.dropna(how="all")
    non_empty = result[["Tipo_de_CDP", "Descripcion", "Valor_Actual"]].apply(
        lambda row: any(pd.notna(v) and str(v).strip() for v in row), axis=1
    )
    result = result[non_empty].reset_index(drop=True)

    return result.where(pd.notna(result), None)


def build_seguimiento_merged_dataframe(
    content_bytes: bytes,
    sheet_name: str,
    df_raw_default: pd.DataFrame,
    target_columns: list[str],
) -> pd.DataFrame:
    prepared_candidates: list[pd.DataFrame] = []
    errors: list[str] = []

    try:
        from transformar_eje import build_eje_table

        raw_sheet_df = read_excel_sheet_raw(content_bytes, sheet_name)
        eje_df = build_eje_table(raw_sheet_df)
        eje_prepared = build_dataframe_for_existing_table(build_seguimiento_from_eje_table(eje_df), target_columns)
        prepared_candidates.append(eje_prepared)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"eje: {exc}")

    try:
        raw_sheet_df = read_excel_sheet_raw(content_bytes, sheet_name)
        row17_prepared = build_dataframe_for_existing_table(build_seguimiento_from_horizontal_row17(raw_sheet_df), target_columns)
        prepared_candidates.append(row17_prepared)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"row17: {exc}")

    try:
        flex_prepared = build_dataframe_for_existing_table(build_seguimiento_dataframe(df_raw_default), target_columns)
        prepared_candidates.append(flex_prepared)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"flex: {exc}")

    if not prepared_candidates:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": "No se pudo leer seguimiento con ningun parser.",
                "detalle": errors,
            },
        )

    merged = pd.concat(prepared_candidates, ignore_index=True)
    merged = merged.drop_duplicates().reset_index(drop=True)
    return merged.where(pd.notna(merged), None)


def parse_decimal_or_none(value: Any) -> float | None:
    if pd.isna(value):
        return None

    text = str(value).strip().replace("\u00a0", "").replace(" ", "")
    if not text or text.lower() == "nan":
        return None

    if "," in text and not re.match(r"^-?\d{1,3}(,\d{3})*(\.\d+)?$", text):
        return None

    cleaned = text.replace(",", "")
    if not re.match(r"^-?\d+(\.\d+)?$", cleaned):
        return None

    return float(cleaned)


def load_default_datasets_dataframes() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    cdp_file = BASE_DIR / "930810-CDP.xlsx"
    crp_file = BASE_DIR / "930810-CRP.xlsx"

    if not cdp_file.exists() or not crp_file.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "No se encontraron los archivos 930810-CDP.xlsx y/o 930810-CRP.xlsx "
                "en la carpeta del proyecto."
            ),
        )

    cdp_columns = [
        "Numero Documento",
        "Fecha de Registro",
        "Fecha de Creacion",
        "Tipo de CDP",
        "Estado",
        "Dependencia",
        "Dependencia Descripcion",
        "Rubro",
        "Descripcion",
        "Fuente",
        "Recurso",
        "Sit",
        "Valor Inicial",
        "Valor Operaciones",
        "Valor Actual",
        "Saldo por Comprometer",
        "Objeto",
        "Solicitud CDP",
    ]
    cdp_numeric = ["Valor Inicial", "Valor Operaciones", "Valor Actual", "Saldo por Comprometer"]

    crp_columns = [
        "Numero Documento",
        "Fecha de Registro",
        "Fecha de Creacion",
        "Estado",
        "Dependencia",
        "Dependencia Descripcion",
        "Rubro",
        "Descripcion",
        "Fuente",
        "Recurso",
        "Situacion",
        "Valor Inicial",
        "Valor Operaciones",
        "Valor Actual",
        "Saldo por Utilizar",
        "Tipo Identificacion",
        "Identificacion",
        "Nombre Razon Social",
        "Medio de Pago",
        "Tipo Cuenta",
        "Numero Cuenta",
        "Estado Cuenta",
        "Entidad Nit",
        "Entidad Descripcion",
        "Solicitud CDP",
        "CDP",
        "Compromisos",
        "Cuentas por Pagar",
        "Obligaciones",
        "Ordenes de Pago",
        "Reintegros",
    ]
    crp_numeric = [
        "Valor Inicial",
        "Valor Operaciones",
        "Valor Actual",
        "Saldo por Utilizar",
        "Compromisos",
        "Cuentas por Pagar",
        "Obligaciones",
        "Ordenes de Pago",
        "Reintegros",
    ]

    try:
        cdp_df = pd.read_excel(cdp_file, dtype=object)[cdp_columns].copy()
        crp_df = pd.read_excel(crp_file, dtype=object)[crp_columns].copy()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error leyendo archivos base: {exc}") from exc

    for col in cdp_numeric:
        cdp_df[col] = cdp_df[col].apply(parse_decimal_or_none)

    for col in crp_numeric:
        crp_df[col] = crp_df[col].apply(parse_decimal_or_none)

    cdp_df = cdp_df.where(pd.notna(cdp_df), None)
    crp_df = crp_df.where(pd.notna(crp_df), None)

    seguimiento_df = cdp_df.rename(
        columns={
            "Numero Documento": "Numero_Documento",
            "Fecha de Registro": "Fecha_Registro",
            "Fecha de Creacion": "Fecha_Creacion",
            "Tipo de CDP": "Tipo_de_CDP",
            "Dependencia Descripcion": "Dependencia_Descripcion",
            "Valor Inicial": "Valor_Inicial",
            "Valor Operaciones": "Valor_Operaciones",
            "Valor Actual": "Valor_Actual",
            "Saldo por Comprometer": "Saldo_por_Comprometer",
            "Solicitud CDP": "Solicitud_CDP",
        }
    ).copy()

    for col in ["Fecha_Registro", "Fecha_Creacion"]:
        seguimiento_df[col] = seguimiento_df[col].astype(str)

    return cdp_df, crp_df, seguimiento_df


def normalize_header(text: str) -> str:
    t = str(text).strip().lower()
    t = "".join(ch for ch in unicodedata.normalize("NFD", t) if unicodedata.category(ch) != "Mn")
    t = re.sub(r"[^a-z0-9]+", "", t)
    return t


def find_cdp_header_row(df_raw: pd.DataFrame) -> int:
    required_norm = {normalize_header(h) for h in CDP_REQUIRED_HEADERS}
    max_scan = min(50, len(df_raw))
    best_row = -1
    best_hits = 0

    for i in range(max_scan):
        row_values = [normalize_header(v) for v in df_raw.iloc[i].tolist()]
        row_set = {v for v in row_values if v}
        hits = len(required_norm.intersection(row_set))
        if hits > best_hits:
            best_hits = hits
            best_row = i

    if best_row == -1 or best_hits < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se encontro una fila de encabezados valida para CDP. "
                "Verifica que el Excel tenga los encabezados esperados."
            ),
        )
    return best_row


def build_cdp_dataframe(df_raw: pd.DataFrame) -> pd.DataFrame:
    header_row = find_cdp_header_row(df_raw)
    header_values = [str(v).strip() if pd.notna(v) else "" for v in df_raw.iloc[header_row].tolist()]
    header_map: dict[str, int] = {}

    for idx, col in enumerate(header_values):
        norm = normalize_header(col)
        if norm and norm not in header_map:
            header_map[norm] = idx

    missing = []
    for col in CDP_REQUIRED_HEADERS:
        if normalize_header(col) not in header_map:
            missing.append(col)

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan encabezados CDP requeridos: {', '.join(missing)}",
        )

    data = df_raw.iloc[header_row + 1 :].copy().reset_index(drop=True)
    result = pd.DataFrame()

    for col in CDP_REQUIRED_HEADERS:
        idx = header_map[normalize_header(col)]
        result[col] = data.iloc[:, idx]

    result = result.dropna(how="all")

    for col in CDP_NUMERIC_HEADERS:
        result[col] = pd.to_numeric(
            result[col]
            .astype(str)
            .str.replace("\u00a0", "", regex=False)
            .str.replace(" ", "", regex=False)
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False),
            errors="coerce",
        )

    for col in CDP_DATETIME_HEADERS:
        result[col] = pd.to_datetime(result[col], errors="coerce", dayfirst=True)

    for col in CDP_REQUIRED_HEADERS:
        if col not in CDP_NUMERIC_HEADERS and col not in CDP_DATETIME_HEADERS:
            result[col] = result[col].where(pd.notna(result[col]), None)

    # Evita cargar filas completamente vacias en columnas clave de negocio.
    key_cols = ["Numero Documento", "Rubro", "Descripcion", "Objeto"]
    non_empty = result[key_cols].apply(lambda r: any(pd.notna(v) and str(v).strip() for v in r), axis=1)
    result = result[non_empty].reset_index(drop=True)

    return result


def find_crp_header_row(df_raw: pd.DataFrame) -> int:
    required_norm = {normalize_header(h) for h in CRP_REQUIRED_HEADERS}
    max_scan = min(60, len(df_raw))
    best_row = -1
    best_hits = 0

    for i in range(max_scan):
        row_values = [normalize_header(v) for v in df_raw.iloc[i].tolist()]
        row_set = {v for v in row_values if v}
        hits = len(required_norm.intersection(row_set))
        if hits > best_hits:
            best_hits = hits
            best_row = i

    if best_row == -1 or best_hits < 10:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se encontro una fila de encabezados valida para CRP. "
                "Verifica que el Excel tenga los encabezados esperados."
            ),
        )
    return best_row


def build_crp_dataframe(df_raw: pd.DataFrame) -> pd.DataFrame:
    header_row = find_crp_header_row(df_raw)
    header_values = [str(v).strip() if pd.notna(v) else "" for v in df_raw.iloc[header_row].tolist()]
    header_map: dict[str, int] = {}

    for idx, col in enumerate(header_values):
        norm = normalize_header(col)
        if norm and norm not in header_map:
            header_map[norm] = idx

    missing = []
    for col in CRP_REQUIRED_HEADERS:
        if normalize_header(col) not in header_map:
            missing.append(col)

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan encabezados CRP requeridos: {', '.join(missing)}",
        )

    data = df_raw.iloc[header_row + 1 :].copy().reset_index(drop=True)
    result = pd.DataFrame()

    for col in CRP_REQUIRED_HEADERS:
        idx = header_map[normalize_header(col)]
        result[col] = data.iloc[:, idx]

    result = result.dropna(how="all")

    for col in CRP_NUMERIC_HEADERS:
        result[col] = pd.to_numeric(
            result[col]
            .astype(str)
            .str.replace("\u00a0", "", regex=False)
            .str.replace(" ", "", regex=False)
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False),
            errors="coerce",
        )

    for col in CRP_DATETIME_HEADERS:
        result[col] = pd.to_datetime(result[col], errors="coerce", dayfirst=True)

    for col in CRP_REQUIRED_HEADERS:
        if col not in CRP_NUMERIC_HEADERS and col not in CRP_DATETIME_HEADERS:
            result[col] = result[col].where(pd.notna(result[col]), None)

    key_cols = ["Numero Documento", "Rubro", "Descripcion", "Identificacion"]
    non_empty = result[key_cols].apply(lambda r: any(pd.notna(v) and str(v).strip() for v in r), axis=1)
    result = result[non_empty].reset_index(drop=True)

    return result


def build_seguimiento_from_cdp_dataframe(cdp_df: pd.DataFrame) -> pd.DataFrame:
    seguimiento_df = cdp_df.rename(
        columns={
            "Numero Documento": "Numero_Documento",
            "Fecha de Registro": "Fecha_Registro",
            "Fecha de Creacion": "Fecha_Creacion",
            "Tipo de CDP": "Tipo_de_CDP",
            "Dependencia Descripcion": "Dependencia_Descripcion",
            "Valor Inicial": "Valor_Inicial",
            "Valor Operaciones": "Valor_Operaciones",
            "Valor Actual": "Valor_Actual",
            "Saldo por Comprometer": "Saldo_por_Comprometer",
            "Solicitud CDP": "Solicitud_CDP",
        }
    ).copy()

    for col in ["Fecha_Registro", "Fecha_Creacion"]:
        if col in seguimiento_df.columns:
            seguimiento_df[col] = seguimiento_df[col].astype(str)

    return seguimiento_df


def find_seguimiento_header_row(df_raw: pd.DataFrame) -> int:
    alias_norm = [normalize_header(alias) for aliases in SEGUIMIENTO_ALIASES.values() for alias in aliases]
    max_scan = min(60, len(df_raw))
    best_row = -1
    best_hits = 0

    for i in range(max_scan):
        row_values = [normalize_header(v) for v in df_raw.iloc[i].tolist()]
        row_non_empty = [v for v in row_values if v]
        hits = 0
        for alias in alias_norm:
            if any(alias in cell or cell in alias for cell in row_non_empty):
                hits += 1
        if hits > best_hits:
            best_hits = hits
            best_row = i

    if best_row == -1 or best_hits < 5:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se encontro una fila de encabezados valida para seguimiento. "
                "Verifica que el Excel tenga encabezados de la tabla seguimiento_presupuestal."
            ),
        )
    return best_row


def build_seguimiento_dataframe(df_raw: pd.DataFrame) -> pd.DataFrame:
    header_row = find_seguimiento_header_row(df_raw)
    header_values = [str(v).strip() if pd.notna(v) else "" for v in df_raw.iloc[header_row].tolist()]

    header_map: dict[str, int] = {}
    for idx, col in enumerate(header_values):
        norm = normalize_header(col)
        if norm and norm not in header_map:
            header_map[norm] = idx

    available_norm_headers = list(header_map.keys())

    data = df_raw.iloc[header_row + 1 :].copy().reset_index(drop=True)
    result = pd.DataFrame()
    missing: list[str] = []

    for target in SEGUIMIENTO_TARGET_HEADERS:
        aliases = SEGUIMIENTO_ALIASES.get(target, [target])
        selected_idx = None
        for alias in aliases:
            norm = normalize_header(alias)
            if norm in header_map:
                selected_idx = header_map[norm]
                break

            fuzzy_match = next(
                (
                    candidate
                    for candidate in available_norm_headers
                    if norm in candidate or candidate in norm
                ),
                None,
            )
            if fuzzy_match is not None:
                selected_idx = header_map[fuzzy_match]
                break

        if selected_idx is None:
            missing.append(target)
            result[target] = None
        else:
            result[target] = data.iloc[:, selected_idx]

    result = result.dropna(how="all")

    for col in SEGUIMIENTO_NUMERIC_HEADERS:
        result[col] = pd.to_numeric(
            result[col]
            .astype(str)
            .str.replace("\u00a0", "", regex=False)
            .str.replace(" ", "", regex=False)
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False),
            errors="coerce",
        )

    for col in ["Fecha_Registro", "Fecha_Creacion"]:
        result[col] = result[col].astype(str)

    key_cols = ["Numero_Documento", "Rubro", "Descripcion"]
    non_empty = result[key_cols].apply(lambda r: any(pd.notna(v) and str(v).strip() for v in r), axis=1)
    result = result[non_empty].reset_index(drop=True)

    result.attrs["missing_headers"] = missing
    return result


def execute_sql_script(script_content: str, payload: ConnectionPayload) -> dict[str, Any]:
    statements = parse_sql_statements(script_content)
    if not statements:
        raise HTTPException(status_code=400, detail="El archivo SQL no contiene sentencias ejecutables.")

    connection = get_connection(payload)
    executed = 0
    try:
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
                executed += 1
        connection.commit()
    except Exception as exc:  # noqa: BLE001
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Error ejecutando SQL en sentencia {executed + 1}: {exc}") from exc
    finally:
        connection.close()

    return {"sentencias_ejecutadas": executed}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def serve_frontend() -> RedirectResponse:
    return RedirectResponse(url="/frontend/index.html")


@app.get("/upload")
def serve_upload_frontend() -> RedirectResponse:
    return RedirectResponse(url="/frontend/upload.html")


@app.post("/api/sql/run-prebuilt")
def run_prebuilt_script(payload: RunScriptPayload) -> dict[str, Any]:
    script_path = SQL_SCRIPTS.get(payload.script_name)
    if not script_path:
        raise HTTPException(
            status_code=404,
            detail=f"Script no encontrado. Opciones validas: {', '.join(SQL_SCRIPTS.keys())}",
        )
    if not script_path.exists():
        raise HTTPException(status_code=404, detail=f"No existe el archivo: {script_path.name}")

    content = script_path.read_text(encoding="utf-8")
    result = execute_sql_script(content, payload)
    return {
        "ok": True,
        "script": script_path.name,
        **result,
    }


@app.post("/api/sql/upload")
async def upload_and_run_sql(
    file: UploadFile = File(...),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str | None = Form(default=DEFAULT_CONNECTION["database"]),
) -> dict[str, Any]:
    if not file.filename.lower().endswith(".sql"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .sql")

    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    payload = get_form_connection_payload(host, port, user, password, database)
    result = execute_sql_script(content, payload)
    return {
        "ok": True,
        "archivo": file.filename,
        **result,
    }


@app.post("/api/sql/query")
def run_query(payload: QueryPayload) -> dict[str, Any]:
    connection = get_connection(payload)
    try:
        with connection.cursor() as cursor:
            cursor.execute(payload.query)
            rows = cursor.fetchall()
        return {
            "ok": True,
            "filas": len(rows),
            "data": rows,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error ejecutando query: {exc}") from exc
    finally:
        connection.close()


@app.post("/api/sql/list-tables")
def list_tables(payload: ConnectionPayload) -> dict[str, Any]:
    db_name = payload.database
    if not db_name:
        raise HTTPException(status_code=400, detail="Debes indicar database para listar tablas.")

    connection = get_connection(payload)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
                """,
                (db_name,),
            )
            rows = cursor.fetchall()
        return {
            "ok": True,
            "database": db_name,
            "tables": [str(row_get_ci(r, "table_name")) for r in rows if row_get_ci(r, "table_name")],
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error listando tablas: {exc}") from exc
    finally:
        connection.close()


@app.get("/api/tables")
def list_tables_default() -> dict[str, Any]:
    payload = ConnectionPayload()
    return list_tables(payload)


@app.post("/api/tables/create")
def create_table(payload: CreateTablePayload) -> dict[str, Any]:
    if payload.if_exists not in {"fail", "replace"}:
        raise HTTPException(status_code=400, detail="if_exists solo permite: fail o replace")
    if not payload.columns:
        raise HTTPException(status_code=400, detail="Debes enviar al menos una columna.")
    if not payload.database:
        raise HTTPException(status_code=400, detail="Debes indicar la base de datos destino.")

    table_name = validate_identifier(payload.table_name, "tabla")
    seen_names: set[str] = set()
    column_definitions: list[str] = []
    created_columns: list[dict[str, Any]] = []

    for column in payload.columns:
        column_name = validate_identifier(sanitize_identifier(column.name), "columna")
        if column_name in seen_names:
            raise HTTPException(status_code=400, detail=f"La columna '{column_name}' esta repetida.")
        seen_names.add(column_name)

        sql_type = normalize_sql_type(column.data_type)
        nullable = "NULL" if column.nullable else "NOT NULL"
        column_definitions.append(f"`{column_name}` {sql_type} {nullable}")
        created_columns.append(
            {
                "name": column_name,
                "data_type": sql_type,
                "nullable": column.nullable,
            }
        )

    connection = get_connection(payload)
    try:
        with connection.cursor() as cursor:
            if payload.if_exists == "replace":
                cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
            cursor.execute(
                f"""
                CREATE TABLE `{table_name}` (
                    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(column_definitions)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        connection.commit()
    except Exception as exc:  # noqa: BLE001
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Error creando tabla: {exc}") from exc
    finally:
        connection.close()

    return {
        "ok": True,
        "database": payload.database,
        "table_name": table_name,
        "columns": created_columns,
        "if_exists": payload.if_exists,
    }


@app.post("/api/tables/schema")
def table_schema(payload: ConnectionPayload, table_name: str) -> dict[str, Any]:
    if not payload.database:
        raise HTTPException(status_code=400, detail="Debes indicar la base de datos destino.")

    safe_table_name = validate_identifier(table_name, "tabla")
    rows = get_table_columns(payload, safe_table_name)
    if not rows:
        raise HTTPException(status_code=404, detail=f"La tabla '{safe_table_name}' no existe.")

    return {
        "ok": True,
        "database": payload.database,
        "table_name": safe_table_name,
        "columns": rows,
    }


@app.get("/api/tables/{table_name}/schema")
def table_schema_default(table_name: str) -> dict[str, Any]:
    payload = ConnectionPayload()
    return table_schema(payload, table_name)


@app.get("/api/tables/{table_name}/preview")
def table_preview_default(
    table_name: str,
    limit: int = 10,
    page: int = 1,
    q: str | None = None,
) -> dict[str, Any]:
    payload = ConnectionPayload()
    if not payload.database:
        raise HTTPException(status_code=400, detail="Debes indicar la base de datos destino.")

    safe_table_name = validate_identifier(table_name, "tabla")
    safe_limit = max(1, min(int(limit), 50))
    safe_page = max(1, int(page))
    search_text = (q or "").strip()

    table_columns = get_table_columns(payload, safe_table_name)
    if not table_columns:
        raise HTTPException(status_code=404, detail=f"La tabla '{safe_table_name}' no existe.")

    columns = [str(row_get_ci(row, "column_name")) for row in table_columns if row_get_ci(row, "column_name")]
    order_column = "id" if "id" in {c.lower() for c in columns} else columns[0]

    where_clause = ""
    params: list[Any] = []
    if search_text:
        searchable_columns = [f"CAST(`{column}` AS CHAR) LIKE %s" for column in columns]
        where_clause = f" WHERE {' OR '.join(searchable_columns)}"
        params = [f"%{search_text}%"] * len(columns)

    offset = (safe_page - 1) * safe_limit

    connection = get_connection(payload)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT COUNT(*) AS total FROM `{safe_table_name}`{where_clause}",
                params,
            )
            total_row = cursor.fetchone() or {}
            total_rows = int(row_get_ci(total_row, "total") or 0)

            cursor.execute(
                f"SELECT * FROM `{safe_table_name}`{where_clause} ORDER BY `{order_column}` LIMIT %s OFFSET %s",
                [*params, safe_limit, offset],
            )
            rows = cursor.fetchall()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error consultando preview de tabla: {exc}") from exc
    finally:
        connection.close()

    return {
        "ok": True,
        "database": payload.database,
        "table_name": safe_table_name,
        "rows": rows,
        "columns": columns,
        "limit": safe_limit,
        "page": safe_page,
        "total_rows": total_rows,
        "total_pages": max(1, (total_rows + safe_limit - 1) // safe_limit),
        "search": search_text,
    }


@app.post("/api/excel/preview")
async def preview_excel(
    file: UploadFile = File(...),
    table_name: str | None = Form(default=None),
    sheet: str | None = Form(default=None),
) -> dict[str, Any]:
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    if sheet and sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    candidate_sheets = [sheet] if sheet else list(sheets.keys())
    safe_table_name = sanitize_identifier(table_name) if table_name else None

    result = []
    for sheet_name in candidate_sheets:
        df = sheets[sheet_name]
        preview_source = df

        # Para seguimiento, primero intentamos lectura horizontal del reporte SUIF.
        if safe_table_name == "seguimiento_presupuestal":
            try:
                preview_source = build_seguimiento_merged_dataframe(
                    content_bytes=content_bytes,
                    sheet_name=sheet_name,
                    df_raw_default=df,
                    target_columns=SEGUIMIENTO_TARGET_HEADERS,
                )
            except Exception:  # noqa: BLE001
                try:
                    raw_sheet_df = read_excel_sheet_raw(content_bytes, sheet_name)
                    preview_source = build_seguimiento_from_horizontal_row17(raw_sheet_df)
                except Exception:
                    preview_source = df

        preview_df = preview_source.head(20).copy()
        preview_df = preview_df.where(pd.notna(preview_df), None)
        result.append(
            {
                "sheet": sheet_name,
                "rows": int(len(preview_source)),
                "columns": [str(c) for c in preview_source.columns],
                "preview": preview_df.to_dict(orient="records"),
            }
        )

    return {
        "ok": True,
        "archivo": file.filename,
        "sheets": result,
    }


@app.post("/api/excel/upload-to-mysql")
async def upload_excel_to_mysql(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
    table_name: str | None = Form(default=None),
    if_exists: str = Form(default="replace"),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str = Form(default=DEFAULT_CONNECTION["database"] or "presupuesto"),
) -> dict[str, Any]:
    if if_exists not in {"replace", "append"}:
        raise HTTPException(status_code=400, detail="if_exists solo permite valores: replace o append")

    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df = sheets[target_sheet].copy()
    if df.empty:
        raise HTTPException(status_code=400, detail="La hoja seleccionada no tiene datos.")

    df.columns = normalize_columns([str(c) for c in df.columns])
    df = df.where(pd.notna(df), None)

    target_table = sanitize_identifier(table_name or f"{Path(file.filename).stem}_{target_sheet}")

    payload = get_form_connection_payload(host, port, user, password, database)
    engine = create_engine(build_sqlalchemy_url(payload), pool_pre_ping=True)

    try:
        df.to_sql(name=target_table, con=engine, if_exists=if_exists, index=False, chunksize=1000)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error subiendo hoja a MySQL: {exc}") from exc

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "tabla": target_table,
        "filas_cargadas": int(len(df)),
        "modo": if_exists,
        "database": database,
    }


@app.post("/api/excel/upload-to-table")
async def upload_excel_to_existing_table(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    sheet: str | None = Form(default=None),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str = Form(default=DEFAULT_CONNECTION["database"] or "presupuesto"),
) -> dict[str, Any]:
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    safe_table_name = validate_identifier(table_name, "tabla")
    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    payload = get_form_connection_payload(host, port, user, password, database)
    insertable = get_insertable_columns_with_types(payload, safe_table_name)
    max_lengths = get_insertable_column_max_lengths(payload, safe_table_name)
    target_columns = [name for name, _ in insertable]
    target_types = {name: data_type for name, data_type in insertable}

    table_key = safe_table_name.lower()

    if sheet and sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    candidate_sheets = [sheet] if sheet else list(sheets.keys())
    selected_sheet: str | None = None
    df: pd.DataFrame | None = None
    attempt_details: list[dict[str, Any]] = []

    for candidate_sheet in candidate_sheets:
        df_raw = sheets[candidate_sheet].copy()
        if df_raw.empty:
            attempt_details.append(
                {
                    "hoja": candidate_sheet,
                    "error": "La hoja no tiene datos.",
                }
            )
            continue

        strategy_errors: list[str] = []
        try:
            # Estrategia 1: parseo especializado para formatos SIA (CRP/CDP y seguimiento desde CDP).
            if table_key == "crp":
                parsed_df = build_crp_dataframe(df_raw)
                prepared_df = build_dataframe_for_existing_table(parsed_df, target_columns)
            elif table_key == "cdp":
                parsed_df = build_cdp_dataframe(df_raw)
                prepared_df = build_dataframe_for_existing_table(parsed_df, target_columns)
            elif table_key == "seguimiento_presupuestal":
                try:
                    prepared_df = build_seguimiento_merged_dataframe(
                        content_bytes=content_bytes,
                        sheet_name=candidate_sheet,
                        df_raw_default=df_raw,
                        target_columns=target_columns,
                    )
                except Exception:
                    try:
                        raw_sheet_df = read_excel_sheet_raw(content_bytes, candidate_sheet)
                        parsed_df = build_seguimiento_from_horizontal_row17(raw_sheet_df)
                    except Exception:
                        parsed_df = build_seguimiento_dataframe(df_raw)
                    prepared_df = build_dataframe_for_existing_table(parsed_df, target_columns)
            else:
                raise ValueError("tabla sin parseo especializado")
        except Exception as exc:  # noqa: BLE001
            strategy_errors.append(f"especializado: {exc}")
            try:
                # Estrategia 2: mapeo genérico por encabezados directos del Excel.
                prepared_df = build_dataframe_for_existing_table(df_raw, target_columns)
            except Exception as fallback_exc:  # noqa: BLE001
                strategy_errors.append(f"generico: {fallback_exc}")
                try:
                    # Estrategia 3: detectar fila real de encabezados cuando el Excel trae titulos arriba.
                    prepared_df = build_dataframe_from_detected_header_row(df_raw, target_columns)
                except Exception as detected_exc:  # noqa: BLE001
                    strategy_errors.append(f"detectado: {detected_exc}")
                    if table_key == "seguimiento_presupuestal":
                        try:
                            # Estrategia 4: transformar reporte EJE a esquema seguimiento.
                            from transformar_eje import build_eje_table

                            raw_sheet_df = read_excel_sheet_raw(content_bytes, candidate_sheet)
                            eje_df = build_eje_table(raw_sheet_df)
                            seguimiento_df = build_seguimiento_from_eje_table(eje_df)
                            prepared_df = build_dataframe_for_existing_table(seguimiento_df, target_columns)
                        except Exception as eje_exc:  # noqa: BLE001
                            strategy_errors.append(f"eje_transform: {eje_exc}")
                            attempt_details.append(
                                {
                                    "hoja": candidate_sheet,
                                    "errores": strategy_errors,
                                }
                            )
                            continue
                    else:
                        attempt_details.append(
                            {
                                "hoja": candidate_sheet,
                                "errores": strategy_errors,
                            }
                        )
                        continue

        selected_sheet = candidate_sheet
        df = prepared_df
        break

    if df is None or selected_sheet is None:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": f"No se pudo preparar el Excel para la tabla {safe_table_name}.",
                "intentos": attempt_details,
                "sugerencia": "Selecciona manualmente la hoja correcta en el formulario.",
            },
        )

    df = coerce_dataframe_to_table_types(df, target_types, max_lengths)

    engine = create_engine(build_sqlalchemy_url(payload), pool_pre_ping=True)
    try:
        df.to_sql(name=safe_table_name, con=engine, if_exists="append", index=False, chunksize=1000)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error cargando Excel en la tabla {safe_table_name}: {exc}") from exc

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": selected_sheet,
        "database": database,
        "tabla": safe_table_name,
        "filas_cargadas": int(len(df)),
        "columnas": target_columns,
        "mapeo": {
            "encabezados_excel_detectados": [str(c) for c in sheets[selected_sheet].columns],
            "columnas_coincidentes": df.attrs.get("matched_columns", []),
            "columnas_faltantes_rellenadas_null": df.attrs.get("missing_columns", []),
            "columnas_excel_ignoradas": df.attrs.get("extra_columns", []),
        },
    }


@app.get("/api/excel/cdp/headers")
def cdp_headers() -> dict[str, Any]:
    return {
        "ok": True,
        "tabla": "CDP",
        "database": "base_cdp",
        "headers": CDP_REQUIRED_HEADERS,
    }


@app.post("/api/excel/cdp/validate")
async def validate_cdp_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
) -> dict[str, Any]:
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df_raw = sheets[target_sheet].copy()
    cdp_df = build_cdp_dataframe(df_raw)

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "filas_validas": int(len(cdp_df)),
        "columnas_detectadas": CDP_REQUIRED_HEADERS,
        "preview": cdp_df.head(20).where(pd.notna(cdp_df), None).to_dict(orient="records"),
    }


@app.post("/api/excel/cdp/upload")
async def upload_cdp_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
    if_exists: str = Form(default="append"),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str = Form(default=DEFAULT_CONNECTION["database"] or "presupuesto"),
    table: str = Form(default="CDP"),
) -> dict[str, Any]:
    if if_exists not in {"append", "replace"}:
        raise HTTPException(status_code=400, detail="if_exists solo permite: append o replace")

    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df_raw = sheets[target_sheet].copy()
    cdp_df = build_cdp_dataframe(df_raw)
    if cdp_df.empty:
        raise HTTPException(status_code=400, detail="No hay filas validas para cargar en CDP.")

    payload = get_form_connection_payload(host, port, user, password, database)
    engine = create_engine(build_sqlalchemy_url(payload), pool_pre_ping=True)

    try:
        cdp_df.to_sql(name=table, con=engine, if_exists=if_exists, index=False, chunksize=1000)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error cargando Excel CDP a MySQL: {exc}") from exc

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "database": database,
        "tabla": table,
        "modo": if_exists,
        "filas_cargadas": int(len(cdp_df)),
        "columnas": CDP_REQUIRED_HEADERS,
    }


@app.get("/api/excel/crp/headers")
def crp_headers() -> dict[str, Any]:
    return {
        "ok": True,
        "tabla": "CRP",
        "database": "base_crp",
        "headers": CRP_REQUIRED_HEADERS,
    }


@app.post("/api/excel/crp/validate")
async def validate_crp_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
) -> dict[str, Any]:
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df_raw = sheets[target_sheet].copy()
    crp_df = build_crp_dataframe(df_raw)

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "filas_validas": int(len(crp_df)),
        "columnas_detectadas": CRP_REQUIRED_HEADERS,
        "preview": crp_df.head(20).where(pd.notna(crp_df), None).to_dict(orient="records"),
    }


@app.post("/api/excel/crp/upload")
async def upload_crp_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
    if_exists: str = Form(default="append"),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str = Form(default=DEFAULT_CONNECTION["database"] or "presupuesto"),
    table: str = Form(default="CRP"),
) -> dict[str, Any]:
    if if_exists not in {"append", "replace"}:
        raise HTTPException(status_code=400, detail="if_exists solo permite: append o replace")

    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df_raw = sheets[target_sheet].copy()
    crp_df = build_crp_dataframe(df_raw)
    if crp_df.empty:
        raise HTTPException(status_code=400, detail="No hay filas validas para cargar en CRP.")

    payload = get_form_connection_payload(host, port, user, password, database)
    engine = create_engine(build_sqlalchemy_url(payload), pool_pre_ping=True)

    try:
        crp_df.to_sql(name=table, con=engine, if_exists=if_exists, index=False, chunksize=1000)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error cargando Excel CRP a MySQL: {exc}") from exc

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "database": database,
        "tabla": table,
        "modo": if_exists,
        "filas_cargadas": int(len(crp_df)),
        "columnas": CRP_REQUIRED_HEADERS,
    }


@app.get("/api/statistics")
def get_statistics(
    host: str = DEFAULT_CONNECTION["host"],
    port: int = DEFAULT_CONNECTION["port"],
    user: str = DEFAULT_CONNECTION["user"],
    password: str = DEFAULT_CONNECTION["password"],
    database: str = DEFAULT_CONNECTION["database"] or "presupuesto",
) -> dict[str, Any]:
    """Obtener estadísticas de las tablas principales"""
    payload = ConnectionPayload(host=host, port=port, user=user, password=password, database=database)
    
    connection = get_connection(payload)
    stats = {}
    try:
        with connection.cursor() as cursor:
            for table_name in ["CDP", "CRP", "seguimiento_presupuestal"]:
                cursor.execute(f"SELECT COUNT(*) as total FROM `{table_name}` LIMIT 1")
                result = cursor.fetchone() or {}
                total = int(row_get_ci(result, "total") or 0)
                stats[table_name] = {"rows": total}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error obteniendo estadísticas: {exc}") from exc
    finally:
        connection.close()
    
    return {
        "ok": True,
        "database": database,
        "statistics": stats,
        "timestamp": pd.Timestamp.now().isoformat(),
    }


@app.post("/api/tables/{table_name}/truncate-and-load")
async def truncate_and_load_table(
    table_name: str,
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
    host: str = Form(default=DEFAULT_CONNECTION["host"]),
    port: int = Form(default=DEFAULT_CONNECTION["port"]),
    user: str = Form(default=DEFAULT_CONNECTION["user"]),
    password: str = Form(default=DEFAULT_CONNECTION["password"]),
    database: str = Form(default=DEFAULT_CONNECTION["database"] or "presupuesto"),
) -> dict[str, Any]:
    """Vaciar tabla y cargar nuevos datos desde Excel - ACTUALIZACIÓN DE DATOS"""
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel (.xlsx, .xlsm, .xls)")

    safe_table_name = validate_identifier(table_name, "tabla")
    content_bytes = await file.read()
    sheets = read_excel_bytes(content_bytes)

    target_sheet = sheet or next(iter(sheets.keys()), None)
    if not target_sheet or target_sheet not in sheets:
        raise HTTPException(status_code=400, detail="La hoja indicada no existe en el archivo Excel.")

    df = sheets[target_sheet].copy()
    if df.empty:
        raise HTTPException(status_code=400, detail="La hoja seleccionada no tiene datos.")

    payload = get_form_connection_payload(host, port, user, password, database)
    target_columns = get_insertable_columns(payload, safe_table_name)
    df = build_dataframe_for_existing_table(df, target_columns)

    engine = create_engine(build_sqlalchemy_url(payload), pool_pre_ping=True)
    try:
        with engine.begin() as conn:
            conn.exec_driver_sql(f"TRUNCATE TABLE `{safe_table_name}`")
        
        df.to_sql(name=safe_table_name, con=engine, if_exists="append", index=False, chunksize=1000)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Error truncando y cargando tabla {safe_table_name}: {exc}") from exc

    return {
        "ok": True,
        "archivo": file.filename,
        "hoja": target_sheet,
        "database": database,
        "tabla": safe_table_name,
        "accion": "truncate_and_load",
        "filas_cargadas": int(len(df)),
        "columnas": target_columns,
        "mensaje": f"Tabla {safe_table_name} vaciada y actualizada con {len(df)} registros nuevos",
    }
