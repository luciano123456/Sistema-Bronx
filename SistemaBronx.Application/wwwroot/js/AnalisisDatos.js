/* =======================================================================
 * AnalisisDatos Dashboard v5.2  (full)
 * ======================================================================= */

const $id = s => document.getElementById(s);
const fmtMon = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtInt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(n || 0));
const fmtPct = n => (n === null || n === undefined) ? '—' : `${Number(n).toFixed(1)}%`;
const safe = a => Array.isArray(a) ? a : [];
const C = { grid: 'rgba(255,255,255,.07)', tick: 'rgba(255,255,255,.65)', text: '#e7e9fb' };

let CH = {};
let flat = null;
let rango = { desde: null, hasta: null, label: 'Últimos 30 días' };
let DATE_PORTAL = null, PANEL_MOVED = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    /* ====== Defaults globales de Chart.js ======
       -> hace visibles los “recuadros” de las barras en dark */
    if (window.Chart) {
        Chart.defaults.color = C.text;
        Chart.defaults.font.family = 'system-ui,-apple-system,Segoe UI,Roboto';
        Chart.defaults.elements.bar.borderWidth = 1.2;
        Chart.defaults.elements.bar.borderColor = 'rgba(255,255,255,0.18)';
        Chart.defaults.elements.bar.borderSkipped = false;
        Chart.defaults.elements.bar.hoverBorderWidth = 1.2;
        Chart.defaults.elements.bar.hoverBorderColor = 'rgba(255,255,255,0.28)';
        // grids más sutiles para que el borde destaque
        Chart.defaults.scale.grid.color = C.grid;
        Chart.defaults.scale.ticks.color = C.tick;
    }

    // Flatpickr
    flat = flatpickr('#ad-flatpickr', {
        mode: 'range', dateFormat: 'd/m/Y', locale: 'es', allowInput: true,
        appendTo: $id('ad-date-panel'), static: true, zIndex: 2147483647,
        onClose: (sel) => { if (sel.length === 2) setCustom(sel[0], sel[1]); }
    });

    // Chips rango
    document.querySelectorAll('#ad-chips .chip').forEach(ch =>
        ch.addEventListener('click', () => chipClick(ch))
    );

    $id('ad-date-pill').addEventListener('click', () => togglePanel(true));
    $id('ad-cancel').addEventListener('click', () => togglePanel(false));
    $id('ad-apply').addEventListener('click', () => { togglePanel(false); consultar(); });

    document.addEventListener('click', (e) => {
        const panel = $id('ad-date-panel'), pill = $id('ad-date-pill');
        if (!panel || panel.hidden) return;
        if (!panel.contains(e.target) && !pill.contains(e.target)) togglePanel(false);
    });

    await cargarClientes();

    $id('btnConsultar').addEventListener('click', consultar);
    $id('btnExportar').addEventListener('click', exportarPDF);

    setPreset(30);
    consultar();

    // Paginadores
    document.querySelectorAll('.ad-pager').forEach(pg => {
        const key = pg.getAttribute('data-for');
        pg.querySelector('.prev').addEventListener('click', () => turnPage(key, -1));
        pg.querySelector('.next').addEventListener('click', () => turnPage(key, +1));
    });
}

/* ===================== Clientes (Select2) ===================== */
async function cargarClientes() {
    try {
        const res = await fetch('/Clientes/Lista');
        if (!res.ok) throw new Error('Error al obtener clientes');
        const data = await res.json();

        const sl = $('#filtroCliente');
        sl.empty();

        // Siempre “Todos” por defecto
        sl.append(new Option('Todos', '', true, true));

        safe(data).forEach(c => {
            sl.append(new Option(c.Nombre || '(Sin nombre)', c.Id));
        });

        sl.select2({
            width: '260px',
            placeholder: 'Todos',
            allowClear: true,
            theme: 'default',
            dropdownCssClass: 'select2-dark'
        });

        // Reafirmar estilos blancos (por si algún tema pisa)
        $('.select2-dark .select2-results__option').css({ 'color': '#fff', 'background': 'transparent' });
        $('.select2-dark .select2-results__option--highlighted').css({ 'background': '#26346e', 'color': '#fff' });

        // Valor inicial: Todos
        sl.val('').trigger('change');
    } catch (err) {
        console.error('Error al cargar clientes:', err);
    }
}

