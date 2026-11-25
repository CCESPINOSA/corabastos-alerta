let dashboard = null;
let activeSeries = "negra";

const money = (value) => new Intl.NumberFormat("es-CO", {style:"currency", currency:"COP", maximumFractionDigits:0}).format(value || 0);
const dateText = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", {day:"2-digit", month:"short", year:"numeric"}).format(new Date(`${value}T12:00:00`));
};
const datetimeText = (value) => value ? new Intl.DateTimeFormat("es-CO", {dateStyle:"medium", timeStyle:"short"}).format(new Date(value)) : "—";

function toast(text) {
  const element = document.querySelector("#toast");
  element.textContent = text;
  element.classList.add("show");
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => element.classList.remove("show"), 4600);
}

function riskClass(risk) { return risk === "Alto" ? "high" : risk === "Medio" ? "medium" : "low"; }

function renderCards(series) {
  const target = document.querySelector("#alertCards");
  target.innerHTML = Object.entries(series).map(([key, item]) => `
    <article class="alert-card">
      <div class="card-head-row">
        <span class="card-type">${key === "negra" ? "Papa negra" : "Papa criolla"}</span>
        <span class="card-model-tag">${item.modelo}</span>
      </div>
      <div class="risk-row">
        <div class="risk-value">${item.probabilidad}<small>%</small></div>
        <span class="risk-badge ${riskClass(item.riesgo)}">RIESGO ${item.riesgo.toUpperCase()}</span>
      </div>
      <div class="card-meta">
        <span>${money(item.ultimo_precio)}/kg<br><small>${dateText(item.ultima_fecha)}</small></span>
        <span>Variación 7d<br><b>${item.cambio_7d >= 0 ? "+" : ""}${item.cambio_7d}%</b></span>
        <span>Horizonte<br><b>14 días</b></span>
      </div>
    </article>`).join("");
}

function renderModels(series, key) {
  const tableBody = document.querySelector("#modelsTableBody");
  if (!tableBody) return;
  const current = series[key];
  if (!current || !current.modelos_comparativa) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay modelos calculados para esta serie.</td></tr>`;
    return;
  }
  tableBody.innerHTML = current.modelos_comparativa.map(m => {
    const metaBadge = m.cumple_meta 
      ? `<span class="badge-success">✓ Supera meta (&ge;0.60)</span>` 
      : `<span class="badge-neutral">${m.id === 'baseline' ? 'Línea Base' : 'Ajustable'}</span>`;
    const isWinner = m.id === 'logreg' ? 'class="row-highlight"' : '';
    return `
      <tr ${isWinner}>
        <td><strong>${m.nombre}</strong><br><small class="model-desc">${m.descripcion}</small></td>
        <td><code>${m.tipo}</code></td>
        <td><strong>${m.f1 != null ? m.f1.toFixed(3) : '—'}</strong></td>
        <td><strong class="${m.recall >= 0.60 ? 'stat-highlight' : ''}">${m.recall != null ? (m.recall * 100).toFixed(1) + '%' : '—'}</strong></td>
        <td>${m.precision != null ? (m.precision * 100).toFixed(1) + '%' : '—'}</td>
        <td>${m.pr_auc != null ? m.pr_auc.toFixed(3) : '—'}</td>
        <td>${m.anticipacion_media || '—'}</td>
        <td>${metaBadge}</td>
      </tr>
    `;
  }).join("");
}

function renderQuality(quality) {
  const target = document.querySelector("#qualityCards");
  if (!target || !quality) return;
  target.innerHTML = `
    <article class="quality-card">
      <h3>SIPSA Registros Escaneados</h3>
      <strong>${Number(quality.sipsa_scanned).toLocaleString("es-CO")}</strong>
      <p>Procesamiento SOAP 1.2 en streaming (DANE)</p>
    </article>
    <article class="quality-card">
      <h3>Registros Corabastos</h3>
      <strong>${Number(quality.sipsa_rows_filtered).toLocaleString("es-CO")}</strong>
      <p>Series Papa negra y criolla unificadas</p>
    </article>
    <article class="quality-card">
      <h3>Cobertura Temporal</h3>
      <strong>${quality.anios_historicos} años</strong>
      <p>${quality.cobertura_temporal}</p>
    </article>
    <article class="quality-card">
      <h3>Calidad y Faltantes</h3>
      <strong>100% limpio</strong>
      <p>0 duplicados · Interpolación de fines de semana</p>
    </article>
  `;
}

function drawChart(item) {
  if (!item || !item.series?.length) return;
  const points = item.series;
  const svg = document.querySelector("#priceChart");
  const width = 1000, height = 330, left = 0, right = 30, top = 58, bottom = 42;
  const values = points.map(p => p.precio);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max-min) * .12, 200);
  const low = Math.max(0, min-pad), high = max+pad;
  const x = i => left + i * ((width-left-right)/(points.length-1));
  const y = value => top + (high-value) * ((height-top-bottom)/(high-low));
  const d = points.map((p,i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.precio).toFixed(1)}`).join(" ");
  const area = `${d} L${x(points.length-1).toFixed(1)},${height-bottom} L${x(0).toFixed(1)},${height-bottom} Z`;
  const grid = [0, .5, 1].map(t => {
    const value = low + (high-low)*t, yy = y(value);
    return `<line class="grid-line" x1="0" y1="${width-right}" y2="${yy}"/><text class="axis-label" x="${width-right+8}" y="${yy+4}">$${Math.round(value).toLocaleString("es-CO")}</text>`;
  }).join("");
  const last = points[points.length-1];
  svg.innerHTML = `${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${d}"/><circle class="chart-point" cx="${x(points.length-1)}" cy="${y(last.precio)}" r="6"/>`;
  document.querySelector("#chartPrice").textContent = money(item.ultimo_precio);
  const change = item.cambio_7d;
  const changeElement = document.querySelector("#chartChange");
  changeElement.textContent = `${change >= 0 ? "+" : ""}${change}% en 7 días`;
  changeElement.style.color = change > 0 ? "#bb6e46" : "#5e8157";
  document.querySelector("#chartStart").textContent = dateText(points[0].fecha);
  document.querySelector("#chartEnd").textContent = dateText(last.fecha);
}

