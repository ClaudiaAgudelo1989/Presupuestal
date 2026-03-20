import argparse
from pathlib import Path

import pandas as pd


EJE_COLUMNS = [
    "RUBRO",
    "DEPENDENCIA",
    "FUENTE",
    "APROPIACION VIGENTE DEP.GSTO",
]

CDP_COLUMNS = ["Rubro", "Dependencia", "Fuente", "Valor Actual"]
CRP_COLUMNS = ["Rubro", "Dependencia", "Fuente", "Valor Actual"]

KEYS_EJE = ["RUBRO", "DEPENDENCIA", "FUENTE"]
KEYS_OTHER = ["Rubro", "Dependencia", "Fuente"]


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.astype(str).str.strip()
    return df


def ensure_columns(df: pd.DataFrame, required: list[str], source_name: str) -> None:
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(
            f"El archivo {source_name} no contiene las columnas requeridas: {missing}"
        )


def normalize_keys(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    df = df.copy()
    for col in columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()
            .str.upper()
            .replace({"NAN": "", "NONE": ""})
        )
    return df


def to_number(series: pd.Series) -> pd.Series:
    # Limpia formatos comunes de moneda (puntos, comas y espacios) antes de convertir.
    cleaned = (
        series.astype(str)
        .str.replace(" ", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    return pd.to_numeric(cleaned, errors="coerce").fillna(0)


def build_consolidated_df(
    eje_path: Path,
    cdp_path: Path,
    crp_path: Path,
) -> pd.DataFrame:
    eje = pd.read_excel(eje_path)
    cdp = pd.read_excel(cdp_path)
    crp = pd.read_excel(crp_path)

    eje = normalize_columns(eje)
    cdp = normalize_columns(cdp)
    crp = normalize_columns(crp)

    ensure_columns(eje, EJE_COLUMNS, str(eje_path))
    ensure_columns(cdp, CDP_COLUMNS, str(cdp_path))
    ensure_columns(crp, CRP_COLUMNS, str(crp_path))

    eje = eje[EJE_COLUMNS].copy()
    cdp = cdp[CDP_COLUMNS].copy()
    crp = crp[CRP_COLUMNS].copy()

    cdp = cdp.rename(columns={"Valor Actual": "valor_cdp"})
    crp = crp.rename(columns={"Valor Actual": "valor_crp"})

    eje = normalize_keys(eje, KEYS_EJE)
    cdp = normalize_keys(cdp, KEYS_OTHER)
    crp = normalize_keys(crp, KEYS_OTHER)

    eje["APROPIACION VIGENTE DEP.GSTO"] = to_number(eje["APROPIACION VIGENTE DEP.GSTO"])
    cdp["valor_cdp"] = to_number(cdp["valor_cdp"])
    crp["valor_crp"] = to_number(crp["valor_crp"])

    df = eje.merge(cdp, left_on=KEYS_EJE, right_on=KEYS_OTHER, how="left")
    df = df.merge(crp, left_on=KEYS_EJE, right_on=KEYS_OTHER, how="left")

    grouped = (
        df.groupby(KEYS_EJE, dropna=False)
        .agg(
            {
                "APROPIACION VIGENTE DEP.GSTO": "sum",
                "valor_cdp": "sum",
                "valor_crp": "sum",
            }
        )
        .reset_index()
    )

    grouped["disponible_real"] = (
        grouped["APROPIACION VIGENTE DEP.GSTO"] - grouped["valor_cdp"]
    )
    grouped["por_comprometer"] = grouped["valor_cdp"] - grouped["valor_crp"]

    return grouped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Consolida EJE, CDP y CRP por RUBRO/DEPENDENCIA/FUENTE."
    )
    parser.add_argument("--eje", default="eje.xlsx", help="Ruta del archivo EJE")
    parser.add_argument("--cdp", default="cdp.xlsx", help="Ruta del archivo CDP")
    parser.add_argument("--crp", default="crp.xlsx", help="Ruta del archivo CRP")
    parser.add_argument(
        "--output",
        default="consolidado_eje_cdp_crp.xlsx",
        help="Ruta de salida (xlsx o csv)",
    )
    return parser.parse_args()


def save_output(df: pd.DataFrame, output_path: Path) -> None:
    suffix = output_path.suffix.lower()
    if suffix == ".csv":
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        return

    df.to_excel(output_path, index=False)


def main() -> None:
    args = parse_args()

    output_path = Path(args.output)
    consolidated = build_consolidated_df(
        eje_path=Path(args.eje),
        cdp_path=Path(args.cdp),
        crp_path=Path(args.crp),
    )

    save_output(consolidated, output_path)

    print("Consolidacion completada.")
    print(f"Filas resultantes: {len(consolidated)}")
    print(f"Archivo generado: {output_path}")
    print(consolidated.head())


if __name__ == "__main__":
    main()