/* ====================== Filtros ====================== */
function getFiltros() {
    const toIsoNoZ = (d, end = false) => {
        if (!d) return null;
        const dt = new Date(d);
        if (end) { dt.setHours(23, 59, 59, 0); } else { dt.setHours(0, 0, 0, 0); }
        const pad = x => String(x).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    };
    return {
        desde: toIsoNoZ(rango.desde, false),
        hasta: toIsoNoZ(rango.hasta || rango.desde, true),
        idCliente: $('#filtroCliente').val() || null,
        topN: Number($id('filtroTopN').value || 10)
    };
}

/* ==================== Fechas / Presets ==================== */
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function setPreset(key) {
    const now = new Date();
    let start = now;
    let end = now;
    let label = '';

    // Usar una sola cadena de if / else if
    if (String(key) === '1') {
        // Hoy: desde hoy
        start = now;
        label = 'Hoy';
    } else if (String(key) === '7') {
        // Últimos 7 días (incluye hoy)
        start = addDays(now, -6);
        label = 'Últimos 7 días';
    } else if (String(key) === '90') {
        start = addDays(now, -89);
        label = 'Últimos 90 días';
    } else if (key === 'ytd') {
        start = new Date(now.getFullYear(), 0, 1);
        label = 'Year to date';
    } else if (key === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        label = 'Este año';
    } else {
        // Últimos 30 días (por defecto)
        start = addDays(now, -29);
        label = 'Últimos 30 días';
    }

    // Guardamos rango (getFiltros ya normaliza a 00:00 y 23:59)
    rango = { desde: start, hasta: end, label };
    $id('ad-date-text').textContent = label;

    // Estado visual de chips
    document.querySelectorAll('#ad-chips .chip')
        .forEach(c => c.classList.toggle('active', c.dataset.range === String(key)));
}

function setCustom(a, b) {
    rango = { desde: a, hasta: b, label: `${moment(a).format('DD/MM/YYYY')} a ${moment(b).format('DD/MM/YYYY')}` };
    $id('ad-date-text').textContent = rango.label;
    document.querySelectorAll('#ad-chips .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#ad-chips .chip[data-range="custom"]')?.classList.add('active');
}
function chipClick(chip) {
    const k = chip.dataset.range;
    if (k === 'custom') {
        const end = new Date(); const start = addDays(end, -29);
        flat.setDate([start, end], true);
    } else {
        setPreset(k); togglePanel(false); consultar();
    }
}

/* ============ Portal/Overlay del panel de fechas ============ */
function ensurePortal() {
    if (!DATE_PORTAL) {
        DATE_PORTAL = document.createElement('div');
        DATE_PORTAL.className = 'ad-overlay-root';
        document.body.appendChild(DATE_PORTAL);
    }
}
function togglePanel(show) {
    const panel = $id('ad-date-panel'), pill = $id('ad-date-pill');
    if (!show) { if (panel) panel.hidden = true; return; }
    ensurePortal();
    if (!PANEL_MOVED) { DATE_PORTAL.appendChild(panel); PANEL_MOVED = true; }
    panel.hidden = false; panel.style.opacity = '0'; panel.style.left = '0px'; panel.style.top = '0px';
    const r = pill.getBoundingClientRect(), gutter = 8, desiredW = 520;
    const panelW = Math.min(desiredW, window.innerWidth - gutter * 2); panel.style.width = panelW + 'px';
    const panelH = panel.offsetHeight || 380;
    let left = r.left, top = r.bottom + gutter;
    if (left + panelW > window.innerWidth - gutter) left = Math.max(gutter, window.innerWidth - panelW - gutter);
    if (top + panelH > window.innerHeight - gutter) top = Math.max(gutter, r.top - panelH - gutter);
    panel.style.left = `${left}px`; panel.style.top = `${top}px`; panel.style.opacity = '1';
}

