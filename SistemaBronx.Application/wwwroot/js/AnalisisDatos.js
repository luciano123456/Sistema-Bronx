/* =======================================================================
 * AnalisisDatos Dashboard v5.4 (full & estable)
 * - Respeta tu estructura original
 * - Usa los nuevos campos del SP (Neto_Total, CF_Neto, CF_IVA, MasMenos_IVA, etc.)
 * - Arregla overlay del panel de fechas (no bloquea el botón Consultar)
 * ======================================================================= */

const $id = s => document.getElementById(s);
const fmtMon = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtInt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(n || 0));
const safe = a => Array.isArray(a) ? a : [];
const C = { grid: 'rgba(255,255,255,.07)', tick: 'rgba(255,255,255,.65)', text: '#e7e9fb' };

let CH = {};
let flat = null;
let rango = { desde: null, hasta: null, label: 'Últimos 30 días' };
let DATE_PORTAL = null, PANEL_MOVED = false;

document.addEventListener('DOMContentLoaded', init);

/* ============================ INIT ============================ */
async function init() {
    // Defaults Chart.js
    if (window.Chart) {
        Chart.defaults.color = C.text;
        Chart.defaults.font.family = 'system-ui,-apple-system,Segoe UI,Roboto';
        Chart.defaults.elements.bar.borderWidth = 1.2;
        Chart.defaults.elements.bar.borderColor = 'rgba(255,255,255,0.18)';
        Chart.defaults.elements.bar.borderSkipped = false;
        Chart.defaults.scale.grid.color = C.grid;
        Chart.defaults.scale.ticks.color = C.tick;
    }

    // Flatpickr
    flat = flatpickr('#ad-flatpickr', {
        mode: 'range', dateFormat: 'd/m/Y', locale: 'es', allowInput: true,
        appendTo: $id('ad-date-panel'), static: true, zIndex: 2147483647,
        onClose: (sel) => { if (sel.length === 2) setCustom(sel[0], sel[1]); }
    });

    // Chips
    document.querySelectorAll('#ad-chips .chip').forEach(ch => ch.addEventListener('click', () => chipClick(ch)));

    // Abrir/Cerrar panel
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

    // Paginadores de Tops
    document.querySelectorAll('.ad-pager').forEach(pg => {
        const key = pg.getAttribute('data-for');
        pg.querySelector('.prev').addEventListener('click', () => turnPage(key, -1));
        pg.querySelector('.next').addEventListener('click', () => turnPage(key, +1));
    });

    setPreset(30);
    consultar();
}

/* ===================== Clientes (Select2) ===================== */
async function cargarClientes() {
    try {
        const res = await fetch('/Clientes/Lista');
        if (!res.ok) throw new Error('Error al obtener clientes');
        const data = await res.json();

        const sl = $('#filtroCliente');
        sl.empty();
        sl.append(new Option('Todos', '', true, true));   // por defecto

        safe(data).forEach(c => sl.append(new Option(c.Nombre || '(Sin nombre)', c.Id)));

        sl.select2({
            width: '260px',
            placeholder: 'Todos',
            allowClear: true,
            theme: 'default',
            dropdownCssClass: 'select2-dark'
        });

        // Refuerzo de estilos en dropdown oscuro
        $('.select2-dark .select2-results__option').css({ color: '#fff', background: 'transparent' });
        $('.select2-dark .select2-results__option--highlighted').css({ background: '#26346e', color: '#fff' });

        sl.val('').trigger('change');
    } catch (err) {
        console.error('Error al cargar clientes:', err);
    }
}

/* ====================== Filtros/Fechas ====================== */
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

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function setPreset(key) {
    const now = new Date(); let start = now, end = now, label = '';
    if (String(key) === '1') { start = now; label = 'Hoy'; }
    else if (String(key) === '7') { start = addDays(now, -6); label = 'Últimos 7 días'; }
    else if (String(key) === '90') { start = addDays(now, -89); label = 'Últimos 90 días'; }
    else if (key === 'ytd') { start = new Date(now.getFullYear(), 0, 1); label = 'Year to date'; }
    else if (key === 'year') { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); label = 'Este año'; }
    else { start = addDays(now, -29); label = 'Últimos 30 días'; } // default

    rango = { desde: start, hasta: end, label };
    $id('ad-date-text').textContent = label;

    document.querySelectorAll('#ad-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.range === String(key)));
}
function setCustom(a, b) {
    rango = { desde: a, hasta: b, label: `${moment(a).format('DD/MM/YYYY')} a ${moment(b).format('DD/MM/YYYY')}` };
    $id('ad-date-text').textContent = rango.label;
    document.querySelectorAll('#ad-chips .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#ad-chips .chip[data-range="custom"]')?.classList.add('active');
}
function chipClick(chip) {
    const k = chip.dataset.range;
    if (k === 'custom') { const end = new Date(); const start = addDays(end, -29); flat.setDate([start, end], true); }
    else { setPreset(k); togglePanel(false); consultar(); }
}

