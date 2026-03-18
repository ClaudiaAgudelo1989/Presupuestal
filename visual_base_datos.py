from __future__ import annotations
import pandas as pd
import plotly.express as px
import streamlit as st
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import Any

# Configuración de página
st.set_page_config(page_title="Gestor Presupuestal MySQL", page_icon="📈", layout="wide")

def get_engine(host: str, port: int, user: str, password: str, database: str) -> Engine:
    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True)

def get_tables(engine: Engine, database: str) -> list[str]:
    query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = :db")
    with engine.connect() as conn:
        rows = conn.execute(query, {"db": database}).fetchall()
    return [r[0] for r in rows]

def main() -> None:
    st.title("📂 Entorno de Gestión: MySQL Workbench + Streamlit")
    
    # --- BARRA LATERAL: CONEXIÓN ---
    st.sidebar.header("1. Conexión a MySQL")
    host = st.sidebar.text_input("Host", value="localhost")
    port = st.sidebar.number_input("Puerto", value=3306)
    user = st.sidebar.text_input("Usuario", value="root")
    password = st.sidebar.text_input("Contraseña", type="password")
    database = st.sidebar.text_input("Base de Datos", value="base_cdp")

    if "engine" not in st.session_state:
        st.session_state.engine = None

    if st.sidebar.button("Conectar / Refrescar"):
        try:
            st.session_state.engine = get_engine(host, port, user, password, database)
            with st.session_state.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            st.sidebar.success(f"Conectado a: {database}")
        except Exception as e:
            st.sidebar.error(f"Error: {e}")

    if st.session_state.engine is None:
        st.info("Por favor, conéctate a la base de datos en la barra lateral.")
        st.stop()

    engine = st.session_state.engine
    tables = get_tables(engine, database)

    # --- BARRA LATERAL: CARGA DE EXCEL ---
    st.sidebar.markdown("---")
    st.sidebar.header("2. Cargar Datos (Excel)")
    if tables:
        target_table = st.sidebar.selectbox("Tabla destino", options=tables)
        uploaded_file = st.sidebar.file_uploader("Selecciona un archivo Excel", type=["xlsx", "xls"])
        
        if uploaded_file and st.sidebar.button("🚀 Subir a Workbench"):
            try:
                # Leer Excel
                df_to_upload = pd.read_excel(uploaded_file)
                
                # LIMPIEZA AUTOMÁTICA DE COLUMNAS:
                # Esto convierte "Numero Documento" en "numero_documento" para que coincida con tu SQL
                df_to_upload.columns = [
                    str(c).strip().lower().replace(" ", "_").replace(".", "") 
                    for c in df_to_upload.columns
                ]
                
                # Cargar a MySQL
                df_to_upload.to_sql(target_table, con=engine, if_exists='append', index=False)
                st.sidebar.success(f"Se cargaron {len(df_to_upload)} registros en {target_table}")
            except Exception as e:
                st.sidebar.error(f"Error al cargar: {e}")
    else:
        st.sidebar.warning("No hay tablas en esta base de datos.")

    # --- CUERPO PRINCIPAL: VISUALIZACIÓN ---
    if tables:
        selected_table = st.selectbox("Selecciona tabla para visualizar", options=tables)
        df = pd.read_sql(text(f"SELECT * FROM `{selected_table}` LIMIT 5000"), engine.connect())
        
        st.subheader(f"Datos en: {selected_table}")
        st.dataframe(df, use_container_width=True)

        # Indicadores Rápidos
        c1, c2 = st.columns(2)
        if not df.empty:
            # Buscar columnas numéricas para sumar (ej. valor_actual)
            num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            if num_cols:
                col_sum = c1.selectbox("Sumar columna:", num_cols)
                total = df[col_sum].sum()
                c2.metric(f"Total {col_sum}", f"${total:,.2f}")
                
                # Gráfico rápido
                fig = px.bar(df.head(50), y=col_sum, title=f"Top 50 Registros - {col_sum}")
                st.plotly_chart(fig, use_container_width=True)
    else:
        st.error("Crea las tablas en MySQL Workbench primero.")

if __name__ == "__main__":
    main()