/* ===================== Backend / Datos ===================== */
async function consultar() {
    toggleBtn(true);
    try {
        const { desde, hasta, idCliente, topN } = getFiltros();
        const url = new URL('/AnalisisDatos/Datos', window.location.origin);
        if (desde) url.searchParams.set('desde', desde);
        if (hasta) url.searchParams.set('hasta', hasta);
        if (idCliente) url.searchParams.set('idCliente', idCliente);
        url.searchParams.set('topN', isNaN(topN) ? 10 : topN);

        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Error consultando dashboard');
        const vm = await res.json();
        render(vm);
    } catch (e) {
        console.error(e); alert('Ocurrió un error al consultar.');
    } finally { toggleBtn(false); }
}
function toggleBtn(b) {
    const btn = $id('btnConsultar');
    btn.disabled = b;
    btn.innerHTML = b
        ? `<span class="spinner-border spinner-border-sm me-2"></span>Consultando...`
        : `<i class="ti ti-search me-1"></i> Consultar`;
}

/* ========================= Render ========================= */
function pick(obj, a, b) { return obj?.[a] ?? obj?.[b] ?? 0; }

function render(vm) {
    const k = vm?.Kpis || {};
    const mensual = vm?.Mensual || [];

    // KPIs
    const ingresos = pick(k, 'IngresosImporteTotal', 'VentasImporteTotal') || pick(k, 'IngresosSubTotal', 'VentasSubTotal');
    const egresos = pick(k, 'EgresosImporteTotal', 'GastosImporteTotal');
    const cantPed = pick(k, 'CantidadPedidos', 'CantidadTickets');
    const cantUnid = pick(k, 'CantidadUnidades', 'CantidadItems');
    const margenN = pick(k, 'MargenNeto', 'MargenNetoValor');
    // const margenNP = (k.MargenNetoPct ?? k.MargenNetoPorc ?? null);

    $id('kpi_ingresos').textContent = fmtMon(ingresos);
    $id('kpi_egresos').textContent = fmtMon(egresos);
    $id('kpi_pedidos_unidades').textContent = `${fmtInt(cantPed)} / ${fmtInt(cantUnid)}`;
    $id('kpi_margen').textContent = `${fmtMon(margenN)}`;
    // $id('kpi_margen').textContent = `${fmtMon(margenN)} (${fmtPct(margenNP)})`;

    // Charts
    renderEvolucion(mensual);
    renderMedios(vm?.MediosPago || []);
    renderCrecimiento(vm?.Crecimiento || []);
    renderInteranual(vm?.Interanual || []);
    renderMargenes(mensual);
    renderCostosMedio(vm?.MediosPago || []);

    renderTopBars('ch_topMas', 'Más vendidos', vm?.TopMasVendidos || [], r => r.CantidadVendida);
    renderTopBars('ch_topMenos', 'Menos vendidos', vm?.TopMenosVendidos || [], r => r.CantidadVendida);
    renderTopBars('ch_topRentables', 'Más rentables', vm?.TopMasRentables || [], r => (r.MargenBruto || 0));
    renderTopBars('ch_topMenosRentables', 'Menos rentables', vm?.TopMenosRentables || [], r => (r.MargenBruto || 0));

    renderGroupBars('ch_categoria', vm?.PorCategoria || [], g => g.GrupoNombre, g => g.MargenBruto);
    renderGroupBars('ch_proveedor', vm?.PorProveedor || [], g => g.GrupoNombre, g => g.MargenBruto);
    syncHeights('ch_categoria', 'ch_proveedor');

}

/* ==================== Chart helpers ==================== */
function oBase() {
    return {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: C.text,
                    boxWidth: 10,     // más chico
                    boxHeight: 10,
                    padding: 10,
                    usePointStyle: false
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15,20,38,.95)',
                titleColor: '#fff',
                bodyColor: '#cdd4ff',
                padding: 8,        // antes 12
                borderColor: 'rgba(255,255,255,.10)',
                borderWidth: 1,
                cornerRadius: 8,
                caretSize: 5,
                titleFont: { size: 11 },
                bodyFont: { size: 11 }
            }
        },
        scales: {
            x: { grid: { color: C.grid }, ticks: { color: C.tick } },
            y: { grid: { color: C.grid }, ticks: { color: C.tick } }
        }
    };
}

function kill(key) { if (CH[key]) { CH[key].destroy(); CH[key] = null; } }