/* ======= Portal/Overlay del panel de fechas (no bloquea nada) ======= */
function ensurePortal() {
    if (!DATE_PORTAL) {
        DATE_PORTAL = document.createElement('div');
        DATE_PORTAL.className = 'ad-overlay-root';
        document.body.appendChild(DATE_PORTAL);
    }
}
function togglePanel(show) {
    const panel = $id('ad-date-panel'), pill = $id('ad-date-pill');
    if (!show) { if (panel) { panel.hidden = true; panel.style.left = '-9999px'; panel.style.top = '-9999px'; } return; }
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
    btn.innerHTML = b ? `<span class="spinner-border spinner-border-sm me-2"></span>Consultando...`
        : `<i class="ti ti-search me-1"></i> Consultar`;
}

/* ========================= Render ========================= */
function render(vm) {
    const k = vm?.Kpis || {};
    const mensual = vm?.Mensual || [];

    // ===== KPIs según SP nuevo =====
    const ingresosBrutos = Number(k.IngresosImporteTotal ?? k.IngresosSubTotal ?? 0) || 0; // BRUTA con IVA
    const ventasNetas = Number(k.Neto_Total ?? 0) || 0;                                   // sin IVA
    const cfTotal = Number(k.CostoFinanciero_Total ?? 0) || 0;                        // con IVA
    const cfNeto = Number(k.CostoFinanciero_Neto_Total ?? 0) || 0;                   // neto
    const egresosBrutos = Number(k.EgresosImporteTotal ?? 0) || 0;
    const cantPed = Number(k.CantidadPedidos ?? 0) || 0;
    const cantUnid = Number(k.CantidadUnidades ?? 0) || 0;

    // KPI textos
    $id('kpi_ingresos').textContent = fmtMon(ingresosBrutos);
    $id('kpi_ingresos_sin_iva').textContent = fmtMon(ventasNetas);
    $id('kpi_cf_total').textContent = fmtMon(cfTotal);
    $id('kpi_egresos').textContent = fmtMon(egresosBrutos);
    $id('kpi_pedidos_unidades').textContent = `${fmtInt(cantPed)} / ${fmtInt(cantUnid)}`;

    // Ingreso neto “en mano” = Neto_Total - CF_Neto (según SP)
    const ingresoEnMano = Number(k.IngresoEnMano_Total ?? (ventasNetas - cfNeto)) || 0;
    $id('kpi_neto_ingresos').textContent = fmtMon(ingresoEnMano);

    // % CF sobre ventas (usamos CF TOTAL / BRUTA para coherencia visual)
    const cfPctSobreVentas = ingresosBrutos > 0 ? (cfTotal * 100 / ingresosBrutos) : 0;
    $id('kpi_cf_pct_ventas').textContent = `${cfPctSobreVentas.toFixed(2)}%`;

    // ===== Charts =====
    renderEvolucion(mensual);
    renderMedios(vm?.MediosPago || []);
    renderCrecimiento(vm?.Crecimiento || []);
    renderInteranual(vm?.Interanual || []);
    renderMargenes(mensual);

    // Ventas vs CF por medio (dos canvas)
    renderCostosMedioTo('ch_medios_costos', vm?.MediosPago || []);
    renderCostosMedioTo('ch_medios_costos_2', vm?.MediosPago || []);

    // Tops
    renderTopBars('ch_topMas', 'Más vendidos', vm?.TopMasVendidos || [], r => r.CantidadVendida);
    renderTopBars('ch_topMenos', 'Menos vendidos', vm?.TopMenosVendidos || [], r => r.CantidadVendida);
    renderTopBars('ch_topRentables', 'Más rentables', vm?.TopMasRentables || [], r => (r.MargenBruto || 0));
    renderTopBars('ch_topMenosRentables', 'Menos rentables', vm?.TopMenosRentables || [], r => (r.MargenBruto || 0));

    // Agrupados
    renderGroupBars('ch_categoria', vm?.PorCategoria || [], g => g.GrupoCatNombre ?? g.GrupoNombre, g => g.MargenBruto);
    renderGroupBars('ch_proveedor', vm?.PorProveedor || [], g => g.GrupoProvNombre ?? g.GrupoNombre, g => g.MargenBruto);
    syncHeights('ch_categoria', 'ch_proveedor');

    // Resumen por porcentaje (lista) → excluir 0 y nulos
    fillCFList((vm?.CostoFinancieroPorcentaje || []).filter(r => Number(r.RatePct) > 0 && Number(r.CostoFinanciero) > 0));

    // KPI “% CF más usado” (el de mayor monto de ventas, >0)
    const cfRates = (vm?.CostoFinancieroPorcentaje || []).filter(r => Number(r.RatePct) > 0 && Number(r.MontoSubTotal) > 0);
    const topRate = cfRates.sort((a, b) => Number(b.MontoSubTotal) - Number(a.MontoSubTotal))[0];
    $id('kpi_cf_mas_usado').textContent = topRate ? `${Number(topRate.RatePct).toFixed(2)}%` : '—';
}

