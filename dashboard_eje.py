from pathlib import Path
from datetime import date
from email.message import EmailMessage
import smtplib
import ssl

import pandas as pd
import plotly.express as px
import streamlit as st


DATA_FILE = Path("Informe presupuestal Sena.xlsx")
SHEET_NAME = "EJE"

NUMERIC_COLUMNS = [
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


def to_number(series: pd.Series) -> pd.Series:
    text = (
        series.fillna("")
        .astype(str)
        .str.replace("\u00a0", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    return pd.to_numeric(text, errors="coerce").fillna(0.0)


@st.cache_data
def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=SHEET_NAME)

    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = to_number(df[col])

    for col in ["DEPENDENCIA DE AFECTACION DE GASTOS", "FUENTE", "RECURSO", "SITUACION", "CONCEPTO"]:
        if col in df.columns:
            df[col] = df[col].fillna("SIN_DATO").astype(str).str.strip()

    if "REC." in df.columns:
        df["REC."] = df["REC."].fillna(0).astype(str)

    return df


def format_money(value: float) -> str:
    return f"${value:,.0f}"


def classify_alert_level(pct_disponible: float) -> str:
    if pct_disponible <= 5:
        return "CRITICA"
    if pct_disponible <= 10:
        return "ALTA"
    return "MEDIA"


def classify_traffic_light(pct_disponible: float) -> str:
    if pct_disponible <= 10:
        return "ROJO"
    if pct_disponible <= 25:
        return "AMARILLO"
    return "VERDE"


def send_email_alerts(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    recipients_raw: str,
    use_tls: bool,
    threshold_pct: int,
    alerts_df: pd.DataFrame,
) -> tuple[bool, str]:
    recipients = [mail.strip() for mail in recipients_raw.split(",") if mail.strip()]
    if not recipients:
        return False, "Debes indicar al menos un correo destino."
    if alerts_df.empty:
        return False, "No hay alertas con los filtros y umbral actuales."

    sender = smtp_user if smtp_user else recipients[0]

    msg = EmailMessage()
    msg["Subject"] = f"Alertas EJE - Presupuesto <= {threshold_pct}%"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)

    plain_body = (
        "Se detectaron alertas de presupuesto por agotamiento.\n\n"
        f"Umbral aplicado: <= {threshold_pct}% disponible.\n"
        f"Total dependencias en alerta: {len(alerts_df)}.\n"
        "Revisa el dashboard para detalle completo."
    )
    msg.set_content(plain_body)

    html_table = alerts_df.to_html(index=False)
    html_body = f"""
    <html>
      <body>
        <h3>Alertas EJE - Presupuesto por agotarse</h3>
        <p><b>Umbral:</b> {threshold_pct}% disponible</p>
        <p><b>Dependencias en alerta:</b> {len(alerts_df)}</p>
        {html_table}
      </body>
    </html>
    """
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=25) as server:
            if use_tls:
                server.starttls(context=ssl.create_default_context())
            if smtp_user:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        return False, f"Fallo enviando correo: {exc}"

    return True, "Correo de alertas enviado correctamente."