/* ======================= Charts ======================= */
function renderEvolucion(rows) {
    const id = 'ch_linea'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    const ventas = data.map(r => +r.Ingresos || 0);
    const costos = data.map(r => +r.CostoMercaderia || 0);
    const mBruto = data.map(r => +r.MargenBruto || 0);

    CH[id] = new Chart($id(id), {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Ventas', data: ventas, tension: .35, borderWidth: 2, fill: false },
                { label: 'Costos', data: costos, tension: .35, borderWidth: 2, fill: false },
                { label: 'Margen bruto', data: mBruto, tension: .35, borderWidth: 2, fill: false }
            ]
        },
        options: oBase()
    });
}
function renderMedios(rows) {
    const id = 'ch_medios'; kill(id);
    const labels = rows.map(r => r.FormaPago ?? 'N/D');
    const data = rows.map(r => +r.MontoSubTotal || 0);
    CH[id] = new Chart($id(id), {
        type: 'doughnut',
        data: { labels, datasets: [{ data }] },
        options: { ...oBase(), cutout: '60%' }
    });
}
function renderCrecimiento(rows) {
    const id = 'ch_crecimiento'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    CH[id] = new Chart($id(id), {
        type: 'bar',
        data: {
            labels, datasets: [
                { label: 'Pedidos', data: data.map(r => +r.CantidadPedidos || 0) },
                { label: 'Unidades', data: data.map(r => +r.CantidadUnidades || 0) }
            ]
        },
        options: oBase()
    });
}
function renderInteranual(rows) {
    const id = 'ch_interanual'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => moment(r.Periodo).format('YYYY-MM'));
    const actual = data.map(r => +r.VentaActualMes || 0);
    const prev = data.map(r => +r.VentaMismoMesAnioAnterior || +r.VentaMismoMesAñoAnterior || 0);
    CH[id] = new Chart($id(id), {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Año actual', data: actual, tension: .35, borderWidth: 2, fill: false },
                { label: 'Año anterior', data: prev, tension: .35, borderDash: [6, 6], borderWidth: 2, fill: false }
            ]
        },
        options: oBase()
    });
}
function renderMargenes(rows) {
    const id = 'ch_margenes'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    CH[id] = new Chart($id(id), {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Margen bruto', data: data.map(r => +r.MargenBruto || 0), tension: .35, borderWidth: 2, fill: false },
                { label: 'Margen operativo', data: data.map(r => +r.MargenOperativo || 0), tension: .35, borderWidth: 2, fill: false }
            ]
        },
        options: oBase()
    });
}
function renderCostosMedio(rows) {
    const id = 'ch_medios_costos'; kill(id);
    const labels = rows.map(r => r.FormaPago ?? 'N/D');
    const ventas = rows.map(r => +r.MontoSubTotal || 0);
    const costos = rows.map(r => +r.CostoFinancieroEstimado || 0);
    CH[id] = new Chart($id(id), {
        type: 'bar',
        data: {
            labels, datasets: [
                { label: 'Ventas', data: ventas },
                { label: 'Costo financiero', data: costos }
            ]
        },
        options: oBase()
    });
}

/* =================== Tops + paginación =================== */
const PAGER = {
    ch_topMas: { page: 1, pageSize: 10, total: 0, data: [] },
    ch_topMenos: { page: 1, pageSize: 10, total: 0, data: [] },
    ch_topRentables: { page: 1, pageSize: 10, total: 0, data: [] },
    ch_topMenosRentables: { page: 1, pageSize: 10, total: 0, data: [] }
};
function setupPager(key, rows) { const p = PAGER[key]; p.data = rows || []; p.total = p.data.length; p.page = 1; updatePagerUI(key); }
function updatePagerUI(key) {
    const p = PAGER[key]; const el = document.querySelector(`.ad-pager[data-for="${key}"]`); if (!el) return;
    const pages = Math.max(1, Math.ceil((p.total || 0) / p.pageSize));
    el.querySelector('.lbl').textContent = `${p.total} ítems · pág. ${p.page}/${pages}`;
    el.querySelector('.prev').disabled = (p.page <= 1);
    el.querySelector('.next').disabled = (p.page >= pages);
}
function turnPage(key, delta) {
    const p = PAGER[key]; const pages = Math.max(1, Math.ceil((p.total || 0) / p.pageSize));
    p.page = Math.min(pages, Math.max(1, p.page + delta));
    updatePagerUI(key);
    if (key === 'ch_topMas') renderTopBars('ch_topMas', 'Más vendidos', p.data, r => r.CantidadVendida, true);
    if (key === 'ch_topMenos') renderTopBars('ch_topMenos', 'Menos vendidos', p.data, r => r.CantidadVendida, true);
    if (key === 'ch_topRentables') renderTopBars('ch_topRentables', 'Más rentables', p.data, r => r.MargenBruto, true);
    if (key === 'ch_topMenosRentables') renderTopBars('ch_topMenosRentables', 'Menos rentables', p.data, r => r.MargenBruto, true);
}