/* ==================== Chart helpers ==================== */
function oBase() {
    return {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: C.text, boxWidth: 10, boxHeight: 10, padding: 10, usePointStyle: false }
            },
            tooltip: {
                backgroundColor: 'rgba(15,20,38,.95)', titleColor: '#fff', bodyColor: '#cdd4ff',
                padding: 8, borderColor: 'rgba(255,255,255,.10)', borderWidth: 1, cornerRadius: 8, caretSize: 5,
                titleFont: { size: 11 }, bodyFont: { size: 11 }
            }
        },
        scales: { x: { grid: { color: C.grid }, ticks: { color: C.tick } }, y: { grid: { color: C.grid }, ticks: { color: C.tick } } }
    };
}
function kill(key) {
    try { if (CH[key]) { CH[key].destroy(); } } catch { }
    CH[key] = null;
}
/* ======================= Charts ======================= */
function renderEvolucion(rows) {
    const id = 'ch_linea'; kill(id);
    const data = safe(rows);
    const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    const ventas = data.map(r => +r.Ingresos || 0);
    const costos = data.map(r => +r.CostoMercaderia || 0);
    const mBruto = data.map(r => +r.MargenBruto || 0);
    CH[id] = new Chart($id(id), {
        type: 'line', data: {
            labels, datasets: [
                { label: 'Ventas', data: ventas, tension: .35, borderWidth: 2, fill: false },
                { label: 'Costos', data: costos, tension: .35, borderWidth: 2, fill: false },
                { label: 'Margen bruto', data: mBruto, tension: .35, borderWidth: 2, fill: false }
            ]
        }, options: oBase()
    });
}
function renderMedios(rows) {
    const id = 'ch_medios'; kill(id);
    const labels = rows.map(r => r.FormaPago ?? 'N/D');
    const data = rows.map(r => +r.MontoSubTotal || 0);
    CH[id] = new Chart($id(id), { type: 'doughnut', data: { labels, datasets: [{ data }] }, options: { ...oBase(), cutout: '60%' } });
}
function renderCrecimiento(rows) {
    const id = 'ch_crecimiento'; kill(id);
    const data = safe(rows); const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    CH[id] = new Chart($id(id), {
        type: 'bar', data: {
            labels, datasets: [
                { label: 'Pedidos', data: data.map(r => +r.CantidadPedidos || 0) },
                { label: 'Unidades', data: data.map(r => +r.CantidadUnidades || 0) }
            ]
        }, options: oBase()
    });
}
function renderInteranual(rows) {
    const id = 'ch_interanual'; kill(id);
    const data = safe(rows); const labels = data.map(r => moment(r.Periodo).format('YYYY-MM'));
    const actual = data.map(r => +r.VentaActualMes || 0);
    const prev = data.map(r => +r.VentaMismoMesAnioAnterior || +r.VentaMismoMesAñoAnterior || 0);
    CH[id] = new Chart($id(id), {
        type: 'line', data: {
            labels, datasets: [
                { label: 'Año actual', data: actual, tension: .35, borderWidth: 2, fill: false },
                { label: 'Año anterior', data: prev, tension: .35, borderDash: [6, 6], borderWidth: 2, fill: false }
            ]
        }, options: oBase()
    });
}
function renderMargenes(rows) {
    const id = 'ch_margenes'; kill(id);
    const data = safe(rows); const labels = data.map(r => `${r.Anio}-${String(r.Mes).padStart(2, '0')}`);
    CH[id] = new Chart($id(id), {
        type: 'line', data: {
            labels, datasets: [
                { label: 'Margen bruto', data: data.map(r => +r.MargenBruto || 0), tension: .35, borderWidth: 2, fill: false },
                { label: 'Margen operativo', data: data.map(r => +r.MargenOperativo || 0), tension: .35, borderWidth: 2, fill: false }
            ]
        }, options: oBase()
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
            labels, datasets: [{
                label: title, data: data.map(valSel),
                borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.18)', borderSkipped: false,
                backgroundColor: 'rgba(91,140,255,0.60)', hoverBackgroundColor: 'rgba(91,140,255,0.85)'
            }]
        },
        options: {
            ...oBase(), indexAxis: 'y', layout: { padding: { left: 6, right: 10, bottom: 4, top: 0 } },
            scales: {
                x: { grid: { color: C.grid }, ticks: { color: C.tick } },
                y: { grid: { color: C.grid }, ticks: yTicksFor(labels, 30) }
            },
            plugins: {
                ...oBase().plugins, tooltip: {
                    ...oBase().plugins.tooltip, callbacks: {
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
function yTicksFor(labels, maxLen = 30) {
    return {
        autoSkip: false, color: C.tick, font: { size: 11 },
        callback: (val, idx) => {
            const s = labels?.[idx] ?? val; if (!s) return '';
            return s.length > maxLen ? (s.slice(0, maxLen) + '…') : s;
        }
    };
}
function renderGroupBars(canvasId, rows, labelSel, valSel) {
    const canvas = getCanvas(canvasId);
    if (!canvas) return;                 // ⬅️ evita el crash si el canvas no existe

    kill(canvasId);

    const data = safe(rows);
    const labels = data.map(labelSel);

    // alto dinámico (solo si el wrapper existe)
    const n = labels.length;
    let pxPerRow = n > 25 ? 16 : n < 10 ? 24 : 20;
    const min = 400, max = 800;
    const need = Math.min(max, Math.max(min, Math.round(n * pxPerRow)));
    const wrap = canvas.closest('.ad-chart');
    if (wrap) wrap.style.height = need + 'px';

    CH[canvasId] = new Chart(canvas, {
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

function renderCostosMedioTo(canvasId, rows) {
    const canvas = getCanvas(canvasId);
    if (!canvas) return;                 // ⬅️ igual guarda

    kill(canvasId);

    const labels = rows.map(r => r.FormaPago ?? 'N/D');
    const ventas = rows.map(r => +r.MontoSubTotal || 0);
    const costos = rows.map(r => +r.CostoFinancieroEstimado || 0);

    CH[canvasId] = new Chart(canvas, {
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
function getCanvas(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn('[Dashboard] Canvas no encontrado:', id);
    }
    return el;
}

function syncHeights(aId, bId) {
    const wa = document.getElementById(aId)?.closest('.ad-chart');
    const wb = document.getElementById(bId)?.closest('.ad-chart');
    if (!wa || !wb) return; const h = Math.min(wa.clientHeight, wb.clientHeight);
    wa.style.height = h + 'px'; wb.style.height = h + 'px';
}

/* ============ Resumen por porcentaje (lista compacta) ============ */
function fillCFList(rows) {
    const el = $id('cf_porcentaje_list'); if (!el) return;
    const data = safe(rows).sort((a, b) => Number(a.RatePct) - Number(b.RatePct));
    el.innerHTML = '';
    data.forEach(r => {
        const rate = `${Number(r.RatePct || 0).toFixed(2)}%`;
        const pedidos = fmtInt(r.CantidadPedidos || 0);
        const ventas = fmtMon(r.MontoSubTotal || 0);
        const cf = fmtMon(r.CostoFinanciero || 0);
        const porcCF = (r.PorcCF != null) ? `${Number(r.PorcCF).toFixed(2)}%`
            : ((r.MontoSubTotal > 0) ? `${(Number(r.CostoFinanciero) * 100 / Number(r.MontoSubTotal)).toFixed(2)}%` : '0.00%');
        const item = document.createElement('div'); item.className = 'item';
        item.innerHTML = `
            <div class="top">
                <div class="rate">${rate}</div>
                <div class="pill">Pedidos: ${pedidos}</div>
            </div>
            <div class="d-flex justify-content-between">
                <div class="muted">Ventas: ${ventas}</div>
                <div class="muted">C.F.: ${cf} · ${porcCF}</div>
            </div>`;
        el.appendChild(item);
    });
}

/* ====================== Export PDF ====================== */
function showOverlay(msg = 'Procesando…') {
    let ov = $id('ad-busy');
    if (!ov) {
        ov = document.createElement('div'); ov.id = 'ad-busy';
        ov.style.cssText = `position:fixed;inset:0;z-index:2147483647;background:rgba(8,12,28,.58);
            display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);
            color:#e7e9fb;font-family:system-ui,-apple-system,Segoe UI,Roboto;`;
        ov.innerHTML = `<div style="min-width:260px;padding:18px 22px;border-radius:14px;border:1px solid rgba(255,255,255,.08);
            background:linear-gradient(180deg,rgba(24,28,52,.95),rgba(17,22,44,.92));box-shadow:0 18px 50px rgba(0,0,0,.45);
            display:flex;gap:12px;align-items:center;">
            <div class="spinner-border" role="status" style="width:22px;height:22px"></div>
            <div id="ad-busy-text" style="font-weight:600;letter-spacing:.2px"></div></div>`;
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
