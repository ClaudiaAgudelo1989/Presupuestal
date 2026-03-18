import argparse
import re
import unicodedata
from pathlib import Path

import pandas as pd


TARGET_COLUMNS = [
    "TIPO",
    "CTA",
    "SUBC",
    "OBJG",
    "ORD",
    "SORD",
    "ITEM",
    "SITEM",
    "CONCEPTO",
    "FUENTE",
    "SITUACION",
    "REC.",
    "RECURSO",
    "APROPIACION VIGENTE DEP.GSTO",
    "TOTAL CDP DEP.GSTOS",
    "APROPIACION DISPONIBLE DEP.GSTO",
    "TOTAL CDP MODIFICACION DEP.GSTOS",
    "TOTAL COMPROMISO DEP.GSTOS",
    "CDP POR COMPROMETER DEP.GSTOS",
    "TOTAL OBLIGACIONES DEP.GSTOS",
    "COMPROMISO POR OBLIGAR DEP.GSTOS",
    "TOTAL ORDENES DE PAGO DEP.GSTOS",
    "OBLIGACIONES POR ORDENAR DEP.GSTOS",
    "PAGOS DEP.GSTOS",
    "ORDENES DE PAGO POR PAGAR DEP.GSTOS",
    "TOTAL REINTEGROS DEP.GSTOS CDP",
]

BASE_COLUMNS = [
    "DEPENDENCIA DE AFECTACION DE GASTOS",
    "VALOR_DIGITAR_1",
    "VALOR_DIGITAR_2",
    *TARGET_COLUMNS,
]


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip().upper()
    if text in {"", "NAN", "NONE"}:
        return ""
    text = "".join(
        ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
    )
    text = re.sub(r"\s+", " ", text)
    return text


def compact_text(value: object) -> str:
    return re.sub(r"[^A-Z0-9]", "", normalize_text(value))


def find_dependency_value(df_raw: pd.DataFrame) -> str:
    label = "DEPENDENCIA DE AFECTACION DE GASTOS"
    for row_idx in range(df_raw.shape[0]):
        for col_idx in range(df_raw.shape[1]):
            cell = normalize_text(df_raw.iat[row_idx, col_idx])
            if label not in cell:
                continue

            candidates = []

            # Prioriza valores a la derecha en la misma fila.
            for next_col in range(col_idx + 1, min(col_idx + 8, df_raw.shape[1])):
                val = df_raw.iat[row_idx, next_col]
                if normalize_text(val):
                    candidates.append(val)

            # Si no hay valor en la misma fila, intenta en la fila siguiente.
            if not candidates and row_idx + 1 < df_raw.shape[0]:
                for next_col in range(col_idx, min(col_idx + 8, df_raw.shape[1])):
                    val = df_raw.iat[row_idx + 1, next_col]
                    if normalize_text(val):
                        candidates.append(val)

            for candidate in candidates:
                candidate_text = str(candidate).strip()
                if candidate_text:
                    return candidate_text

    raise ValueError(
        "No se encontro la etiqueta 'DEPENDENCIA DE AFECTACION DE GASTOS' o su valor asociado."
    )


def find_dependency_blocks(df_raw: pd.DataFrame) -> list[tuple[int, str]]:
    label = "DEPENDENCIA DE AFECTACION DE GASTOS"
    blocks: list[tuple[int, str]] = []

    for row_idx in range(df_raw.shape[0]):
        row_values = df_raw.iloc[row_idx].tolist()
        match_col = None

        for col_idx, value in enumerate(row_values):
            if label in normalize_text(value):
                match_col = col_idx
                break

        if match_col is None:
            continue

        dependency_value = ""

        for next_col in range(match_col + 1, df_raw.shape[1]):
            candidate = str(df_raw.iat[row_idx, next_col]).strip()
            if normalize_text(candidate):
                dependency_value = candidate
                break

        if not dependency_value and row_idx + 1 < df_raw.shape[0]:
            for next_col in range(match_col, df_raw.shape[1]):
                candidate = str(df_raw.iat[row_idx + 1, next_col]).strip()
                if normalize_text(candidate):
                    dependency_value = candidate
                    break

        if not dependency_value:
            dependency_value = "DEPENDENCIA_NO_IDENTIFICADA"

        blocks.append((row_idx, dependency_value))

    return blocks


