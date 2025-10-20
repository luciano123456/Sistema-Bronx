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

    // ===== KPIs base =====
    const ingresos = pick(k, 'IngresosImporteTotal', 'VentasImporteTotal') || pick(k, 'IngresosSubTotal', 'VentasSubTotal');
    const egresos = pick(k, 'EgresosImporteTotal', 'GastosImporteTotal');
    const cantPed = pick(k, 'CantidadPedidos', 'CantidadTickets');
    const cantUnid = pick(k, 'CantidadUnidades', 'CantidadItems');
    const margenN = pick(k, 'MargenNeto', 'MargenNetoValor');

    $id('kpi_ingresos').textContent = fmtMon(ingresos);
    $id('kpi_egresos').textContent = fmtMon(egresos);
    $id('kpi_pedidos_unidades').textContent = `${fmtInt(cantPed)} / ${fmtInt(cantUnid)}`;
    const kpiMargEl = $id('kpi_margen'); if (kpiMargEl) kpiMargEl.textContent = fmtMon(margenN);

    // ===== KPIs nuevos: Neto / IVA / CF / En mano =====
    const ivaRaw = pick(k, 'IVA_Total', 'IVATotal', 'IVA');
    const cfRaw = pick(k, 'CostoFinanciero_Total', 'CostoFinancieroTotal', 'CostoFinanciero');
    const netoRaw = pick(k, 'Neto_Total', 'IngresoNeto_Total', 'NetoTotal', 'Neto');  // si viene del SP

    const iva = Number(ivaRaw ?? 0);
    const cf = Number(cfRaw ?? 0);

    // fallback correcto: Neto = SubTotal - IVA (con paréntesis)
    const sub = Number(pick(k, 'IngresosSubTotal', 'VentasSubTotal') ?? 0);
    let neto = Number(netoRaw ?? NaN);
    if (!Number.isFinite(neto)) {
        neto = sub - (Number.isFinite(iva) ? iva : 0);
    }

    // En mano preferido desde SP; si no, Neto - CF
    let mano = Number(pick(k, 'IngresoEnMano_Total', 'IngresoRealEnMano_Total', 'IngresoEnManoTotal', 'EnMano') ?? NaN);
    if (!Number.isFinite(mano)) {
        mano = (Number.isFinite(neto) ? neto : 0) - (Number.isFinite(cf) ? cf : 0);
    }

    // Evitar -0
    const fix0 = v => Math.abs(v) < 1e-9 ? 0 : v;

    const setTxt = (id, val) => { const el = $id(id); if (el) el.textContent = fmtMon(fix0(Number(val || 0))); };
    setTxt('kpi_enmano', mano);
    setTxt('kpi_iva', iva);
    setTxt('kpi_cf', cf);
    setTxt('kpi_neto', neto);

    // ===== Charts existentes =====
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

    // ===== Dashboards de gastos (nuevos) =====
    renderGastosComparativa(vm?.GastosMensualPorTipo || []);                // líneas/areas por tipo
    renderGastosPorTipo(vm?.GastosPorTipoCategoria || [], vm?.GastosMensualPorTipo || []); // por categoría dentro de cada tipo
    renderGastosTipo(vm?.GastosTotalesPorTipo || []);                       // barra apilada/treemap por tipo
    renderComparativaReal(vm?.ComparativaRealMensual || []);                // “en mano” vs egresos por mes

    // ===== Ajuste de alturas entre pares =====
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