function renderTopBars(canvasId, title, rows, valSel, fromPager = false) {
    kill(canvasId);
    if (!fromPager) setupPager(canvasId, rows);
    const p = PAGER[canvasId];
    const start = (p.page - 1) * p.pageSize, end = start + p.pageSize;
    const data = safe(p.data).slice(start, end);

    const labels = data.map(r => r.Producto ?? `#${r.IdProducto}`);

    CH[canvasId] = new Chart($id(canvasId), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: title,
                data: data.map(valSel),
                // borde visible (por si cambian los defaults)
                borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.18)', borderSkipped: false,
                backgroundColor: 'rgba(91,140,255,0.60)',
                hoverBackgroundColor: 'rgba(91,140,255,0.85)'
            }]
        },
        options: {
            ...oBase(),
            indexAxis: 'y',
            layout: { padding: { left: 6, right: 10, bottom: 4, top: 0 } },
            scales: {
                // x mantiene tus defaults
                x: { grid: { color: C.grid }, ticks: { color: C.tick } },
                // y con autoskip OFF + truncado
                y: { grid: { color: C.grid }, ticks: yTicksFor(labels, 30) }
            },
            plugins: {
                ...oBase().plugins,
                tooltip: {
                    ...oBase().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => {
                            const i = ctx.dataIndex, r = data[i] || {};
                            const unidades = Number(r.CantidadVendida || 0);
                            const veces = Number(r.VecesVendido || 0);
                            const ingreso = Number(r.Ingreso || 0);
                            const costo = Number(r.Costo || 0);
                            const margen = ingreso - costo;
                            return [
                                `Unidades: ${fmtInt(unidades)}`,
                                `Veces vendido: ${fmtInt(veces)}`,
                                `Ingresos: ${fmtMon(ingreso)}`,
                                `Costos: ${fmtMon(costo)}`,
                                `Margen: ${fmtMon(margen)}`
                            ];
                        }
                    }
                }
            }
        }
    });
    updatePagerUI(canvasId);
}

function renderGroupBars(canvasId, rows, labelSel, valSel) {
    kill(canvasId);
    const data = safe(rows);
    const labels = data.map(labelSel);

    // 📏 Ajuste de alto: si hay pocas filas, no inflar tanto el contenedor
    const n = labels.length;
    let pxPerRow = 18;
    if (n < 10) pxPerRow = 24;       // más aire cuando son poquitas
    else if (n < 16) pxPerRow = 20;  // balance ideal
    else if (n > 25) pxPerRow = 16;  // más compacto si son muchas

    const min = 400, max = 800;
    const need = Math.min(max, Math.max(min, Math.round(n * pxPerRow)));
    const wrap = document.getElementById(canvasId)?.closest('.ad-chart');
    if (wrap) wrap.style.height = need + 'px';

    // ⚙️ Configuración Chart.js
    CH[canvasId] = new Chart($id(canvasId), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Margen',
                data: data.map(valSel),
                backgroundColor: 'rgba(122,97,255,0.60)',
                hoverBackgroundColor: 'rgba(122,97,255,0.85)',
                borderColor: 'rgba(255,255,255,0.16)',
                borderWidth: 1,
                borderSkipped: false,
                barThickness: n > 18 ? 10 : 12,
                maxBarThickness: 14,
                categoryPercentage: n > 18 ? 0.82 : 0.88,
                barPercentage: 0.9
            }]
        },
        options: {
            ...oBase(),
            indexAxis: 'y',
            layout: { padding: { left: 6, right: 8, top: 0, bottom: 0 } },
            scales: {
                x: { grid: { color: C.grid }, ticks: { color: C.tick } },
                y: {
                    grid: { color: C.grid },
                    ticks: {
                        color: C.tick,
                        font: { size: n > 28 ? 9 : 10 },
                        autoSkip: false,
                        callback: (val, i) => {
                            const name = labels[i] || '';
                            return name.length > 24 ? name.slice(0, 24) + '…' : name;
                        }
                    }
                }
            }
        }
    });
}

