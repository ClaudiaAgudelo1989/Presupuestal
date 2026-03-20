import argparse
from pathlib import Path

import pandas as pd

from transformar_eje import build_eje_table


DEPENDENCY_COL = "DEPENDENCIA DE AFECTACION DE GASTOS"
VIGENTE_COL = "APROPIACION VIGENTE DEP.GSTO"


def load_eje_table(input_path: Path, sheet_name: str | None = None) -> tuple[pd.DataFrame, str]:
    if not input_path.exists():
        raise FileNotFoundError(f"No existe el archivo de entrada: {input_path}")

    if sheet_name:
        df_raw = pd.read_excel(input_path, sheet_name=sheet_name, header=None, dtype=object)
        return build_eje_table(df_raw), sheet_name

    all_sheets = pd.read_excel(input_path, sheet_name=None, header=None, dtype=object)
    last_error = None

    for current_sheet, df_raw in all_sheets.items():
        try:
            return build_eje_table(df_raw), current_sheet
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    raise ValueError(
        "No se pudo transformar ninguna hoja del archivo. "
        "Usa --sheet para indicar la hoja correcta. "
        f"Detalle: {last_error}"
    )


def normalize_numeric(series: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce").fillna(0)

    cleaned = (
        series.astype(str)
        .str.replace("$", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace(",", "", regex=False)
    )
    return pd.to_numeric(cleaned, errors="coerce").fillna(0)


def build_summary(eje_df: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    if DEPENDENCY_COL not in eje_df.columns:
        raise ValueError(f"No existe la columna requerida: {DEPENDENCY_COL}")
    if VIGENTE_COL not in eje_df.columns:
        raise ValueError(f"No existe la columna requerida: {VIGENTE_COL}")

    working = eje_df.copy()
    working[DEPENDENCY_COL] = working[DEPENDENCY_COL].astype(str).str.strip()
    working = working[working[DEPENDENCY_COL] != ""]
    working[VIGENTE_COL] = normalize_numeric(working[VIGENTE_COL])

    summary = (
        working.groupby(DEPENDENCY_COL, as_index=False)[VIGENTE_COL]
        .sum()
        .sort_values(VIGENTE_COL, ascending=False)
        .reset_index(drop=True)
    )

    total = float(summary[VIGENTE_COL].sum())

    summary = summary.rename(
        columns={
            DEPENDENCY_COL: "Centro",
            VIGENTE_COL: "Apropiacion_Vigente",
        }
    )

    return summary, total


def save_outputs(summary: pd.DataFrame, total: float, output_prefix: Path, output_format: str) -> list[Path]:
    outputs: list[Path] = []

    summary_with_total = pd.concat(
        [
            summary,
            pd.DataFrame([{"Centro": "TOTAL GENERAL", "Apropiacion_Vigente": total}]),
        ],
        ignore_index=True,
    )

    if output_format in {"csv", "both"}:
        csv_path = output_prefix.with_suffix(".csv")
        summary_with_total.to_csv(csv_path, index=False, encoding="utf-8-sig")
        outputs.append(csv_path)

    if output_format in {"xlsx", "both"}:
        xlsx_path = output_prefix.with_suffix(".xlsx")
        with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
            summary.to_excel(writer, index=False, sheet_name="Resumen_por_centro")
            pd.DataFrame([{"Centro": "TOTAL GENERAL", "Apropiacion_Vigente": total}]).to_excel(
                writer, index=False, sheet_name="Total_general"
            )
        outputs.append(xlsx_path)

    return outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Genera consolidado de APROPIACION VIGENTE DEP.GSTO "
            "por centro (dependencia) y total general."
        )
    )
    parser.add_argument("--input", required=True, help="Ruta del archivo Excel EJE original.")
    parser.add_argument(
        "--output",
        default="consolidado_apropiacion_vigente",
        help="Prefijo de salida para archivos consolidados (sin extension).",
    )
    parser.add_argument(
        "--sheet",
        default=None,
        help="Nombre de la hoja a procesar. Si no se indica, se detecta automaticamente.",
    )
    parser.add_argument(
        "--format",
        choices=["csv", "xlsx", "both"],
        default="both",
        help="Formato de salida.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    output_prefix = Path(args.output)

    eje_df, used_sheet = load_eje_table(input_path=input_path, sheet_name=args.sheet)
    summary, total = build_summary(eje_df)
    outputs = save_outputs(summary=summary, total=total, output_prefix=output_prefix, output_format=args.format)

    print(f"Hoja procesada: {used_sheet}")
    print("Consolidado generado:")
    for path in outputs:
        print(f"- {path}")
    print(f"Total general: {total:,.2f}")


if __name__ == "__main__":
    main()