/* ===================== GASTOS: Comparativa & por Tipo ===================== */
function renderGastosComparativa(rows) {
    const id = 'ch_gastos_comp'; kill(id);
    const data = safe(rows);

    // ejes
    const key = r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`;
    const meses = [...new Set(data.map(key))].sort();
    const tipos = [...new Set(data.map(r => r.TipoGeneral || '(s/tipo)'))];

    // matriz tipo x mes
    const byTipoMes = {};
    tipos.forEach(t => { byTipoMes[t] = {}; });
    data.forEach(r => {
        const k = key(r);
        const t = r.TipoGeneral || '(s/tipo)';
        byTipoMes[t][k] = (byTipoMes[t][k] || 0) + Number(r.Total || 0);
    });

    // datasets con gradiente, borde y radio
    const datasets = tipos.map((t, i) => ({
        label: t,
        data: meses.map(m => byTipoMes[t][m] || 0),
        type: 'bar',
        backgroundColor: (ctx) => {
            const { chart, chartArea } = ctx;
            if (!chartArea) return colorFor(i, .7);                 // primer render
            return gradientFill(chart.ctx, chartArea, i);
        },
        borderColor: colorFor(i, .95),
        hoverBackgroundColor: colorFor(i, .95),
        borderWidth: 1.2,
        borderSkipped: false,
        borderRadius: 8,
        barPercentage: 0.9,
        categoryPercentage: 0.72
    }));

    CH[id] = new Chart($id(id), {
        type: 'bar',
        data: { labels: meses, datasets },
        options: {
            ...oBase(),
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,.06)' },
                    ticks: { color: C.tick }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,.06)' },
                    ticks: {
                        color: C.tick,
                        callback: (v) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
                            .format(Number(v || 0))
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'roundedRect',
                        boxWidth: 12, boxHeight: 12,
                        generateLabels: (chart) => {
                            const { datasets } = chart.data;
                            return datasets.map((ds, i) => ({
                                text: ds.label,
                                fillStyle: colorFor(i, .85),
                                strokeStyle: colorFor(i, .95),
                                lineWidth: 1,
                                hidden: !chart.isDatasetVisible(i),
                                datasetIndex: i
                            }));
                        }
                    },
                    onClick: (e, item, legend) => {
                        const i = item.datasetIndex;
                        const ci = legend.chart;
                        ci.toggleDataVisibility(i);
                        ci.update();
                    }
                },
                tooltip: {
                    ...oBase().plugins.tooltip,
                    mode: 'index',
                    callbacks: {
                        title: (items) => `Mes: ${items[0].label}`,
                        label: (ctx) => {
                            const v = Number(ctx.parsed.y || 0);
                            return ` ${ctx.dataset.label}: ${fmtMon(v)}`;
                        },
                        footer: (items) => {
                            const tot = items.reduce((a, it) => a + (it.parsed.y || 0), 0);
                            return ` Total: ${fmtMon(tot)}`;
                        }
                    },
                    footerFont: { size: 11 }
                }
            }
        }
    });
}

function renderGastosPorTipo(rowsTipoCat, rowsMensual) {
    const tiposBase = [...new Set(safe(rowsTipoCat).map(r => r.TipoGasto || '(s/tipo)'))];
    const tipos = ['Todos', ...tiposBase]; // ⬅️ agregamos tab "Todos"
    const head = document.getElementById('gastos-tabs-head');
    const body = document.getElementById('gastos-tabs-body');
    head.innerHTML = ''; body.innerHTML = '';

    if (tipos.length === 1) {
        head.innerHTML = '<div class="text-muted">Sin datos de gastos</div>';
        return;
    }

    // util: agrega/mergea categorías (para "Todos")
    const aggCats = (rows) => {
        const map = new Map();
        rows.forEach(r => {
            const k = (r.Categoria || '(s/categoría)').trim();
            map.set(k, (map.get(k) || 0) + Number(r.TotalGasto || 0));
        });
        return [...map.entries()]
            .map(([Categoria, TotalGasto]) => ({ TipoGasto: 'Todos', Categoria, TotalGasto }))
            .sort((a, b) => b.TotalGasto - a.TotalGasto);
    };
    // util: suma serie mensual por tipo (para "Todos")
    const aggSerie = (rows) => {
        const map = new Map(); // key: AAAA-MM
        rows.forEach(r => {
            const k = `${r.Anio}-${String(r.Mes).padStart(2, '0')}`;
            map.set(k, (map.get(k) || 0) + Number(r.Total || 0));
        });
        return [...map.entries()]
            .map(([k, Total]) => ({ Anio: Number(k.slice(0, 4)), Mes: Number(k.slice(5, 7)), TipoGeneral: 'Todos', Total }))
            .sort((a, b) => a.Anio - b.Anio || a.Mes - b.Mes);
    };

    tipos.forEach((t, i) => {
        // datos del tab i
        const rowsCat = (t === 'Todos')
            ? aggCats(safe(rowsTipoCat))
            : safe(rowsTipoCat).filter(r => (r.TipoGasto || '(s/tipo)') === t);

        const rowsSerie = (t === 'Todos')
            ? aggSerie(safe(rowsMensual))
            : safe(rowsMensual).filter(r => (r.TipoGeneral || '(s/tipo)') === t);

        // botón tab
        const btn = document.createElement('button');
        btn.className = 'ad-tab-btn' + (i === 0 ? ' active' : '');
        btn.textContent = t;
        btn.dataset.key = String(i);
        head.appendChild(btn);

        // pane + pager
        const pane = document.createElement('div');
        pane.className = 'ad-tab-pane';
        if (i > 0) pane.hidden = true;
        pane.dataset.key = String(i);
        pane.innerHTML = `
      <div class="gasto-grid">
        <div class="ad-chart" style="height:320px"><canvas id="ch_gasto_pie_${i}"></canvas></div>
        <div class="ad-chart" style="height:320px; position:relative">
          <canvas id="ch_gasto_cat_${i}"></canvas>
          <div class="ad-pager ad-pager--tiny" data-scope="gcat" data-key="${i}">
            <span class="lbl">—</span>
            <button class="btn prev"><span class="ico">◀</span></button>
            <button class="btn next"><span class="ico">▶</span></button>
          </div>
        </div>
      </div>
      <div class="ad-chart mt-2" style="height:280px"><canvas id="ch_gasto_line_${i}"></canvas></div>
    `;
        body.appendChild(pane);

        // init pager con total de categorías
        gSetupPager(String(i), rowsCat.length);
        // listeners de pager
        const pager = pane.querySelector('.ad-pager[data-scope="gcat"]');
        pager.querySelector('.prev').addEventListener('click', () => gTurnPage(String(i), -1, rePaintTab));
        pager.querySelector('.next').addEventListener('click', () => gTurnPage(String(i), +1, rePaintTab));

        // función de repintado del tab i
        function rePaintTab(key) {
            const idx = key || String(i);
            const p = G_PAGER[idx];
            const start = (p.page - 1) * p.pageSize, end = start + p.pageSize;
            const slice = rowsCat.slice(start, end);
            renderGastoTipoCharts(Number(idx), slice, rowsSerie, true /*fromPager*/);
            gUpdatePagerUI(idx);
        }

        // primer render
        renderGastoTipoCharts(i, rowsCat.slice(0, G_PAGE_SIZE), rowsSerie, false);
        gUpdatePagerUI(String(i));

        // click tab
        btn.addEventListener('click', () => {
            head.querySelectorAll('.ad-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
            body.querySelectorAll('.ad-tab-pane').forEach(pn => pn.hidden = (pn !== pane));
        });
    });
}

function renderGastoTipoCharts(idx, rowsCatPaged, rowsSerie, fromPager = false) {
    // DONUT categorías (muestra lo mismo que la página actual)
    const idPie = `ch_gasto_pie_${idx}`; kill(idPie);
    const cats = rowsCatPaged.map(r => r.Categoria || '(s/categoría)');
    const vals = rowsCatPaged.map(r => +r.TotalGasto || 0);
    CH[idPie] = new Chart($id(idPie), {
        type: 'doughnut',
        data: { labels: cats, datasets: [{ data: vals }] },
        options: { ...oBase(), cutout: '60%' }
    });

    // BARRAS horizontales categorías (paginadas)
    const idBar = `ch_gasto_cat_${idx}`; kill(idBar);
    CH[idBar] = new Chart($id(idBar), {
        type: 'bar',
        data: {
            labels: cats, datasets: [{
                label: 'Total',
                data: vals,
                borderWidth: 1.2,
                borderColor: 'rgba(255,255,255,0.16)',
                borderSkipped: false,
                backgroundColor: 'rgba(122,97,255,0.60)',
                hoverBackgroundColor: 'rgba(122,97,255,0.85)'
            }]
        },
        options: {
            ...oBase(),
            indexAxis: 'y',
            scales: { y: { ticks: yTicksSmart(cats, 26), grid: { color: C.grid } }, x: { grid: { color: C.grid } } }
        }
    });

    // LÍNEA mensual del tipo (no se pagina)
    const idLin = `ch_gasto_line_${idx}`; kill(idLin);
    const labels = rowsSerie.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    const data = rowsSerie.map(r => +r.Total || 0);
    CH[idLin] = new Chart($id(idLin), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Gasto mensual', data, tension: .35, borderWidth: 2, fill: false }] },
        options: oBase()
    });
}

function renderGastoTipoCharts(idx, rowsCat, rowsSerie) {
    // DONUT categorías
    const idPie = `ch_gasto_pie_${idx}`; kill(idPie);
    const cats = rowsCat.map(r => r.Categoria || '(s/categoría)');
    const vals = rowsCat.map(r => +r.TotalGasto || 0);
    CH[idPie] = new Chart($id(idPie), {
        type: 'doughnut',
        data: { labels: cats, datasets: [{ data: vals }] },
        options: { ...oBase(), cutout: '60%' }
    });

    // BARRAS horizontales categorías
    const idBar = `ch_gasto_cat_${idx}`; kill(idBar);
    CH[idBar] = new Chart($id(idBar), {
        type: 'bar',
        data: { labels: cats, datasets: [{ label: 'Total', data: vals, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.16)', borderSkipped: false }] },
        options: {
            ...oBase(),
            indexAxis: 'y',
            scales: { y: { ticks: yTicksSmart(cats, 26), grid: { color: C.grid } }, x: { grid: { color: C.grid } } }
        }
    });

    // LÍNEA mensual del tipo
    const idLin = `ch_gasto_line_${idx}`; kill(idLin);
    const labels = rowsSerie.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    const data = rowsSerie.map(r => +r.Total || 0);
    CH[idLin] = new Chart($id(idLin), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Gasto mensual', data, tension: .35, borderWidth: 2, fill: false }] },
        options: oBase()
    });
}




// ===== Paleta y gradientes (para dar vida a las series) =====
const PALETTE = [
    { h: 222, s: 85, l: 61 }, // azul
    { h: 280, s: 70, l: 62 }, // violeta
    { h: 160, s: 55, l: 55 }, // verde
    { h: 15, s: 80, l: 58 }, // naranja
    { h: 340, s: 70, l: 60 }, // magenta
    { h: 195, s: 70, l: 55 }, // cian
];
function hsl(h, s, l, a = 1) { return `hsla(${h} ${s}% ${l}% / ${a})`; }
function colorFor(i, a = 0.85) {
    const c = PALETTE[i % PALETTE.length];
    return hsl(c.h, c.s, c.l, a);
}
function gradientFill(ctx, area, i) {
    const g = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    const base = PALETTE[i % PALETTE.length];
    g.addColorStop(0, hsl(base.h, base.s, Math.max(10, base.l - 22), .35));
    g.addColorStop(.55, hsl(base.h, base.s, base.l, .60));
    g.addColorStop(1, hsl(base.h, base.s, Math.min(92, base.l + 14), .95));
    return g;
}


// ====== Pager para categorías por tipo ======
const G_PAGE_SIZE = 12; // cantidad de categorías por página
const G_PAGER = {};     // key = índice del tab

function gSetupPager(key, total) {
    G_PAGER[key] = { page: 1, pageSize: G_PAGE_SIZE, total };
}
function gPagesOf(key) {
    const p = G_PAGER[key] || { total: 0, pageSize: G_PAGE_SIZE, page: 1 };
    return Math.max(1, Math.ceil((p.total || 0) / p.pageSize));
}
function gUpdatePagerUI(key) {
    const p = G_PAGER[key]; if (!p) return;
    const el = document.querySelector(`.ad-pager[data-scope="gcat"][data-key="${key}"]`);
    if (!el) return;
    const pages = gPagesOf(key);
    el.querySelector('.lbl').textContent = `${p.total} ítems · pág. ${p.page}/${pages}`;
    el.querySelector('.prev').disabled = (p.page <= 1);
    el.querySelector('.next').disabled = (p.page >= pages);
}
function gTurnPage(key, delta, reRender) {
    const p = G_PAGER[key]; if (!p) return;
    const pages = gPagesOf(key);
    p.page = Math.min(pages, Math.max(1, p.page + delta));
    gUpdatePagerUI(key);
    reRender?.(key);
}


const PAL = {
    blue: 'rgba(91,140,255,0.85)',
    purple: 'rgba(162,99,245,0.90)',
    green: 'rgba(64,201,140,0.90)',
    red: 'rgba(255,99,132,0.90)',
    orange: 'rgba(255,168,76,0.90)',
    cyan: 'rgba(73,199,235,0.90)',
    lime: 'rgba(205,236,69,0.90)'
};


function renderGastosTipo(rows) {
    const id = 'ch_gastos_tipo'; kill(id);
    const data = safe(rows);
    if (!data.length) { CH[id] = new Chart($id(id), { type: 'doughnut', data: { labels: [], datasets: [{ data: [] }] } }); return; }

    // Normalizamos etiquetas y orden
    const labels = data.map(r => r.TipoGeneral || 'N/D');
    const values = data.map(r => +r.Total || 0);

    CH[id] = new Chart($id(id), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: [PAL.purple, PAL.orange, PAL.cyan, PAL.lime] }] },
        options: {
            ...oBase(),
            cutout: '58%',
            plugins: {
                ...oBase().plugins,
                legend: { position: 'bottom' },
                tooltip: {
                    ...oBase().plugins.tooltip,
                    callbacks: { label: ctx => `${ctx.label}: ${fmtMon(ctx.parsed)}` }
                }
            }
        }
    });
}


function renderComparativaReal(rows) {
    const id = 'ch_comp_real'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    const enMano = data.map(r => +r.IngresoEnMano || 0);
    const gFab = data.map(r => +r.GastoFabricacion || 0);
    const gOp = data.map(r => +r.GastoOperativo || 0);
    const res = data.map(r => +r.ResultadoMes || 0);

    CH[id] = new Chart($id(id), {
        data: {
            labels,
            datasets: [
                { type: 'bar', label: 'Gasto fabricación', data: gFab, backgroundColor: PAL.orange, stack: 'g' },
                { type: 'bar', label: 'Gasto operativos', data: gOp, backgroundColor: PAL.red, stack: 'g' },
                { type: 'bar', label: 'En mano', data: enMano, backgroundColor: PAL.green, stack: 'm' },
                { type: 'line', label: 'Resultado mes', data: res, borderWidth: 2, tension: .35 }
            ]
        },
        options: {
            ...oBase(),
            scales: {
                x: { stacked: true, grid: { color: C.grid }, ticks: { color: C.tick } },
                y: { stacked: true, grid: { color: C.grid }, ticks: { color: C.tick } }
            },
            plugins: {
                ...oBase().plugins,
                tooltip: {
                    ...oBase().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${fmtMon(ctx.parsed.y ?? ctx.parsed)}`
                    }
                },
                legend: { position: 'top' }
            }
        }
    });
}