def map_header_to_target(header_value: object) -> str | None:
    compact = compact_text(header_value)
    if not compact:
        return None

    direct_map = {
        "TIPO": "TIPO",
        "CTA": "CTA",
        "SUBC": "SUBC",
        "OBJG": "OBJG",
        "ORD": "ORD",
        "SORD": "SORD",
        "ITEM": "ITEM",
        "SITEM": "SITEM",
        "CONCEPTO": "CONCEPTO",
        "FUENTE": "FUENTE",
        "SITUACION": "SITUACION",
        "REC": "REC.",
        "RECURSO": "RECURSO",
    }
    if compact in direct_map:
        return direct_map[compact]

    patterns = [
        ("APROPIACIONVIGENTEDEPGSTO", "APROPIACION VIGENTE DEP.GSTO"),
        ("TOTALCDPDEPGSTOS", "TOTAL CDP DEP.GSTOS"),
        ("APROPIACIONDISPONIBLEDEPGSTO", "APROPIACION DISPONIBLE DEP.GSTO"),
        ("TOTALCDPMODIFICACIONDEPGSTOS", "TOTAL CDP MODIFICACION DEP.GSTOS"),
        ("TOTALCOMPROMISODEPGSTOS", "TOTAL COMPROMISO DEP.GSTOS"),
        ("CDPPORCOMPROMETERDEPGSTOS", "CDP POR COMPROMETER DEP.GSTOS"),
        ("TOTALOBLIGACIONESDEPGSTOS", "TOTAL OBLIGACIONES DEP.GSTOS"),
        ("COMPROMISOPOROBLIGARDEPGSTOS", "COMPROMISO POR OBLIGAR DEP.GSTOS"),
        ("TOTALORDENESDEPAGODEPGSTOS", "TOTAL ORDENES DE PAGO DEP.GSTOS"),
        ("OBLIGACIONESPORORDENARDEPGSTOS", "OBLIGACIONES POR ORDENAR DEP.GSTOS"),
        ("PAGOSDEPGSTOS", "PAGOS DEP.GSTOS"),
        ("ORDENESDEPAGOPORPAGARDEPGSTOS", "ORDENES DE PAGO POR PAGAR DEP.GSTOS"),
        ("TOTALREINTEGROSDEPGSTOSCDP", "TOTAL REINTEGROS DEP.GSTOS CDP"),
    ]
    for key, target in patterns:
        if key in compact:
            return target

    return None


def find_header_row(df_raw: pd.DataFrame) -> int:
    required_core = {
        "TIPO",
        "CTA",
        "SUBC",
        "OBJG",
        "ORD",
        "SORD",
        "ITEM",
        "SITEM",
        "CONCEPTO",
        "FUENTE",
        "SITUACION",
        "REC.",
        "RECURSO",
    }

    best_idx = -1
    best_hits = 0

    for idx in range(df_raw.shape[0]):
        row_values = df_raw.iloc[idx].tolist()
        hits = {map_header_to_target(cell) for cell in row_values}
        hits.discard(None)
        core_hits = len(required_core.intersection(hits))

        if core_hits > best_hits:
            best_hits = core_hits
            best_idx = idx

    if best_hits < 8:
        raise ValueError(
            "No se pudo identificar la fila de encabezados. Verifica que existan columnas como TIPO, CTA, SUBC, etc."
        )

    return best_idx