def main() -> None:
    st.set_page_config(page_title="Dashboard EJE", page_icon="chart_with_upwards_trend", layout="wide")
    st.title("Dashboard de Ejecucion Presupuestal - EJE")

    if not DATA_FILE.exists():
        st.error(f"No se encontro el archivo {DATA_FILE}.")
        st.stop()

    df = load_data(DATA_FILE)

    st.sidebar.header("Filtros")
    dependencias = sorted(df["DEPENDENCIA DE AFECTACION DE GASTOS"].dropna().unique().tolist())
    fuentes = sorted(df["FUENTE"].dropna().unique().tolist())
    recursos = sorted(df["RECURSO"].dropna().unique().tolist())
    situaciones = sorted(df["SITUACION"].dropna().unique().tolist())

    selected_dependencias = st.sidebar.multiselect(
        "Dependencia",
        options=dependencias,
        default=dependencias,
    )
    selected_fuentes = st.sidebar.multiselect("Fuente", options=fuentes, default=fuentes)
    selected_recursos = st.sidebar.multiselect("Recurso", options=recursos, default=recursos)
    selected_situaciones = st.sidebar.multiselect("Situacion", options=situaciones, default=situaciones)

    threshold_pct = st.sidebar.slider(
        "Alerta: disponible menor o igual a (%)",
        min_value=1,
        max_value=50,
        value=15,
        step=1,
    )

    st.sidebar.divider()
    st.sidebar.subheader("Envio de alertas por correo")
    smtp_host = st.sidebar.text_input("SMTP host", value="smtp.office365.com")
    smtp_port = st.sidebar.number_input("SMTP puerto", min_value=1, max_value=65535, value=587, step=1)
    smtp_user = st.sidebar.text_input("SMTP usuario / remitente", value="")
    smtp_password = st.sidebar.text_input("SMTP clave", type="password")
    smtp_recipients = st.sidebar.text_area("Destinatarios (separados por coma)", value="")
    smtp_use_tls = st.sidebar.checkbox("Usar STARTTLS", value=True)

    filtered = df[
        df["DEPENDENCIA DE AFECTACION DE GASTOS"].isin(selected_dependencias)
        & df["FUENTE"].isin(selected_fuentes)
        & df["RECURSO"].isin(selected_recursos)
        & df["SITUACION"].isin(selected_situaciones)
    ].copy()

    if filtered.empty:
        st.warning("No hay datos con los filtros seleccionados.")
        st.stop()

    total_aprop = filtered["APROPIACION VIGENTE DEP.GSTO"].sum()
    total_disp = filtered["APROPIACION DISPONIBLE DEP.GSTO"].sum()
    total_comp = filtered["TOTAL COMPROMISO DEP.GSTOS"].sum()
    total_obl = filtered["TOTAL OBLIGACIONES DEP.GSTOS"].sum()
    total_pagos = filtered["PAGOS DEP.GSTOS"].sum()

    pct_comprometido = (total_comp / total_aprop * 100) if total_aprop else 0
    pct_disponible = (total_disp / total_aprop * 100) if total_aprop else 0

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Apropiacion vigente", format_money(total_aprop))
    k2.metric("Disponible", format_money(total_disp), f"{pct_disponible:,.1f}%")
    k3.metric("Compromisos", format_money(total_comp), f"{pct_comprometido:,.1f}%")
    k4.metric("Obligaciones", format_money(total_obl))
    k5.metric("Pagos", format_money(total_pagos))

    st.progress(min(max(int(pct_comprometido), 0), 100), text=f"Nivel de compromiso: {pct_comprometido:,.1f}%")

    dep_group = (
        filtered.groupby("DEPENDENCIA DE AFECTACION DE GASTOS", as_index=False)[
            [
                "APROPIACION VIGENTE DEP.GSTO",
                "APROPIACION DISPONIBLE DEP.GSTO",
                "TOTAL COMPROMISO DEP.GSTOS",
                "PAGOS DEP.GSTOS",
            ]
        ]
        .sum()
    )
    dep_group["PCT_DISPONIBLE"] = (
        dep_group["APROPIACION DISPONIBLE DEP.GSTO"]
        / dep_group["APROPIACION VIGENTE DEP.GSTO"].replace(0, pd.NA)
        * 100
    ).fillna(0)
    dep_group["SEMAFORO"] = dep_group["PCT_DISPONIBLE"].apply(classify_traffic_light)

    day_of_year = max(date.today().timetuple().tm_yday, 1)
    dep_group["RITMO_DIARIO_PAGOS"] = dep_group["PAGOS DEP.GSTOS"] / day_of_year
    dep_group["DIAS_PARA_AGOTAR"] = dep_group.apply(
        lambda row: (
            row["APROPIACION DISPONIBLE DEP.GSTO"] / row["RITMO_DIARIO_PAGOS"]
            if row["RITMO_DIARIO_PAGOS"] > 0
            else pd.NA
        ),
        axis=1,
    )
    dep_group["FECHA_PROY_AGOTAMIENTO"] = pd.to_datetime(date.today()) + pd.to_timedelta(
        dep_group["DIAS_PARA_AGOTAR"], unit="D"
    )

    alerts = dep_group[dep_group["PCT_DISPONIBLE"] <= threshold_pct].copy()
    alerts["NIVEL_ALERTA"] = alerts["PCT_DISPONIBLE"].apply(classify_alert_level)
    alerts = alerts.sort_values("PCT_DISPONIBLE", ascending=True)

    st.subheader("Alertas por agotamiento de presupuesto")
    st.caption("Regla: alerta cuando % disponible por dependencia es menor o igual al umbral configurado.")

    if st.sidebar.button("Enviar alertas por correo", use_container_width=True):
        ok, message = send_email_alerts(
            smtp_host=smtp_host,
            smtp_port=int(smtp_port),
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            recipients_raw=smtp_recipients,
            use_tls=smtp_use_tls,
            threshold_pct=threshold_pct,
            alerts_df=alerts[
                [
                    "DEPENDENCIA DE AFECTACION DE GASTOS",
                    "SEMAFORO",
                    "PCT_DISPONIBLE",
                    "NIVEL_ALERTA",
                    "APROPIACION VIGENTE DEP.GSTO",
                    "APROPIACION DISPONIBLE DEP.GSTO",
                    "TOTAL COMPROMISO DEP.GSTOS",
                    "PAGOS DEP.GSTOS",
                    "FECHA_PROY_AGOTAMIENTO",
                ]
            ],
        )
        if ok:
            st.sidebar.success(message)
        else:
            st.sidebar.error(message)

    st.dataframe(
        alerts[
            [
                "DEPENDENCIA DE AFECTACION DE GASTOS",
                "SEMAFORO",
                "APROPIACION VIGENTE DEP.GSTO",
                "APROPIACION DISPONIBLE DEP.GSTO",
                "TOTAL COMPROMISO DEP.GSTOS",
                "PAGOS DEP.GSTOS",
                "PCT_DISPONIBLE",
                "NIVEL_ALERTA",
                "FECHA_PROY_AGOTAMIENTO",
            ]
        ],
        use_container_width=True,
    )

    st.subheader("Semaforo por dependencia")
    semaforo_view = dep_group[
        [
            "DEPENDENCIA DE AFECTACION DE GASTOS",
            "SEMAFORO",
            "PCT_DISPONIBLE",
            "APROPIACION VIGENTE DEP.GSTO",
            "APROPIACION DISPONIBLE DEP.GSTO",
            "TOTAL COMPROMISO DEP.GSTOS",
            "PAGOS DEP.GSTOS",
            "FECHA_PROY_AGOTAMIENTO",
        ]
    ].sort_values("PCT_DISPONIBLE", ascending=True)
    st.dataframe(
        semaforo_view,
        use_container_width=True,
    )

    st.subheader("Proyeccion de agotamiento")
    st.caption(
        "Metodo: fecha estimada usando ritmo diario de pagos acumulados del ano (PAGOS / dia del ano)."
    )
    proy_view = dep_group[
        [
            "DEPENDENCIA DE AFECTACION DE GASTOS",
            "RITMO_DIARIO_PAGOS",
            "APROPIACION DISPONIBLE DEP.GSTO",
            "DIAS_PARA_AGOTAR",
            "FECHA_PROY_AGOTAMIENTO",
            "SEMAFORO",
        ]
    ].sort_values("DIAS_PARA_AGOTAR", ascending=True, na_position="last")
    st.dataframe(proy_view, use_container_width=True)

    fig_forecast = px.bar(
        proy_view.dropna(subset=["DIAS_PARA_AGOTAR"]).head(15),
        x="DIAS_PARA_AGOTAR",
        y="DEPENDENCIA DE AFECTACION DE GASTOS",
        color="SEMAFORO",
        orientation="h",
        title="Dependencias con menor horizonte de presupuesto (dias)",
    )
    fig_forecast.update_layout(yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig_forecast, use_container_width=True)

    c1, c2 = st.columns(2)
    with c1:
        top_dep = dep_group.sort_values("APROPIACION VIGENTE DEP.GSTO", ascending=False).head(12)
        fig_dep = px.bar(
            top_dep,
            x="APROPIACION VIGENTE DEP.GSTO",
            y="DEPENDENCIA DE AFECTACION DE GASTOS",
            color="APROPIACION DISPONIBLE DEP.GSTO",
            orientation="h",
            title="Top dependencias por apropiacion vigente",
            labels={"APROPIACION VIGENTE DEP.GSTO": "Apropiacion", "DEPENDENCIA DE AFECTACION DE GASTOS": "Dependencia"},
        )
        fig_dep.update_layout(yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig_dep, use_container_width=True)

    with c2:
        fuente_group = filtered.groupby("FUENTE", as_index=False)["APROPIACION VIGENTE DEP.GSTO"].sum()
        fig_fuente = px.pie(
            fuente_group,
            values="APROPIACION VIGENTE DEP.GSTO",
            names="FUENTE",
            hole=0.45,
            title="Distribucion por fuente",
        )
        st.plotly_chart(fig_fuente, use_container_width=True)

    fig_scatter = px.scatter(
        dep_group,
        x="TOTAL COMPROMISO DEP.GSTOS",
        y="APROPIACION DISPONIBLE DEP.GSTO",
        size="APROPIACION VIGENTE DEP.GSTO",
        color="PCT_DISPONIBLE",
        hover_name="DEPENDENCIA DE AFECTACION DE GASTOS",
        title="Compromiso vs disponible por dependencia",
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

    st.subheader("Detalle filtrado")
    st.dataframe(filtered, use_container_width=True)

    st.download_button(
        "Descargar datos filtrados (CSV)",
        data=filtered.to_csv(index=False).encode("utf-8"),
        file_name="EJE_filtrado_dashboard.csv",
        mime="text/csv",
    )


if __name__ == "__main__":
    main()