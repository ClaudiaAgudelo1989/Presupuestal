from __future__ import annotations

import re

import pandas as pd
import plotly.express as px
import streamlit as st
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


st.set_page_config(page_title="Seguimiento Presupuestal", page_icon="chart_with_upwards_trend", layout="wide")


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def connect_mysql(host: str, port: int, user: str, password: str, database: str) -> Engine:
    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True)


def load_table(engine: Engine, limit: int) -> pd.DataFrame:
    query = text("SELECT * FROM `seguimientopresupuestal` LIMIT :lim")
    with engine.connect() as conn:
        return pd.read_sql(query, conn, params={"lim": limit})


def find_column(df: pd.DataFrame, pattern: str) -> str | None:
    p = normalize_name(pattern)
    for col in df.columns:
        if p in normalize_name(col):
            return col
    return None


def to_numeric(series: pd.Series) -> pd.Series:
    text_series = (
        series.fillna("")
        .astype(str)
        .str.replace("\u00a0", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    return pd.to_numeric(text_series, errors="coerce").fillna(0.0)


def money(value: float) -> str:
    return f"${value:,.0f}"


def main() -> None:
    st.markdown(
        """
        <style>
        :root {
            --sena-green: #006b4f;
            --sena-green-deep: #003d2e;
            --sena-soft: #e8f5f1;
        }

        .stApp {
            background: linear-gradient(180deg, #f7fbf9 0%, #ffffff 40%);
        }

        h1, h2, h3 {
            color: var(--sena-green-deep) !important;
        }

        section[data-testid="stSidebar"] {
            border-right: 2px solid rgba(0, 107, 79, 0.15);
        }

        div[data-testid="stMetric"] {
            border: 1px solid rgba(0, 107, 79, 0.22);
            border-radius: 12px;
            background: var(--sena-soft);
            padding: 10px 12px;
        }

        .stButton > button {
            background: linear-gradient(90deg, var(--sena-green-deep), var(--sena-green));
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
        }

        .stButton > button:hover {
            filter: brightness(1.05);
        }

        .stDownloadButton > button {
            background: linear-gradient(90deg, var(--sena-green-deep), var(--sena-green));
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.title("Dashboard de Seguimiento Presupuestal")
    st.caption("Vista especializada de la tabla seguimientopresupuestal.")

    st.sidebar.header("Conexion")
    host = st.sidebar.text_input("Host", value="localhost")
    port = st.sidebar.number_input("Puerto", min_value=1, max_value=65535, value=3306, step=1)
    user = st.sidebar.text_input("Usuario", value="root")
    password = st.sidebar.text_input("Contrasena", type="password")
    database = st.sidebar.text_input("Base", value="base_datos")
    row_limit = st.sidebar.slider("Filas a cargar", min_value=100, max_value=100000, value=15000, step=100)

    if not st.sidebar.button("Conectar y cargar", use_container_width=True):
        st.info("Configura credenciales y pulsa Conectar y cargar.")
        st.stop()

    try:
        engine = connect_mysql(host, int(port), user, password, database)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        st.error(f"No fue posible conectar: {exc}")
        st.stop()

    try:
        df = load_table(engine, row_limit)
    except Exception as exc:  # noqa: BLE001
        st.error(f"No fue posible cargar la tabla seguimientopresupuestal: {exc}")
        st.stop()

    if df.empty:
        st.warning("La tabla no tiene registros.")
        st.stop()

    col_dependencia = find_column(df, "dependencia de afectacion de gastos")
    col_fuente = find_column(df, "fuente")
    col_situacion = find_column(df, "situacion")
    col_concepto = find_column(df, "concepto")

    col_aprop = find_column(df, "apropiacionvigentedepgsto")
    col_disp = find_column(df, "apropiaciondisponibledepgsto")
    col_comp = find_column(df, "totalcompromisodepgstos")
    col_obl = find_column(df, "totalobligacionesdepgstos")
    col_pagos = find_column(df, "pagosdepgstos")

    required = [col_aprop, col_disp, col_comp, col_obl, col_pagos]
    if any(c is None for c in required):
        st.error("No se encontraron todas las columnas financieras esperadas en seguimientopresupuestal.")
        st.write("Columnas detectadas:", list(df.columns))
        st.stop()

    for c in [col_aprop, col_disp, col_comp, col_obl, col_pagos]:
        df[c] = to_numeric(df[c])

    if col_dependencia:
        df[col_dependencia] = df[col_dependencia].fillna("SIN_DATO").astype(str).str.strip()
    if col_fuente:
        df[col_fuente] = df[col_fuente].fillna("SIN_DATO").astype(str).str.strip()
    if col_situacion:
        df[col_situacion] = df[col_situacion].fillna("SIN_DATO").astype(str).str.strip()
    if col_concepto:
        df[col_concepto] = df[col_concepto].fillna("SIN_DATO").astype(str).str.strip()

    st.sidebar.header("Filtros")
    filtered = df.copy()

    if col_dependencia:
        dep_values = sorted(filtered[col_dependencia].dropna().unique().tolist())
        dep_sel = st.sidebar.multiselect("Dependencia", dep_values, default=dep_values)
        filtered = filtered[filtered[col_dependencia].isin(dep_sel)]

    if col_fuente:
        fuente_values = sorted(filtered[col_fuente].dropna().unique().tolist())
        fuente_sel = st.sidebar.multiselect("Fuente", fuente_values, default=fuente_values)
        filtered = filtered[filtered[col_fuente].isin(fuente_sel)]

    if col_situacion:
        sit_values = sorted(filtered[col_situacion].dropna().unique().tolist())
        sit_sel = st.sidebar.multiselect("Situacion", sit_values, default=sit_values)
        filtered = filtered[filtered[col_situacion].isin(sit_sel)]

    alert_threshold = st.sidebar.slider("Umbral alerta disponible (%)", min_value=1, max_value=50, value=15, step=1)

    if filtered.empty:
        st.warning("No hay datos para los filtros seleccionados.")
        st.stop()

    total_aprop = filtered[col_aprop].sum()
    total_disp = filtered[col_disp].sum()
    total_comp = filtered[col_comp].sum()
    total_obl = filtered[col_obl].sum()
    total_pagos = filtered[col_pagos].sum()

    pct_comp = (total_comp / total_aprop * 100) if total_aprop else 0
    pct_disp = (total_disp / total_aprop * 100) if total_aprop else 0

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Apropiacion vigente", money(total_aprop))
    k2.metric("Disponible", money(total_disp), f"{pct_disp:,.1f}%")
    k3.metric("Compromisos", money(total_comp), f"{pct_comp:,.1f}%")
    k4.metric("Obligaciones", money(total_obl))
    k5.metric("Pagos", money(total_pagos))

    if col_dependencia:
        group = (
            filtered.groupby(col_dependencia, as_index=False)[[col_aprop, col_disp, col_comp, col_obl, col_pagos]]
            .sum()
        )
    else:
        group = pd.DataFrame(
            {
                "Dependencia": ["TOTAL"],
                col_aprop: [total_aprop],
                col_disp: [total_disp],
                col_comp: [total_comp],
                col_obl: [total_obl],
                col_pagos: [total_pagos],
            }
        )
        col_dependencia = "Dependencia"

    group["PCT_DISPONIBLE"] = (group[col_disp] / group[col_aprop].replace(0, pd.NA) * 100).fillna(0)
    group["ALERTA"] = group["PCT_DISPONIBLE"].apply(lambda x: "CRITICA" if x <= 5 else ("ALTA" if x <= 10 else ("MEDIA" if x <= alert_threshold else "OK")))

    alerts = group[group["PCT_DISPONIBLE"] <= alert_threshold].sort_values("PCT_DISPONIBLE", ascending=True)

    st.subheader("Alertas de agotamiento")
    st.dataframe(
        alerts[[col_dependencia, col_aprop, col_disp, col_comp, col_obl, col_pagos, "PCT_DISPONIBLE", "ALERTA"]],
        use_container_width=True,
    )

    c1, c2 = st.columns(2)
    with c1:
        top = group.sort_values(col_aprop, ascending=False).head(15)
        fig1 = px.bar(top, x=col_aprop, y=col_dependencia, color=col_disp, orientation="h", title="Top dependencias por apropiacion")
        fig1.update_layout(yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig1, use_container_width=True)

    with c2:
        fig2 = px.scatter(
            group,
            x=col_comp,
            y=col_disp,
            size=col_aprop,
            color="PCT_DISPONIBLE",
            hover_name=col_dependencia,
            title="Compromiso vs disponible",
        )
        st.plotly_chart(fig2, use_container_width=True)

    if col_fuente:
        fuente_group = filtered.groupby(col_fuente, as_index=False)[col_aprop].sum()
        fig3 = px.pie(fuente_group, values=col_aprop, names=col_fuente, hole=0.45, title="Distribucion por fuente")
        st.plotly_chart(fig3, use_container_width=True)

    st.subheader("Detalle")
    st.dataframe(filtered, use_container_width=True)
    st.download_button(
        "Descargar datos filtrados (CSV)",
        data=filtered.to_csv(index=False).encode("utf-8"),
        file_name="seguimiento_presupuestal_filtrado.csv",
        mime="text/csv",
    )


if __name__ == "__main__":
    main()
