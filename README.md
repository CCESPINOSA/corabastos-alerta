# Alerta Papa Corabastos

Prototipo de alerta temprana para precios de **Papa negra** y **Papa criolla** en **Corabastos (Bogotá)** con procesamiento de datos del **SIPSA (DANE)** y precipitación del **IDEAM**.

Desarrollado según el anteproyecto académico:
- **Documento:** `Corabastos_Joven_Espinosa_Pinzon.pdf`
- **Asignatura:** Ciencia de Datos y Big Data
- **Institución:** Facultad de Sistemas, ETITC
- **Docente:** Karen Paola Martínez Orjuela
- **Integrantes:**
  - Cristian Camilo Espinosa Rojas (1233689627)
  - Michael Alexander Pinzón Villalobos (1032472871)
  - Juan Esteban Joven Isaza (1018506083)

---

## Ejecución Rápida en Windows (.bat)

Simplemente haga doble clic en:
```
ejecutar.bat
```
(o `run.bat`). El script detectará automáticamente el intérprete de Python en Windows, iniciará el servidor Uvicorn en `http://127.0.0.1:8000` y abrirá su navegador web predeterminado.

---

## Requisitos y Dependencias

- **Python 3.10+** (probado y verificado en Python 3.14)
- Paquetes principales (`requirements.txt`):
  - `fastapi`
  - `uvicorn[standard]`
  - `requests`
  - `pandas`
  - `numpy`
  - `scikit-learn`
  - `lxml`

---

## Componentes del Proyecto (Metodología CRISP-DM)

1. **Semana 1 - Ingesta y Calidad (Big Data):**
   - Ingesta en streaming (XML iterparse) desde el servicio SOAP 1.2 oficial del SIPSA (`promediosSipsaParcial`).
   - Más de 714.000 registros históricos escaneados (2020 a 2026).
   - Ingesta paginada del IDEAM (Datos Abiertos Colombia) con lecturas de precipitación en Cundinamarca y Boyacá.
   - Reporte de calidad: 0 duplicados, imputación temporal para fines de semana no cubiertos por boletines.

2. **Semana 2 - Variables y Feature Engineering:**
   - Retornos relativos a 1, 7 y 14 días.
   - Medias móviles (7d, 30d) y tendencias.
   - Volatilidad histórica del precio a 14 días.
   - Estacionalidad de calendario (mes del año, día de la semana).
   - Variables de contexto climático: lluvia promedio a 7 días e intensidad máxima a 14 días.

3. **Semana 3 - Modelado y Evaluación:**
   - **Variable objetivo:** Pico = alza de precio superior al 20% en ventana de 14 días.
   - **Validación:** Walk-forward temporal (sin data leakage del futuro).
   - **Modelos comparados:**
     1. *Línea Base (Persistencia):* Regla de inercia y tendencia reciente.
     2. *Regresión Logística:* Regularizada con pesos balanceados y umbral calibrado (alcanza Recall >= 0.60 y F1 superior a la línea base).
     3. *Gradient Boosting:* Árboles potenciados por gradiente tipo XGBoost.

4. **Semana 4 - Tablero y Despliegue:**
   - Tablero interactivo responsivo con riesgo por serie a 14 días.
   - Gráfico SVG de precios con últimos 180 registros.
   - Tabla comparativa de modelos con métricas (F1, Recall, Precision, PR-AUC, Anticipación media).
   - Monitoreo meteorológico IDEAM.
   - Botón de actualización directa contra los servicios web oficiales del DANE e IDEAM.