def build_eje_table(df_raw: pd.DataFrame) -> pd.DataFrame:
    dependency_blocks = find_dependency_blocks(df_raw)

    if not dependency_blocks:
        # Compatibilidad con archivos de una sola seccion sin bloques de dependencia repetidos.
        dependency_value = find_dependency_value(df_raw)
        dependency_blocks = [(0, dependency_value)]

    all_sections: list[pd.DataFrame] = []

    for block_idx, (dep_row_idx, dependency_value) in enumerate(dependency_blocks):
        next_dep_row = (
            dependency_blocks[block_idx + 1][0]
            if block_idx + 1 < len(dependency_blocks)
            else df_raw.shape[0]
        )

        header_row_idx = -1
        best_hits = 0
        search_end = min(dep_row_idx + 6, next_dep_row)

        for candidate_idx in range(dep_row_idx, search_end):
            row_values = df_raw.iloc[candidate_idx].tolist()
            hits = {map_header_to_target(cell) for cell in row_values}
            hits.discard(None)
            core_hits = len(
                {
                    "TIPO",
                    "CTA",
                    "SUBC",
                    "OBJG",
                    "ORD",
                    "SORD",
                    "ITEM",
                    "SITEM",
                    "CONCEPTO",
                    "FUENTE",
                    "SITUACION",
                    "REC.",
                    "RECURSO",
                }.intersection(hits)
            )

            if core_hits > best_hits:
                best_hits = core_hits
                header_row_idx = candidate_idx

        if header_row_idx == -1 or best_hits < 7:
            continue

        raw_headers = df_raw.iloc[header_row_idx].tolist()
        mapped_index: dict[str, int] = {}

        for col_idx, header in enumerate(raw_headers):
            target = map_header_to_target(header)
            if target and target not in mapped_index:
                mapped_index[target] = col_idx

        data = df_raw.iloc[header_row_idx + 1 : next_dep_row].copy().reset_index(drop=True)
        result = pd.DataFrame()

        result["DEPENDENCIA DE AFECTACION DE GASTOS"] = [dependency_value] * len(data)
        result["VALOR_DIGITAR_1"] = ""
        result["VALOR_DIGITAR_2"] = ""

        for target_col in TARGET_COLUMNS:
            source_idx = mapped_index.get(target_col)
            if source_idx is None:
                result[target_col] = pd.NA
            else:
                result[target_col] = data.iloc[:, source_idx]

        base_cols = ["TIPO", "CTA", "SUBC", "OBJG", "ORD", "SORD", "ITEM", "SITEM", "CONCEPTO"]
        non_empty_mask = result[base_cols].apply(
            lambda row: any(normalize_text(value) for value in row), axis=1
        )
        result = result[non_empty_mask].reset_index(drop=True)

        if not result.empty:
            all_sections.append(result)

    if not all_sections:
        raise ValueError("No se encontraron bloques de datos validos para construir EJE.")

    return pd.concat(all_sections, ignore_index=True)


def create_eje_template(output_path: Path, dependencia: str = "") -> None:
    template = pd.DataFrame(columns=BASE_COLUMNS)
    if dependencia:
        template.loc[0, "DEPENDENCIA DE AFECTACION DE GASTOS"] = dependencia
        template.loc[0, "VALOR_DIGITAR_1"] = ""
        template.loc[0, "VALOR_DIGITAR_2"] = ""

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        template.to_excel(writer, index=False, sheet_name="EJE")


def transform_file(input_path: Path, output_path: Path, sheet_name: str | None = None) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"No existe el archivo de entrada: {input_path}")

    if sheet_name:
        df_raw = pd.read_excel(input_path, sheet_name=sheet_name, header=None, dtype=object)
        eje_df = build_eje_table(df_raw)
    else:
        all_sheets = pd.read_excel(input_path, sheet_name=None, header=None, dtype=object)
        eje_df = None
        last_error = None
        for current_sheet, df_raw in all_sheets.items():
            try:
                eje_df = build_eje_table(df_raw)
                print(f"Hoja detectada automaticamente: {current_sheet}")
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        if eje_df is None:
            raise ValueError(
                "No se pudo transformar ninguna hoja del archivo. "
                "Usa --sheet para indicar la hoja correcta. "
                f"Detalle: {last_error}"
            )

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        eje_df.to_excel(writer, index=False, sheet_name="EJE")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transforma un reporte Excel de ejecucion presupuestal a una tabla plana EJE."
    )
    parser.add_argument("--input", required=False, help="Ruta del archivo Excel original.")
    parser.add_argument("--output", default="Informe presupuestal Sena.xlsx", help="Ruta del archivo de salida.")
    parser.add_argument(
        "--sheet",
        default=None,
        help="Nombre de la hoja a procesar. Si no se indica, se intenta detectar automaticamente.",
    )
    parser.add_argument(
        "--template",
        action="store_true",
        help="Crea un archivo EJE vacio con la estructura de columnas requerida.",
    )
    parser.add_argument(
        "--dependencia",
        default="",
        help="Valor para la columna 'DEPENDENCIA DE AFECTACION DE GASTOS' al crear plantilla.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = Path(args.output)

    if args.template:
        create_eje_template(output_path=output_path, dependencia=args.dependencia)
        print(f"Plantilla EJE generada en: {output_path}")
        return

    if not args.input:
        raise ValueError("Debes indicar --input cuando no usas --template.")

    input_path = Path(args.input)
    transform_file(input_path=input_path, output_path=output_path, sheet_name=args.sheet)
    print(f"Archivo transformado generado en: {output_path}")


if __name__ == "__main__":
    main()