function renderRain(rain) {
  const ctx = Object.values(rain.departments || {}).filter(d => d.status === "ok").flatMap(d => d.days || []);
  const readings = ctx.reduce((sum,d) => sum + (d.lecturas || 0), 0);
  const rain7 = dashboard.series?.[activeSeries]?.rain_context?.rain_7 || 0;
  const intensity = dashboard.series?.[activeSeries]?.rain_context?.intensity || 0;
  const days = new Set(ctx.map(d => d.fecha)).size;
  document.querySelector("#rainCards").innerHTML = `
    <article class="rain-card"><h3>Lluvia Promedio (7d)</h3><strong>${rain7.toFixed(1)}<small> mm</small></strong><p>Promedio ponderado Boyacá y Cundinamarca</p></article>
    <article class="rain-card"><h3>Mayor Intensidad (14d)</h3><strong>${intensity.toFixed(1)}<small> mm</small></strong><p>Pico máximo registrado por estación</p></article>
    <article class="rain-card"><h3>Días Monitoreados</h3><strong>${days}</strong><p>Últimos 30 días de historial IDEAM</p></article>
    <article class="rain-card"><h3>Lecturas Procesadas</h3><strong>${readings.toLocaleString("es-CO")}</strong><p>Registros en Datos Abiertos Colombia</p></article>`;
}

function renderSources(data) {
  const sourceList = document.querySelector("#sourceList");
  sourceList.innerHTML = Object.values(data.sources).map(source => `
    <article class="source-item"><div><h3>${source.name}</h3><p>${source.metadata?.sipsa_updated_at ? `Última ingesta: ${datetimeText(source.metadata.sipsa_updated_at)} (${source.metadata.sipsa_records_scanned || '700k+'} registros).` : source.metadata?.rain_updated_at ? `Última consulta: ${datetimeText(source.metadata.rain_updated_at)}.` : "Fuente oficial consultada por la aplicación."}</p></div><a href="${source.url}" target="_blank" rel="noreferrer">Abrir Fuente ↗</a></article>`).join("");
}

function render(data) {
  dashboard = data;
  renderCards(data.series);
  renderModels(data.series, activeSeries);
  drawChart(data.series[activeSeries]);
  renderQuality(data.quality_report);
  renderRain(data.rain);
  renderSources(data);
  const date = data.series[activeSeries]?.ultima_fecha;
  document.querySelector("#lastOfficial").textContent = date ? `Último precio SIPSA: ${dateText(date)}` : "Sin lectura disponible";
  document.querySelector("#statusLine").innerHTML = `<span class="status-dot"></span> ${data.methodology.scope} · último registro: ${dateText(date)}`;
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/dashboard");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "No se pudo obtener el tablero");
    render(payload);
  } catch (error) {
    document.querySelector("#statusLine").innerHTML = `<span class="status-dot"></span> No fue posible leer las fuentes oficiales ahora.`;
    document.querySelector("#alertCards").innerHTML = `<div class="error-state">${error.message}. Verifique la conexión y use “Actualizar datos oficiales”.</div>`;
  }
}

// Controladores para alternar serie en modelos y gráfico
document.querySelectorAll(".segment").forEach(button => button.addEventListener("click", (e) => {
  activeSeries = button.dataset.series;
  document.querySelectorAll(`.segment[data-series="${activeSeries}"]`).forEach(b => b.classList.add("active"));
  document.querySelectorAll(`.segment:not([data-series="${activeSeries}"])`).forEach(b => b.classList.remove("active"));
  if (dashboard) {
    drawChart(dashboard.series[activeSeries]);
    renderModels(dashboard.series, activeSeries);
    renderRain(dashboard.rain);
  }
}));

document.querySelector("#refreshButton").addEventListener("click", async () => {
  const button = document.querySelector("#refreshButton");
  button.disabled = true;
  button.innerHTML = `<span class="refresh-icon">↻</span> Consultando fuentes…`;
  toast("Consultando SIPSA e IDEAM. El histórico oficial de SIPSA puede tardar unos momentos.");
  try {
    const response = await fetch("/api/refresh", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({force:true})});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Actualización fallida");
    render(payload);
    toast("Datos oficiales y modelos actualizados con éxito.");
  } catch (error) { toast(error.message); }
  finally { button.disabled=false; button.innerHTML=`<span class="refresh-icon">↻</span> Actualizar datos oficiales`; }
});

loadDashboard();