/* ====================== Export PDF ====================== */
function showOverlay(msg = 'Procesando…') {
    let ov = $id('ad-busy');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'ad-busy';
        ov.style.cssText = `position:fixed; inset:0; z-index:2147483647; background:rgba(8,12,28,.58);
      display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px);
      color:#e7e9fb; font-family:system-ui,-apple-system,Segoe UI,Roboto; `;
        ov.innerHTML = `<div style="min-width:260px; padding:18px 22px; border-radius:14px; border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg,rgba(24,28,52,.95),rgba(17,22,44,.92)); box-shadow:0 18px 50px rgba(0,0,0,.45);
      display:flex; gap:12px; align-items:center;">
      <div class="spinner-border" role="status" style="width:22px; height:22px"></div>
      <div id="ad-busy-text" style="font-weight:600; letter-spacing:.2px"></div></div>`;
        document.body.appendChild(ov);
    }
    $id('ad-busy-text').textContent = msg; ov.style.display = 'flex';
}
function hideOverlay() { const ov = $id('ad-busy'); if (ov) ov.style.display = 'none'; }
async function exportarPDF() {
    try {
        showOverlay('Exportando PDF…'); await new Promise(r => setTimeout(r, 60));
        const root = $id('ad-root');
        const canvas = await html2canvas(root, { scale: 2, background: '#0e1224' });
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW - 12; const pxPerPage = canvas.width * (pageH - 12) / imgW;
        let sY = 0, leftH = canvas.height;
        while (leftH > 0) {
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width; pageCanvas.height = Math.min(pxPerPage, leftH);
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, sY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
            if (sY > 0) pdf.addPage();
            const pageImg = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImg, 'PNG', 6, 6, imgW, pageCanvas.height * imgW / canvas.width);
            sY += pxPerPage; leftH -= pxPerPage;
        }
        pdf.save(`Analisis_${moment().format('YYYYMMDD_HHmm')}.pdf`);
    } catch (e) { console.error(e); alert('No se pudo exportar el PDF.'); }
    finally { hideOverlay(); }
}


function yTicksFor(labels, maxLen = 30) {
    return {
        autoSkip: false,                 // ← no omitir etiquetas
        color: C.tick,
        font: { size: 11 },              // ← más chico para que entren
        callback: (val, idx) => {
            const s = labels?.[idx] ?? val;
            if (!s) return '';
            return s.length > maxLen ? (s.slice(0, maxLen) + '…') : s;
        }
    };
}



// Alto compacto por fila (valores más chicos que antes)
function ensureBarHeight(canvasId, count, pxPerRow = 18, min = 220, max = 560) {
    // Para "Proveedor" forzamos aún más compacto
    if (canvasId === 'ch_proveedor') {
        pxPerRow = 16; min = 220; max = 520;
    }
    const need = Math.min(max, Math.max(min, Math.round(count * pxPerRow)));
    const wrap = document.getElementById(canvasId)?.closest('.ad-chart');
    if (wrap) wrap.style.height = need + 'px';
}

// Ticks inteligentes (menos fuente + menos etiquetas si hay muchas)
function yTicksSmart(labels, maxLen = 22) {
    const total = labels?.length ?? 0;
    const step = total <= 24 ? 1 : (total <= 36 ? 2 : 3);
    const fontSize = total > 32 ? 9 : 10;
    return {
        autoSkip: false,
        padding: 1,
        color: C.tick,
        font: { size: fontSize },
        callback: (val, idx) => {
            if (idx % step !== 0) return '';
            const s = labels?.[idx] ?? '';
            return s.length > maxLen ? (s.slice(0, maxLen) + '…') : s;
        }
    };
}


function syncHeights(aId, bId) {
    const wa = document.getElementById(aId)?.closest('.ad-chart');
    const wb = document.getElementById(bId)?.closest('.ad-chart');
    if (!wa || !wb) return;
    const h = Math.min(wa.clientHeight, wb.clientHeight);
    wa.style.height = h + 'px';
    wb.style.height = h + 'px';
}
// llamalo al final de render():
