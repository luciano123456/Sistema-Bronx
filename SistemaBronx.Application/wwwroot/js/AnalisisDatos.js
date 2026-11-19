/* =======================================================================
 * Análisis de datos v6.0
 *  - Todo se calcula en el servidor (código C#, sin stored procedures).
 *  - Ventas: abonado - IVA (21% transf./tarjeta) - costo financiero (tarjeta) = ganancia neta.
 *  - Gastos: neto = importe (transferencia: importe / 1,21).  Igual que "ANALISIS BRONX.xlsx".
 * ======================================================================= */
(function () {
    'use strict';

    /* ============================ utilidades ============================ */
    const $id = id => document.getElementById(id);
    const nfInt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
    const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sgn = (n, body) => (Number(n) < 0 ? '-' : '') + '$ ' + body;
    const mon0 = n => sgn(n, nfInt.format(Math.abs(Number(n || 0))));
    const mon2 = n => sgn(n, nf2.format(Math.abs(Number(n || 0))));
    const int = n => nfInt.format(Number(n || 0));
    const dec2 = n => nf2.format(Number(n || 0));
    const pct = n => (n === null || n === undefined) ? '—' : nf1.format(Number(n)) + '%';
    const safe = a => Array.isArray(a) ? a : [];
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseIso = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
    const fechaCorta = s => { const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const lastDayOfMonth = (y, m0) => new Date(y, m0 + 1, 0);
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const MESES_C = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const claveMes = clave => { const [y, m] = clave.split('-').map(Number); return `${MESES_C[m - 1]} ${y}`; };
    const sum = (arr, f) => safe(arr).reduce((a, x) => a + (Number(f(x)) || 0), 0);

    const COL = {
        azul: '#5b8cff', violeta: '#7a61ff', verde: '#2ecc71', rojo: '#ff5c7a', naranja: '#f59c30',
        cian: '#38d0f0', gris: '#9aa1c6', amarillo: '#e8c439', rosa: '#ff7ad9'
    };
    const GRID = 'rgba(255,255,255,.07)', TICK = 'rgba(255,255,255,.65)', TEXT = '#e7e9fb';
    const alpha = (hex, a) => {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    /* ============================== estado ============================== */
    const state = {
        meta: null,
        mode: 'year',               // preset | year | month | custom
        preset: null,
        anio: null, mesA: null, mesB: null,
        desde: null, hasta: null,
        data: null,
        ventas: null, gastos: null,
        ventasFormaSel: '', gastosTipoSel: '',
        tab: 'resumen',
        rendered: {},               // pane -> versión de datos ya dibujada
        version: 0,
        metric: 'Unidades', orden: 'mas',
        abort: null
    };
    const CH = {};
    let flat = null;
    const T = {};                   // tablas (instancias)

    /* ============================ init / eventos ============================ */
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        configurarChart();

        const [meta] = await Promise.all([cargarMeta(), cargarClientes()]);
        state.meta = meta;

        construirChipsAnio();
        construirChipsMes();
        construirFormasPago();

        flat = flatpickr('#ad-flatpickr', {
            mode: 'range', dateFormat: 'd/m/Y', locale: 'es', allowInput: false,
            onClose: sel => { if (sel.length === 2) setCustom(sel[0], sel[1]); else if (sel.length === 1) setCustom(sel[0], sel[0]); }
        });

        $id('ad-chips-quick').addEventListener('click', e => {
            const b = e.target.closest('[data-preset]'); if (!b) return;
            setPreset(b.dataset.preset); panelPeriodo(false);
        });
        $id('ad-chips-year').addEventListener('click', e => {
            const b = e.target.closest('[data-year]'); if (!b) return;
            setAnio(Number(b.dataset.year)); panelPeriodo(false);
        });
        $id('ad-chips-month').addEventListener('click', e => {
            const b = e.target.closest('[data-month]'); if (!b) return;
            const m = Number(b.dataset.month);
            // Re-clic en el mes activo = vuelve al año completo y deja el panel abierto para elegir otro mes.
            // Con Shift (varios meses) también queda abierto hasta "Listo".
            const deselecciona = !e.shiftKey && state.mode === 'month' && state.mesA === m && state.mesB === m;
            setMes(m, e.shiftKey);
            if (!e.shiftKey && !deselecciona) panelPeriodo(false);
        });
        $id('ad-pp-toggle').addEventListener('click', () => panelPeriodo(!$id('ad-pp').classList.contains('is-open')));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && $id('ad-pp').classList.contains('is-open')) panelPeriodo(false); });
        panelPeriodo(false);

        $id('btnConsultar').addEventListener('click', consultar);
        $id('btnExportar').addEventListener('click', exportarPDF);
        $('#filtroCliente').on('change', consultar);
        $id('filtroFormaPago').addEventListener('change', consultar);
        $id('filtroTopN').addEventListener('change', () => { if (state.data) { state.rendered.productos = null; renderPane(state.tab); } });

        $id('ad-tabs').addEventListener('click', e => {
            const b = e.target.closest('[data-tab]'); if (b) cambiarTab(b.dataset.tab);
        });

        $id('prod-metricas').addEventListener('click', e => {
            const b = e.target.closest('[data-metric]'); if (!b) return;
            state.metric = b.dataset.metric;
            document.querySelectorAll('#prod-metricas .chip').forEach(c => c.classList.toggle('active', c === b));
            seguro(renderProductosChart);
        });
        $id('prod-orden').addEventListener('click', e => {
            const b = e.target.closest('[data-orden]'); if (!b) return;
            state.orden = b.dataset.orden;
            document.querySelectorAll('#prod-orden .ad-seg__btn').forEach(c => c.classList.toggle('active', c === b));
            seguro(renderProductosChart);
        });

        // Por defecto: el año más reciente con datos (o el actual)
        const anios = state.meta.Anios || [];
        setAnio(anios.length ? anios[anios.length - 1] : hoy().getFullYear());
    }

    function configurarChart() {
        if (!window.Chart) return;
        Chart.defaults.color = TEXT;
        Chart.defaults.font.family = 'system-ui,-apple-system,Segoe UI,Roboto';
        Chart.defaults.font.size = 12;
        Chart.defaults.scale.grid.color = GRID;
        Chart.defaults.scale.ticks.color = TICK;
        Chart.defaults.elements.bar.borderRadius = 4;
        Chart.defaults.elements.bar.borderSkipped = false;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.responsive = true;
        // No reemplazar el objeto: Chart.js toma de acá las claves (type, fn…) con las que anima los colores;
        // sin ellas el hover tira "this._fn is not a function" y deja trabado el animador de TODOS los charts.
        Object.assign(Chart.defaults.animation, { duration: 450, easing: 'easeOutQuart' });
        Chart.defaults.plugins.legend.labels.boxWidth = 10;
        Chart.defaults.plugins.legend.labels.boxHeight = 10;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,20,38,.96)';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.12)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 10;
    }

    /* ============================ carga de maestros ============================ */
    async function cargarMeta() {
        try {
            const res = await fetch('/AnalisisDatos/Meta', { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (e) {
            console.error('Meta', e);
            const y = hoy().getFullYear();
            return { PrimeraFecha: null, UltimaFecha: null, Anios: [y - 1, y], FormasPago: [] };
        }
    }

    async function cargarClientes() {
        try {
            const res = await fetch('/Clientes/Lista');
            if (!res.ok) throw new Error('Error al obtener clientes');
            const data = await res.json();
            const sl = $('#filtroCliente');
            sl.empty().append(new Option('Todos', '', true, true));
            safe(data).forEach(c => sl.append(new Option((c.Nombre || '(Sin nombre)').trim(), c.Id)));
            sl.select2({ width: '240px', placeholder: 'Todos', allowClear: true, theme: 'default' });
        } catch (err) {
            console.error('Error al cargar clientes:', err);
        }
    }

    function construirFormasPago() {
        const sl = $id('filtroFormaPago');
        sl.innerHTML = '<option value="">Todas</option>' +
            safe(state.meta.FormasPago).map(f => `<option value="${f.Id}">${esc(f.Nombre)}</option>`).join('');
    }

    /* ============================ chips: período ============================ */
    function construirChipsAnio() {
        $id('ad-chips-year').innerHTML = safe(state.meta.Anios).map(a => `<button class="chip" data-year="${a}">${a}</button>`).join('');
    }
    function construirChipsMes() {
        $id('ad-chips-month').innerHTML = MESES_C.map((m, i) => `<button class="chip" data-month="${i}" title="${MESES[i]}">${m}</button>`).join('');
    }

    function pintarChips() {
        document.querySelectorAll('#ad-chips-quick .chip').forEach(c =>
            c.classList.toggle('active', state.mode === 'preset' && c.dataset.preset === state.preset));

        document.querySelectorAll('#ad-chips-year .chip').forEach(c =>
            c.classList.toggle('active', (state.mode === 'year' || state.mode === 'month') && Number(c.dataset.year) === state.anio));

        document.querySelectorAll('#ad-chips-month .chip').forEach(c => {
            const m = Number(c.dataset.month);
            c.classList.toggle('active', state.mode === 'month' && m >= state.mesA && m <= state.mesB);
        });

        $id('ad-pp-actual').textContent = etiquetaPeriodo();
    }

    function etiquetaPeriodo() {
        switch (state.mode) {
            case 'preset': return $id('ad-chips-quick').querySelector(`[data-preset="${state.preset}"]`)?.textContent.trim() || 'Período';
            case 'year': return `Año ${state.anio}`;
            case 'month': return state.mesA === state.mesB
                ? `${MESES[state.mesA]} ${state.anio}`
                : `${MESES_C[state.mesA]} – ${MESES_C[state.mesB]} ${state.anio}`;
            default: return state.desde ? `${fechaCorta(iso(state.desde))} – ${fechaCorta(iso(state.hasta))}` : 'Período';
        }
    }

    // Panel de período plegable: cerrado muestra solo el período activo; abierto, los chips de Rápido / Año / Mes.
    function panelPeriodo(abrir) {
        const pp = $id('ad-pp'), body = $id('ad-pp-body'), btn = $id('ad-pp-toggle');
        if (!abrir && body.contains(document.activeElement)) btn.focus({ preventScroll: true });
        pp.classList.toggle('is-open', abrir);
        btn.setAttribute('aria-expanded', String(abrir));
        body.inert = !abrir;
        btn.querySelector('.ad-pp__txt').textContent = abrir ? 'Listo' : 'Cambiar período';
        btn.title = abrir ? 'Cerrar el selector de período (Esc)' : 'Elegir otro período';
    }

    function aplicarRango(desde, hasta) {
        state.desde = desde; state.hasta = hasta;
        pintarChips();
        consultar();
    }

    function setPreset(key) {
        const t = hoy();
        let d = t, h = t;
        switch (String(key)) {
            case 'hoy': break;
            case '7': d = addDays(t, -6); break;
            case '30': d = addDays(t, -29); break;
            case '90': d = addDays(t, -89); break;
            case 'mes': d = new Date(t.getFullYear(), t.getMonth(), 1); h = lastDayOfMonth(t.getFullYear(), t.getMonth()); break;
            case 'mesAnt': { const f = new Date(t.getFullYear(), t.getMonth() - 1, 1); d = f; h = lastDayOfMonth(f.getFullYear(), f.getMonth()); break; }
            case 'ytd': d = new Date(t.getFullYear(), 0, 1); break;
            case '365': d = addDays(t, -364); break;
            case 'todo': d = state.meta?.PrimeraFecha ? parseIso(state.meta.PrimeraFecha) : new Date(2025, 0, 1); break;
            default: d = addDays(t, -29);
        }
        state.mode = 'preset'; state.preset = String(key);
        state.anio = null; state.mesA = state.mesB = null;
        flat?.clear();
        aplicarRango(d, h);
    }

    function setAnio(y) {
        state.mode = 'year'; state.preset = null;
        state.anio = y; state.mesA = state.mesB = null;
        flat?.clear();
        aplicarRango(new Date(y, 0, 1), new Date(y, 11, 31));
    }

    function setMes(m, shift) {
        const anios = state.meta.Anios || [];
        const y = state.anio ?? (anios.length ? anios[anios.length - 1] : hoy().getFullYear());

        if (shift && state.mode === 'month' && state.mesA !== null) {
            const ancla = state.mesAncla ?? state.mesA;
            state.mesA = Math.min(ancla, m); state.mesB = Math.max(ancla, m);
        } else if (state.mode === 'month' && state.mesA === m && state.mesB === m) {
            return setAnio(y);                       // clic de nuevo en el mismo mes: vuelve al año completo
        } else {
            state.mesA = state.mesB = m; state.mesAncla = m;
        }
        state.mode = 'month'; state.preset = null; state.anio = y;
        flat?.clear();
        aplicarRango(new Date(y, state.mesA, 1), lastDayOfMonth(y, state.mesB));
    }

    function setCustom(a, b) {
        const d = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        const h = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        state.mode = 'custom'; state.preset = null; state.anio = null; state.mesA = state.mesB = null;
        aplicarRango(d <= h ? d : h, d <= h ? h : d);
    }

    /* ============================ consulta ============================ */
    function filtrosQuery() {
        const p = new URLSearchParams();
        p.set('desde', iso(state.desde));
        p.set('hasta', iso(state.hasta));
        const cli = $('#filtroCliente').val(); if (cli) p.set('idCliente', cli);
        const fp = $id('filtroFormaPago').value; if (fp) p.set('idFormaPago', fp);
        return p;
    }

    async function getJson(url, signal) {
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
        if (!res.ok) throw new Error((await res.text()) || 'Error consultando');
        return res.json();
    }

    function mostrarError(msg) {
        const el = $id('ad-error');
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    async function consultar() {
        if (!state.desde || !state.hasta) return;
        state.abort?.abort();
        const ctl = new AbortController();
        state.abort = ctl;

        toggleBtn(true);
        mostrarError('');
        try {
            const q = filtrosQuery().toString();
            state.data = await getJson('/AnalisisDatos/Datos?' + q, ctl.signal);
            state.ventas = null; state.gastos = null;
            state.version++;
            state.rendered = {};
            renderCabecera();
            renderPane(state.tab);
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error(e);
            mostrarError('No se pudo cargar el análisis: ' + (e.message || e));
        } finally {
            if (state.abort === ctl) { toggleBtn(false); state.abort = null; }
        }
    }

    function toggleBtn(b) {
        const btn = $id('btnConsultar');
        btn.disabled = b;
        btn.innerHTML = b
            ? '<span class="spinner-border spinner-border-sm me-2"></span>Cargando…'
            : '<i class="ti ti-refresh me-1"></i> Actualizar';
        $id('ad-root').classList.toggle('ad-loading', b);
    }

    function cambiarTab(tab) {
        state.tab = tab;
        document.querySelectorAll('#ad-tabs .ad-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.ad-pane').forEach(p => p.hidden = (p.id !== 'pane-' + tab));
        renderPane(tab);
    }

    /* ============================ cabecera (período + aviso) ============================ */
    function renderCabecera() {
        const d = state.data; if (!d) return;
        const dias = Math.round((parseIso(d.Hasta) - parseIso(d.Desde)) / 86400000) + 1;
        let html = `<i class="ti ti-calendar-event"></i> <b>${fechaCorta(d.Desde)}</b> al <b>${fechaCorta(d.Hasta)}</b> · ${dias} día${dias === 1 ? '' : 's'}` +
            ` <span class="ad-periodo__vs">comparado con ${fechaCorta(d.DesdeAnterior)} al ${fechaCorta(d.HastaAnterior)}</span>`;
        if (!d.GastosAplican)
            html += ` <span class="ad-periodo__warn"><i class="ti ti-info-circle"></i> Filtrando por cliente: los gastos y el resultado no aplican.</span>`;
        $id('ad-periodo').innerHTML = html;
    }

    /* ============================ render por pestaña ============================ */
    function renderPane(tab) {
        if (!state.data) return;
        if (state.rendered[tab] === state.version) return;
        state.rendered[tab] = state.version;

        if (tab === 'resumen') renderResumen();
        else if (tab === 'productos') renderProductos();
        else if (tab === 'ventas') cargarVentas();
        else if (tab === 'gastos') renderGastos();
    }

    /* ======================================================================
     *                               RESUMEN
     * ====================================================================== */
    // Cada bloque se dibuja aislado: si uno falla se loguea y los demás siguen.
    function seguro(fn, ...args) {
        try { return fn(...args); }
        catch (e) { console.error(`Análisis de datos: falló ${fn.name}`, e); }
    }

    function renderResumen() {
        const d = state.data;
        [renderKpis, renderCascada, renderEvolucion, renderTablaMensual, renderMedios,
            renderInteranual, renderComposicion, renderDiaSemana, renderTablaClientes].forEach(fn => seguro(fn, d));
    }

    /* ---------------------------- KPIs ---------------------------- */
    function delta(cur, prev, invert) {
        cur = Number(cur || 0); prev = Number(prev || 0);
        if (prev === 0) return cur === 0 ? '' : '<span class="ad-delta ad-delta--new">nuevo</span>';
        const p = (cur - prev) / Math.abs(prev) * 100;
        if (Math.abs(p) < 0.05) return '<span class="ad-delta ad-delta--flat">= igual</span>';
        const up = p > 0;
        const bueno = invert ? !up : up;
        return `<span class="ad-delta ${bueno ? 'ad-delta--good' : 'ad-delta--bad'}">${up ? '▲' : '▼'} ${nf1.format(Math.abs(p))}%</span>`;
    }

    function renderKpis(d) {
        const k = d.Kpis, a = d.KpisAnterior, g = d.GastosAplican;
        const defs = [
            { label: 'Ventas cobradas', icon: 'ti-cash', grad: 'blue', value: mon0(k.Ventas), cur: k.Ventas, prev: a.Ventas, hint: 'Suma del importe abonado de los pedidos (columna "Importe Abonado" de la planilla).' },
            { label: 'Ganancia neta', icon: 'ti-moneybag', grad: 'green', value: mon0(k.GananciaNeta), cur: k.GananciaNeta, prev: a.GananciaNeta, sub: `${pct(k.Ventas ? k.GananciaNeta / k.Ventas * 100 : null)} de lo cobrado`, hint: 'Abonado − IVA − costo financiero. Es el "ingreso en mano".' },
            { label: 'Gastos netos', icon: 'ti-credit-card-off', grad: 'red', value: g ? mon0(k.GastosNeto) : '—', cur: k.GastosNeto, prev: a.GastosNeto, invert: true, off: !g, sub: g ? `Insumos ${mon0(k.GastosInsumosNeto)} · Operativos ${mon0(k.GastosOperativosNeto)}` : '', hint: 'Gastos del período. Transferencias sin IVA (importe ÷ 1,21), igual que la planilla.' },
            { label: 'Resultado', icon: 'ti-chart-infographic', grad: 'purple', value: g ? mon0(k.Resultado) : '—', cur: k.Resultado, prev: a.Resultado, off: !g, tone: k.Resultado >= 0 ? 'pos' : 'neg', sub: g ? `${pct(k.ResultadoPct)} de la ganancia neta` : '', hint: 'Ganancia neta − gastos netos.' },
            { label: 'Pedidos / Unidades', icon: 'ti-shopping-cart', grad: 'orange', value: `${int(k.Pedidos)} / ${int(k.Unidades)}`, cur: k.Pedidos, prev: a.Pedidos, sub: `${int(k.Clientes)} clientes`, hint: 'Pedidos con importe abonado > 0 y unidades de producto.' },
            { label: 'Ticket promedio', icon: 'ti-receipt', grad: 'cyan', value: mon0(k.TicketPromedio), cur: k.TicketPromedio, prev: a.TicketPromedio, sub: `${mon0(k.VentaPorCliente)} por cliente`, hint: 'Ventas cobradas ÷ pedidos.' },
            { label: 'Margen bruto', icon: 'ti-percentage', grad: 'zebra', value: pct(k.MargenBrutoPct), cur: k.MargenBrutoPct, prev: a.MargenBrutoPct, sub: `${mon0(k.MargenBruto)} sobre costo`, hint: 'Facturado (con descuento) − costo de los productos vendidos.' },
            { label: 'IVA + costo financiero', icon: 'ti-building-bank', grad: 'rose', value: mon0(k.Iva + k.CostoFinanciero), cur: k.Iva + k.CostoFinanciero, prev: a.Iva + a.CostoFinanciero, invert: true, sub: `IVA ${mon0(k.Iva)} · CF ${mon0(k.CostoFinanciero)}`, hint: 'Lo que se va de lo cobrado por transferencias y tarjetas.' },
            { label: 'Saldo a cobrar', icon: 'ti-hourglass', grad: 'blue', value: mon0(k.SaldoPendiente), cur: k.SaldoPendiente, prev: a.SaldoPendiente, invert: true, sub: 'pedidos con saldo', hint: 'Suma del saldo pendiente de los pedidos del período.' }
        ];

        $id('ad-kpis').innerHTML = defs.map(x => `
            <div class="ad-kpi ${x.tone ? 'ad-kpi--' + x.tone : ''}" title="${esc(x.hint)}">
                <div class="ad-kpi__icon bg-grad-${x.grad}"><i class="ti ${x.icon}"></i></div>
                <div class="ad-kpi__body">
                    <span class="ad-kpi__label">${esc(x.label)}</span>
                    <div class="ad-kpi__value">${esc(x.value)}</div>
                    <div class="ad-kpi__foot">
                        ${x.off ? '' : delta(x.cur, x.prev, x.invert)}
                        <span class="ad-kpi__sub">${esc(x.sub || '')}</span>
                    </div>
                </div>
            </div>`).join('');
    }

    /* ---------------------------- charts: helpers ---------------------------- */
    function make(id, cfg) {
        if (CH[id]) { CH[id].destroy(); CH[id] = null; }
        const el = $id(id); if (!el) return null;
        CH[id] = new Chart(el, cfg);
        return CH[id];
    }
    const money = (v) => mon0(v);
    const tickMoney = v => {
        const a = Math.abs(v);
        if (a >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + ' MM';
        if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' M';
        if (a >= 1e3) return (v / 1e3).toFixed(0) + ' k';
        return v;
    };
    const baseOpts = (extra = {}) => ({
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { color: TEXT } },
            tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.y ?? c.parsed)}` } }
        },
        scales: {
            x: { grid: { color: GRID }, ticks: { color: TICK } },
            y: { grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } }
        },
        ...extra
    });
    const emptyGuard = (id, rows, msg = 'Sin datos para el período') => {
        const wrap = $id(id)?.closest('.ad-chart'); if (!wrap) return false;
        let el = wrap.querySelector('.ad-empty');
        const vacio = !rows || rows.length === 0;
        if (vacio) {
            if (CH[id]) { CH[id].destroy(); CH[id] = null; }
            if (!el) { el = document.createElement('div'); el.className = 'ad-empty'; wrap.appendChild(el); }
            el.textContent = msg;
        } else if (el) el.remove();
        return vacio;
    };

    /* ---------------------------- cascada ---------------------------- */
    function renderCascada(d) {
        const k = d.Kpis, g = d.GastosAplican;
        const pasos = [];
        let run = 0;
        const total = (label, v, color) => { pasos.push({ label, v, range: [Math.min(0, v), Math.max(0, v)], color }); run = v; };
        const resta = (label, v, color) => { const ini = run; run = run - v; pasos.push({ label, v: -v, range: [Math.min(ini, run), Math.max(ini, run)], color }); };

        total('Ventas cobradas', k.Ventas, COL.azul);
        resta('IVA', k.Iva, COL.naranja);
        resta('Costo financiero', k.CostoFinanciero, COL.amarillo);
        total('Ganancia neta', k.GananciaNeta, COL.verde);
        if (g) {
            resta('Gastos insumos', k.GastosInsumosNeto, COL.rojo);
            resta('Gastos operativos', k.GastosOperativosNeto, COL.rosa);
            const otros = k.GastosNeto - k.GastosInsumosNeto - k.GastosOperativosNeto;
            if (Math.abs(otros) > 0.5) resta('Otros gastos', otros, COL.gris);
            total('Resultado', run, run >= 0 ? COL.violeta : COL.rojo);
        }

        if (emptyGuard('ch_cascada', k.Ventas || k.GastosNeto ? [1] : [])) return;

        make('ch_cascada', {
            type: 'bar',
            data: {
                labels: pasos.map(p => p.label),
                datasets: [{ data: pasos.map(p => p.range), backgroundColor: pasos.map(p => alpha(p.color, .78)), borderColor: pasos.map(p => p.color), borderWidth: 1.2 }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => ' ' + money(pasos[c.dataIndex].v) } }
                },
                scales: {
                    x: { grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } },
                    y: { grid: { display: false }, ticks: { color: TEXT } }
                }
            }
        });
    }

    /* ---------------------------- evolución ---------------------------- */
    function recortarFuturo(serie, granularidad) {
        // En meses: no mostrar los meses futuros ni el mes en curso mientras estén vacíos (p. ej. un año en curso);
        // si no, las líneas "caen" a 0 y la variación interanual da -100%.
        if (granularidad !== 'mes') return serie;
        const h = hoy();
        const out = serie.slice();
        while (out.length > 1) {
            const p = out[out.length - 1], d = parseIso(p.Desde);
            if (lastDayOfMonth(d.getFullYear(), d.getMonth()) >= h && !p.Ventas && !p.GastosNeto) out.pop(); else break;
        }
        return out;
    }
    const etiquetaPunto = (p, gran) => gran === 'dia' ? fechaCorta(p.Clave).slice(0, 5) : claveMes(p.Clave);

    function renderEvolucion(d) {
        const gran = d.Granularidad;
        const serie = recortarFuturo(safe(d.Serie), gran);
        $id('ad-evo-sub').textContent = gran === 'dia' ? 'por día' : 'por mes';
        if (emptyGuard('ch_evolucion', serie.filter(p => p.Ventas || p.GastosNeto))) return;

        const labels = serie.map(p => etiquetaPunto(p, gran));
        const ds = [
            { type: 'bar', label: 'Ventas cobradas', data: serie.map(p => p.Ventas), backgroundColor: alpha(COL.azul, .45), borderColor: COL.azul, borderWidth: 1, order: 4 },
            { type: 'line', label: 'Ganancia neta', data: serie.map(p => p.GananciaNeta), borderColor: COL.verde, backgroundColor: COL.verde, tension: .3, pointRadius: gran === 'dia' ? 0 : 3, borderWidth: 2, order: 1 }
        ];
        if (d.GastosAplican) {
            ds.push({ type: 'line', label: 'Gastos netos', data: serie.map(p => p.GastosNeto), borderColor: COL.rojo, backgroundColor: COL.rojo, tension: .3, pointRadius: gran === 'dia' ? 0 : 3, borderWidth: 2, order: 2 });
            ds.push({ type: 'line', label: 'Resultado', data: serie.map(p => p.Resultado), borderColor: COL.violeta, backgroundColor: COL.violeta, borderDash: [6, 4], tension: .3, pointRadius: gran === 'dia' ? 0 : 3, borderWidth: 2, order: 3 });
        }
        make('ch_evolucion', { type: 'bar', data: { labels, datasets: ds }, options: baseOpts() });
    }

    /* ---------------------------- resumen mensual (como la planilla) ---------------------------- */
    function renderTablaMensual(d) {
        const g = d.GastosAplican;
        const rows = recortarFuturo(safe(d.Mensual), 'mes');
        const sinG = v => g ? mon0(v) : '<span class="ad-muted">—</span>';

        if (!T.mensual) {
            T.mensual = createTable($id('tbl_mensual'), {
                pageSize: 120, pager: false, search: false, csvName: 'resumen-mensual',
                defaultSort: { key: 'mes', dir: 'asc' },
                onRowClick: row => { const [y, m] = row.Clave.split('-').map(Number); state.anio = y; state.mesAncla = m - 1; state.mesA = state.mesB = m - 1; state.mode = 'month'; flat?.clear(); aplicarRango(new Date(y, m - 1, 1), lastDayOfMonth(y, m - 1)); },
                columns: []
            });
        }
        T.mensual.setColumns([
            { key: 'mes', title: 'Mes', val: r => r.Clave, fmt: (v, r) => `<b>${claveMes(r.Clave)}</b>`, csv: r => claveMes(r.Clave), total: () => 'TOTAL' },
            { key: 'ped', title: 'Pedidos', align: 'r', val: r => r.Pedidos, fmt: v => int(v), total: rs => int(sum(rs, r => r.Pedidos)) },
            { key: 'ven', title: 'Ventas', align: 'r', val: r => r.Ventas, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Ventas)) },
            { key: 'iva', title: 'IVA', align: 'r', val: r => r.Iva, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Iva)) },
            { key: 'cf', title: 'Costo fin.', align: 'r', val: r => r.CostoFinanciero, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.CostoFinanciero)) },
            { key: 'net', title: 'Ganancia neta', align: 'r', val: r => r.GananciaNeta, fmt: v => `<b>${mon0(v)}</b>`, total: rs => `<b>${mon0(sum(rs, r => r.GananciaNeta))}</b>` },
            { key: 'gi', title: 'Gastos insumos', align: 'r', val: r => r.GastosInsumosNeto, fmt: v => sinG(v), total: rs => sinG(sum(rs, r => r.GastosInsumosNeto)) },
            { key: 'go', title: 'Gastos operativos', align: 'r', val: r => r.GastosOperativosNeto, fmt: v => sinG(v), total: rs => sinG(sum(rs, r => r.GastosOperativosNeto)) },
            { key: 'res', title: 'Resultado', align: 'r', val: r => r.Resultado, fmt: v => g ? `<b class="${v >= 0 ? 'ad-pos' : 'ad-neg'}">${mon0(v)}</b>` : '—', total: rs => g ? tono(sum(rs, r => r.Resultado)) : '—' },
            { key: 'var', title: 'Vs año ant.', align: 'r', val: r => r.VariacionVentasPct ?? -Infinity, fmt: (v, r) => varPct(r.VariacionVentasPct), csv: r => r.VariacionVentasPct ?? '', total: () => '' }
        ]);
        T.mensual.setRows(rows);
    }
    const tono = v => `<b class="${v >= 0 ? 'ad-pos' : 'ad-neg'}">${mon0(v)}</b>`;
    const varPct = v => v === null || v === undefined ? '<span class="ad-muted">—</span>' : `<span class="${v >= 0 ? 'ad-pos' : 'ad-neg'}">${v >= 0 ? '▲' : '▼'} ${nf1.format(Math.abs(v))}%</span>`;

    /* ---------------------------- medios de pago ---------------------------- */
    function renderMedios(d) {
        const rows = safe(d.MediosPago);
        const paleta = [COL.azul, COL.verde, COL.naranja, COL.violeta, COL.cian, COL.rosa, COL.amarillo, COL.rojo];
        if (!emptyGuard('ch_medios', rows)) {
            make('ch_medios', {
                type: 'doughnut',
                data: { labels: rows.map(r => r.FormaPago), datasets: [{ data: rows.map(r => r.Ventas), backgroundColor: rows.map((_, i) => alpha(paleta[i % paleta.length], .8)), borderColor: '#0e1224', borderWidth: 2 }] },
                options: {
                    cutout: '62%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: TEXT } },
                        tooltip: { callbacks: { label: c => ` ${c.label}: ${money(c.parsed)} (${pct(rows[c.dataIndex].ParticipacionPct)})` } }
                    }
                }
            });
        }
        if (!T.medios) T.medios = createTable($id('tbl_medios'), { pageSize: 20, pager: false, search: false, csv: false, columns: [] });
        T.medios.setColumns([
            { key: 'fp', title: 'Forma de pago', val: r => r.FormaPago, fmt: v => esc(v), total: () => 'TOTAL' },
            { key: 'n', title: 'Ped.', align: 'r', val: r => r.Pedidos, fmt: v => int(v), total: rs => int(sum(rs, r => r.Pedidos)) },
            { key: 'v', title: 'Ventas', align: 'r', val: r => r.Ventas, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Ventas)) },
            { key: 'iva', title: 'IVA', align: 'r', val: r => r.Iva, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Iva)) },
            { key: 'cf', title: 'CF', align: 'r', val: r => r.CostoFinanciero, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.CostoFinanciero)) },
            { key: 'p', title: '%', align: 'r', val: r => r.ParticipacionPct ?? 0, fmt: v => pct(v), total: () => '100%' }
        ]);
        T.medios.setRows(rows);
    }

    /* ---------------------------- interanual ---------------------------- */
    function renderInteranual(d) {
        const rows = recortarFuturo(safe(d.Mensual), 'mes');
        if (emptyGuard('ch_interanual', rows.filter(r => r.Ventas || r.VentasAnioAnterior))) return;
        make('ch_interanual', {
            type: 'bar',
            data: {
                labels: rows.map(r => claveMes(r.Clave)),
                datasets: [
                    { label: 'Período actual', data: rows.map(r => r.Ventas), backgroundColor: alpha(COL.azul, .7), borderColor: COL.azul, borderWidth: 1 },
                    { label: 'Mismo mes año anterior', data: rows.map(r => r.VentasAnioAnterior ?? 0), backgroundColor: alpha(COL.gris, .45), borderColor: COL.gris, borderWidth: 1 }
                ]
            },
            options: baseOpts({
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${money(c.parsed.y)}`,
                            afterBody: items => {
                                const r = rows[items[0].dataIndex];
                                return r.VariacionVentasPct == null ? '' : `Variación: ${r.VariacionVentasPct >= 0 ? '+' : ''}${nf1.format(r.VariacionVentasPct)}%`;
                            }
                        }
                    }
                }
            })
        });
    }

    /* ---------------------------- composición ---------------------------- */
    function renderComposicion(d) {
        const gran = d.Granularidad;
        const serie = recortarFuturo(safe(d.Serie), gran);
        if (emptyGuard('ch_composicion', serie.filter(p => p.Ventas))) return;
        make('ch_composicion', {
            type: 'bar',
            data: {
                labels: serie.map(p => etiquetaPunto(p, gran)),
                datasets: [
                    { label: 'Ganancia neta', data: serie.map(p => p.GananciaNeta), backgroundColor: alpha(COL.verde, .75), stack: 's' },
                    { label: 'IVA', data: serie.map(p => p.Iva), backgroundColor: alpha(COL.naranja, .75), stack: 's' },
                    { label: 'Costo financiero', data: serie.map(p => p.CostoFinanciero), backgroundColor: alpha(COL.amarillo, .75), stack: 's' }
                ]
            },
            options: baseOpts({
                scales: {
                    x: { stacked: true, grid: { color: GRID }, ticks: { color: TICK } },
                    y: { stacked: true, grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } }
                }
            })
        });
    }

    /* ---------------------------- día de la semana ---------------------------- */
    function renderDiaSemana(d) {
        const rows = safe(d.PorDiaSemana);
        if (emptyGuard('ch_diasemana', rows.filter(r => r.Ventas))) return;
        const max = Math.max(...rows.map(r => r.Ventas));
        make('ch_diasemana', {
            type: 'bar',
            data: { labels: rows.map(r => r.Nombre.slice(0, 3)), datasets: [{ label: 'Ventas', data: rows.map(r => r.Ventas), backgroundColor: rows.map(r => alpha(r.Ventas === max ? COL.verde : COL.azul, .7)), borderColor: rows.map(r => r.Ventas === max ? COL.verde : COL.azul), borderWidth: 1 }] },
            options: baseOpts({
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { title: i => rows[i[0].dataIndex].Nombre, label: c => [` Ventas: ${money(c.parsed.y)}`, ` Pedidos: ${int(rows[c.dataIndex].Pedidos)}`] } }
                }
            })
        });
    }

    /* ---------------------------- clientes ---------------------------- */
    function renderTablaClientes(d) {
        if (!T.clientes) {
            T.clientes = createTable($id('tbl_clientes'), {
                pageSize: 8, search: false, csvName: 'top-clientes', defaultSort: { key: 'v', dir: 'desc' },
                onRowClick: r => { if (r.IdCliente) { $('#filtroCliente').val(String(r.IdCliente)).trigger('change'); } },
                columns: []
            });
        }
        T.clientes.setColumns([
            { key: 'c', title: 'Cliente', val: r => r.Cliente, fmt: v => esc(v), total: () => '' },
            { key: 'n', title: 'Pedidos', align: 'r', val: r => r.Pedidos, fmt: v => int(v), total: () => '' },
            { key: 'v', title: 'Ventas', align: 'r', val: r => r.Ventas, fmt: v => mon0(v), total: () => '' },
            { key: 'g', title: 'Ganancia neta', align: 'r', val: r => r.GananciaNeta, fmt: v => mon0(v), total: () => '' },
            { key: 'u', title: 'Última compra', align: 'r', val: r => r.UltimaCompra, fmt: v => fechaCorta(v), total: () => '' }
        ]);
        T.clientes.setRows(safe(d.TopClientes));
    }

    /* ======================================================================
     *                               VENTAS
     * ====================================================================== */
    async function cargarVentas() {
        if (!T.ventas) {
            T.ventas = createTable($id('tbl_ventas'), {
                pageSize: 25, searchPlaceholder: 'Buscar cliente, forma de pago, factura…', csvName: 'ventas',
                searchKeys: r => `${r.Cliente} ${r.FormaPago} ${r.NroFactura || ''} ${r.Id}`,
                defaultSort: { key: 'fecha', dir: 'desc' },
                expand: async row => {
                    const det = await getJson('/AnalisisDatos/VentaDetalle?id=' + row.Id);
                    return htmlLineas(det);
                },
                columns: []
            });
            T.ventas.setColumns([
                { key: 'fecha', title: 'Fecha', val: r => r.Fecha, fmt: v => fechaCorta(v), csv: r => fechaCorta(r.Fecha), total: () => 'TOTAL' },
                { key: 'cli', title: 'Cliente', val: r => r.Cliente.toLowerCase(), fmt: (v, r) => esc(r.Cliente), csv: r => r.Cliente, total: rs => `${int(rs.length)} pedidos` },
                { key: 'fp', title: 'Forma de pago', val: r => r.FormaPago, fmt: v => `<span class="ad-pill">${esc(v)}</span>`, total: () => '' },
                { key: 'ab', title: 'Importe abonado', align: 'r', val: r => r.ImporteAbonado, fmt: v => mon2(v), total: rs => mon2(sum(rs, r => r.ImporteAbonado)) },
                { key: 'cfp', title: '% C. financiero', align: 'r', val: r => r.CostoFinancieroPorc, fmt: v => v ? pct(v) : '<span class="ad-muted">—</span>', total: () => '' },
                { key: 'iva', title: 'IVA', align: 'r', val: r => r.Iva, fmt: v => v ? mon2(v) : '<span class="ad-muted">—</span>', total: rs => mon2(sum(rs, r => r.Iva)) },
                { key: 'cf', title: 'Costo financiero', align: 'r', val: r => r.CostoFinanciero, fmt: v => v ? mon2(v) : '<span class="ad-muted">—</span>', total: rs => mon2(sum(rs, r => r.CostoFinanciero)) },
                { key: 'net', title: 'Ganancia neta', align: 'r', val: r => r.GananciaNeta, fmt: v => `<b>${mon2(v)}</b>`, total: rs => `<b>${mon2(sum(rs, r => r.GananciaNeta))}</b>` },
                { key: 'dto', title: 'Dto.', align: 'r', val: r => r.PorcDescuento, fmt: v => v ? pct(v) : '<span class="ad-muted">—</span>', total: () => '' },
                { key: 'sal', title: 'Saldo', align: 'r', val: r => r.Saldo, fmt: v => v ? `<span class="ad-neg">${mon2(v)}</span>` : '<span class="ad-muted">—</span>', total: rs => mon2(sum(rs, r => r.Saldo)) }
            ]);
            $id('ventas-chips').addEventListener('click', e => {
                const b = e.target.closest('[data-fp]'); if (!b) return;
                state.ventasFormaSel = b.dataset.fp;
                aplicarFiltroVentas();
            });
        }

        T.ventas.setLoading(true);
        const mio = state.version;
        try {
            const res = await getJson('/AnalisisDatos/Ventas?' + filtrosQuery().toString());
            if (mio !== state.version) return;
            state.ventas = res;
            state.ventasFormaSel = '';
            aplicarFiltroVentas();
        } catch (e) {
            console.error(e); mostrarError('No se pudo cargar el detalle de ventas: ' + e.message);
            T.ventas.setLoading(false);
        }
    }

    function aplicarFiltroVentas() {
        const todas = safe(state.ventas?.Filas);
        const cuentas = {};
        todas.forEach(f => { cuentas[f.FormaPago] = (cuentas[f.FormaPago] || 0) + 1; });

        $id('ventas-chips').innerHTML =
            `<button class="chip ${state.ventasFormaSel === '' ? 'active' : ''}" data-fp="">Todas <span class="chip__n">${todas.length}</span></button>` +
            Object.keys(cuentas).sort().map(fp => `<button class="chip ${state.ventasFormaSel === fp ? 'active' : ''}" data-fp="${esc(fp)}">${esc(fp)} <span class="chip__n">${cuentas[fp]}</span></button>`).join('');

        T.ventas.setRows(state.ventasFormaSel ? todas.filter(f => f.FormaPago === state.ventasFormaSel) : todas);
    }

    function htmlLineas(det) {
        const c = det.Cabecera, ls = safe(det.Lineas);
        const filas = ls.map(l => `
            <tr>
                <td>${esc(l.Producto)}${l.Color ? ` <span class="ad-pill ad-pill--soft">${esc(l.Color)}</span>` : ''}</td>
                <td>${esc(l.Categoria)}</td>
                <td class="r">${dec2(l.Cantidad).replace(/,00$/, '')}</td>
                <td class="r">${mon2(l.PrecioLinea)}</td>
                <td class="r">${mon2(l.PrecioLineaNeto)}</td>
                <td class="r">${mon2(l.Costo)}</td>
                <td class="r"><b class="${l.Margen >= 0 ? 'ad-pos' : 'ad-neg'}">${mon2(l.Margen)}</b></td>
                <td class="r">${pct(l.MargenPct)}</td>
            </tr>`).join('');
        return `
            <div class="ad-exp__box">
                <div class="ad-exp__meta">
                    <span><b>Pedido #${c.Id}</b> · ${fechaCorta(c.Fecha)}${c.NroFactura ? ` · Factura ${esc(c.NroFactura)}` : ''}</span>
                    <span>Total lista ${mon2(c.ImporteTotal)}${c.PorcDescuento ? ` · Dto. ${pct(c.PorcDescuento)}` : ''} · Subtotal ${mon2(c.SubTotal)}</span>
                    <span>Abonado ${mon2(c.ImporteAbonado)}${c.Saldo ? ` · Saldo ${mon2(c.Saldo)}` : ''}</span>
                    ${det.Comentarios ? `<span class="ad-muted">“${esc(det.Comentarios)}”</span>` : ''}
                </div>
                <table class="ad-mini">
                    <thead><tr><th>Producto</th><th>Categoría</th><th class="r">Cant.</th><th class="r">Precio línea</th><th class="r">Con dto.</th><th class="r">Costo</th><th class="r">Margen</th><th class="r">%</th></tr></thead>
                    <tbody>${filas || '<tr><td colspan="8" class="ad-muted">Sin líneas</td></tr>'}</tbody>
                </table>
            </div>`;
    }

    /* ======================================================================
     *                              PRODUCTOS
     * ====================================================================== */
    function renderProductos() {
        const d = state.data;
        $id('ad-prod-sub').textContent = `${int(safe(d.Productos).length)} productos distintos en el período`;
        [renderProductosChart, renderCategorias, renderBurbujas, renderTablaProductos].forEach(fn => seguro(fn, d));
    }

    const METRICAS = {
        Unidades: { label: 'Unidades', fmt: v => int(v) },
        Ingreso: { label: 'Ingresos', fmt: v => mon0(v) },
        Margen: { label: 'Margen $', fmt: v => mon0(v) },
        MargenPct: { label: 'Margen %', fmt: v => pct(v) },
        Pedidos: { label: 'Veces vendido', fmt: v => int(v) }
    };

    function renderProductosChart() {
        if (!state.data) return;
        const n = Math.max(3, Math.min(100, Number($id('filtroTopN').value) || 15));
        const m = state.metric, met = METRICAS[m];
        let rows = safe(state.data.Productos).slice();
        // Para el margen % ignoramos productos sin ingreso (no hay porcentaje que comparar).
        if (m === 'MargenPct') rows = rows.filter(r => r.MargenPct !== null && r.MargenPct !== undefined);
        // "Más" = descendente, "Menos" = ascendente; en empates manda el ingreso en el mismo sentido.
        const dir = state.orden === 'mas' ? 1 : -1;
        rows.sort((a, b) => ((b[m] - a[m]) * dir) || ((b.Ingreso - a.Ingreso) * dir));
        rows = rows.slice(0, n);

        const wrap = $id('ch_productos').closest('.ad-chart');
        wrap.style.height = Math.max(260, rows.length * 28 + 70) + 'px';
        if (emptyGuard('ch_productos', rows)) return;

        const color = state.orden === 'mas' ? COL.azul : COL.naranja;
        const trunc = s => s.length > 34 ? s.slice(0, 33) + '…' : s;

        make('ch_productos', {
            type: 'bar',
            data: {
                labels: rows.map(r => trunc(r.Producto)),
                datasets: [{
                    label: met.label, data: rows.map(r => r[m]),
                    backgroundColor: rows.map(r => r[m] < 0 ? alpha(COL.rojo, .7) : alpha(color, .7)),
                    borderColor: rows.map(r => r[m] < 0 ? COL.rojo : color), borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: i => rows[i[0].dataIndex].Producto,
                            label: c => {
                                const r = rows[c.dataIndex];
                                return [
                                    ` Unidades: ${int(r.Unidades)}  ·  Pedidos: ${int(r.Pedidos)}`,
                                    ` Ingresos: ${mon0(r.Ingreso)}`,
                                    ` Costo: ${mon0(r.Costo)}`,
                                    ` Margen: ${mon0(r.Margen)} (${pct(r.MargenPct)})`,
                                    ` Categoría: ${r.Categoria}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: GRID }, ticks: { color: TICK, callback: v => (m === 'Ingreso' || m === 'Margen') ? tickMoney(v) : (m === 'MargenPct' ? v + '%' : v) } },
                    y: { grid: { display: false }, ticks: { color: TEXT, autoSkip: false, font: { size: 11 } } }
                }
            }
        });
    }

    function renderCategorias(d) {
        const rows = safe(d.PorCategoria).slice(0, 14);
        const wrap = $id('ch_categoria').closest('.ad-chart');
        wrap.style.height = Math.max(260, rows.length * 30 + 80) + 'px';
        if (emptyGuard('ch_categoria', rows)) return;
        make('ch_categoria', {
            type: 'bar',
            data: {
                labels: rows.map(r => r.Nombre),
                datasets: [
                    { label: 'Costo', data: rows.map(r => r.Costo), backgroundColor: alpha(COL.rojo, .6), stack: 's' },
                    { label: 'Margen', data: rows.map(r => r.Margen), backgroundColor: alpha(COL.verde, .7), stack: 's' }
                ]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${money(c.parsed.x)}`,
                            afterBody: i => { const r = rows[i[0].dataIndex]; return `Ingreso: ${money(r.Ingreso)}  ·  Margen ${pct(r.MargenPct)}\nUnidades: ${int(r.Unidades)}`; }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } },
                    y: { stacked: true, grid: { display: false }, ticks: { color: TEXT, autoSkip: false } }
                }
            }
        });
    }

    function renderBurbujas(d) {
        const rows = safe(d.Productos).filter(r => r.Ingreso > 0 && r.MargenPct !== null).sort((a, b) => b.Ingreso - a.Ingreso).slice(0, 120);
        if (emptyGuard('ch_burbujas', rows)) return;
        const maxIng = Math.max(...rows.map(r => r.Ingreso));
        make('ch_burbujas', {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Productos',
                    data: rows.map(r => ({ x: r.Unidades, y: r.MargenPct, r: 4 + 20 * Math.sqrt(r.Ingreso / maxIng), p: r })),
                    backgroundColor: rows.map(r => alpha(r.MargenPct >= 50 ? COL.verde : r.MargenPct >= 30 ? COL.azul : COL.naranja, .55)),
                    borderColor: rows.map(r => r.MargenPct >= 50 ? COL.verde : r.MargenPct >= 30 ? COL.azul : COL.naranja)
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: i => i[0].raw.p.Producto,
                            label: c => { const r = c.raw.p; return [` Unidades: ${int(r.Unidades)}`, ` Margen: ${pct(r.MargenPct)}`, ` Ingresos: ${mon0(r.Ingreso)}`]; }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Unidades vendidas', color: TICK }, grid: { color: GRID }, ticks: { color: TICK } },
                    y: { title: { display: true, text: 'Margen %', color: TICK }, grid: { color: GRID }, ticks: { color: TICK, callback: v => v + '%' } }
                }
            }
        });
    }

    function renderTablaProductos(d) {
        if (!T.productos) {
            T.productos = createTable($id('tbl_productos'), {
                pageSize: 25, searchPlaceholder: 'Buscar producto o categoría…', csvName: 'productos',
                searchKeys: r => `${r.Producto} ${r.Categoria}`,
                defaultSort: { key: 'u', dir: 'desc' }, columns: []
            });
            T.productos.setColumns([
                { key: 'p', title: 'Producto', val: r => r.Producto.toLowerCase(), fmt: (v, r) => `<b>${esc(r.Producto)}</b>`, csv: r => r.Producto, total: rs => `${int(rs.length)} productos` },
                { key: 'c', title: 'Categoría', val: r => r.Categoria.toLowerCase(), fmt: (v, r) => esc(r.Categoria), csv: r => r.Categoria, total: () => '' },
                { key: 'n', title: 'Veces vendido', align: 'r', val: r => r.Pedidos, fmt: v => int(v), total: () => '' },
                { key: 'u', title: 'Unidades', align: 'r', val: r => r.Unidades, fmt: v => `<b>${int(v)}</b>`, total: rs => `<b>${int(sum(rs, r => r.Unidades))}</b>` },
                { key: 'i', title: 'Ingresos', align: 'r', val: r => r.Ingreso, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Ingreso)) },
                { key: 'co', title: 'Costo', align: 'r', val: r => r.Costo, fmt: v => mon0(v), total: rs => mon0(sum(rs, r => r.Costo)) },
                { key: 'm', title: 'Margen $', align: 'r', val: r => r.Margen, fmt: v => `<span class="${v >= 0 ? 'ad-pos' : 'ad-neg'}">${mon0(v)}</span>`, total: rs => tono(sum(rs, r => r.Margen)) },
                { key: 'mp', title: 'Margen %', align: 'r', val: r => r.MargenPct ?? -Infinity, fmt: (v, r) => barraPct(r.MargenPct), csv: r => r.MargenPct ?? '', total: rs => { const i = sum(rs, r => r.Ingreso), m = sum(rs, r => r.Margen); return i ? pct(m / i * 100) : '—'; } },
                { key: 'pp', title: '% ingresos', align: 'r', val: r => r.ParticipacionPct ?? 0, fmt: v => pct(v), total: () => '' }
            ]);
        }
        T.productos.setRows(safe(d.Productos));
    }
    const barraPct = v => {
        if (v === null || v === undefined) return '<span class="ad-muted">—</span>';
        const w = Math.max(0, Math.min(100, v));
        return `<span class="ad-bar"><span class="ad-bar__fill ${v < 0 ? 'neg' : ''}" style="width:${w}%"></span><span class="ad-bar__txt">${pct(v)}</span></span>`;
    };

    /* ======================================================================
     *                               GASTOS
     * ====================================================================== */
    async function renderGastos() {
        const d = state.data;
        if (!d.GastosAplican) {
            ['ch_gastoscat', 'ch_gastosmes'].forEach(id => emptyGuard(id, [], 'Los gastos no aplican al filtrar por cliente'));
        } else {
            seguro(renderGastosCat, d);
            seguro(renderGastosMes, d);
        }
        await cargarGastos();
    }

    function renderGastosCat(d) {
        const rows = safe(d.GastosPorCategoria).slice(0, 18);
        const wrap = $id('ch_gastoscat').closest('.ad-chart');
        wrap.style.height = Math.max(300, rows.length * 26 + 70) + 'px';
        if (emptyGuard('ch_gastoscat', rows)) return;
        const col = r => r.Tipo === 'INSUMOS' ? COL.rojo : COL.naranja;
        make('ch_gastoscat', {
            type: 'bar',
            data: {
                labels: rows.map(r => r.Categoria),
                datasets: [{ label: 'Gasto neto', data: rows.map(r => r.Neto), backgroundColor: rows.map(r => alpha(col(r), .7)), borderColor: rows.map(col), borderWidth: 1 }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => { const r = rows[c.dataIndex]; return [` Neto: ${money(r.Neto)} (${pct(r.ParticipacionPct)})`, ` Tipo: ${r.Tipo}  ·  ${int(r.Cantidad)} gastos`]; } } }
                },
                scales: {
                    x: { grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } },
                    y: { grid: { display: false }, ticks: { color: TEXT, autoSkip: false, font: { size: 11 } } }
                }
            }
        });
    }

    function renderGastosMes(d) {
        const gran = d.Granularidad;
        const serie = recortarFuturo(safe(d.Serie), gran);
        const wrap = $id('ch_gastosmes').closest('.ad-chart');
        wrap.style.height = '420px';
        if (emptyGuard('ch_gastosmes', serie.filter(p => p.GastosNeto))) return;
        make('ch_gastosmes', {
            type: 'bar',
            data: {
                labels: serie.map(p => etiquetaPunto(p, gran)),
                datasets: [
                    { label: 'Insumos', data: serie.map(p => p.GastosInsumosNeto), backgroundColor: alpha(COL.rojo, .7), stack: 's' },
                    { label: 'Operativos', data: serie.map(p => p.GastosOperativosNeto), backgroundColor: alpha(COL.naranja, .7), stack: 's' }
                ]
            },
            options: baseOpts({
                scales: {
                    x: { stacked: true, grid: { color: GRID }, ticks: { color: TICK } },
                    y: { stacked: true, grid: { color: GRID }, ticks: { color: TICK, callback: tickMoney } }
                }
            })
        });
    }

    async function cargarGastos() {
        if (!T.gastos) {
            T.gastos = createTable($id('tbl_gastos'), {
                pageSize: 25, searchPlaceholder: 'Buscar categoría, forma de pago, comentario…', csvName: 'gastos',
                searchKeys: r => `${r.Categoria} ${r.Tipo} ${r.FormaPago} ${r.Comentarios || ''}`,
                defaultSort: { key: 'fecha', dir: 'desc' }, columns: []
            });
            T.gastos.setColumns([
                { key: 'fecha', title: 'Fecha', val: r => r.Fecha, fmt: v => fechaCorta(v), csv: r => fechaCorta(r.Fecha), total: () => 'TOTAL' },
                { key: 'cat', title: 'Categoría', val: r => r.Categoria.toLowerCase(), fmt: (v, r) => `<b>${esc(r.Categoria)}</b>`, csv: r => r.Categoria, total: rs => `${int(rs.length)} gastos` },
                { key: 'tipo', title: 'Tipo', val: r => r.Tipo, fmt: v => `<span class="ad-pill ${v === 'INSUMOS' ? 'ad-pill--red' : 'ad-pill--orange'}">${esc(v)}</span>`, total: () => '' },
                { key: 'fp', title: 'Forma de pago', val: r => r.FormaPago, fmt: v => esc(v), total: () => '' },
                { key: 'imp', title: 'Importe total', align: 'r', val: r => r.ImporteTotal, fmt: v => mon2(v), total: rs => mon2(sum(rs, r => r.ImporteTotal)) },
                { key: 'net', title: 'Neto', align: 'r', val: r => r.Neto, fmt: v => `<b>${mon2(v)}</b>`, total: rs => `<b>${mon2(sum(rs, r => r.Neto))}</b>` },
                { key: 'com', title: 'Comentarios', val: r => r.Comentarios || '', fmt: v => v ? `<span class="ad-muted">${esc(v)}</span>` : '', total: () => '' }
            ]);
            $id('gastos-chips').addEventListener('click', e => {
                const b = e.target.closest('[data-tipo]'); if (!b) return;
                state.gastosTipoSel = b.dataset.tipo;
                aplicarFiltroGastos();
            });
        }

        if (!state.data.GastosAplican) { T.gastos.setRows([]); $id('gastos-chips').innerHTML = ''; return; }

        T.gastos.setLoading(true);
        const mio = state.version;
        try {
            const p = filtrosQuery(); p.delete('idCliente');
            const res = await getJson('/AnalisisDatos/Gastos?' + p.toString());
            if (mio !== state.version) return;
            state.gastos = res; state.gastosTipoSel = '';
            aplicarFiltroGastos();
        } catch (e) {
            console.error(e); mostrarError('No se pudo cargar el detalle de gastos: ' + e.message);
            T.gastos.setLoading(false);
        }
    }

    function aplicarFiltroGastos() {
        const todas = safe(state.gastos?.Filas);
        const tipos = {};
        todas.forEach(f => { tipos[f.Tipo] = (tipos[f.Tipo] || 0) + 1; });
        $id('gastos-chips').innerHTML =
            `<button class="chip ${state.gastosTipoSel === '' ? 'active' : ''}" data-tipo="">Todos <span class="chip__n">${todas.length}</span></button>` +
            Object.keys(tipos).sort().map(t => `<button class="chip ${state.gastosTipoSel === t ? 'active' : ''}" data-tipo="${esc(t)}">${esc(t)} <span class="chip__n">${tipos[t]}</span></button>`).join('');
        T.gastos.setRows(state.gastosTipoSel ? todas.filter(f => f.Tipo === state.gastosTipoSel) : todas);
    }

    /* ======================================================================
     *   Tabla reutilizable: búsqueda, orden, paginado, totales, detalle expandible, CSV
     * ====================================================================== */
    function createTable(host, opts) {
        const o = Object.assign({ pageSize: 25, pager: true, search: true, csv: true, searchPlaceholder: 'Buscar…', csvName: 'datos', columns: [] }, opts);
        const st = { rows: [], view: [], cols: o.columns, sortKey: o.defaultSort?.key ?? null, sortDir: o.defaultSort?.dir ?? 'asc', q: '', page: 1, loading: false, open: new Set() };
        const showTools = o.search || o.csv || o.pager;

        host.classList.add('ad-table');
        host.innerHTML = `
            ${showTools ? `<div class="ad-table__tools">
                ${o.search ? `<input type="search" class="ad-input ad-table__q" placeholder="${esc(o.searchPlaceholder)}">` : '<span></span>'}
                <span class="ad-table__info"></span>
                ${o.csv ? '<button class="ad-btn-ghost ad-table__csv"><i class="ti ti-file-spreadsheet me-1"></i>CSV</button>' : ''}
            </div>` : ''}
            <div class="ad-table__scroll"><table class="ad-grid"><thead></thead><tbody></tbody><tfoot></tfoot></table></div>
            ${o.pager ? '<div class="ad-table__pager"></div>' : ''}`;

        const thead = host.querySelector('thead'), tbody = host.querySelector('tbody'), tfoot = host.querySelector('tfoot');
        const qEl = host.querySelector('.ad-table__q'), infoEl = host.querySelector('.ad-table__info'), pagerEl = host.querySelector('.ad-table__pager');

        const colByKey = k => st.cols.find(c => c.key === k);

        function filtrar() {
            let v = st.rows;
            const q = st.q.trim().toLowerCase();
            if (q && o.searchKeys) v = v.filter(r => o.searchKeys(r).toLowerCase().includes(q));
            const c = colByKey(st.sortKey);
            if (c) {
                const dir = st.sortDir === 'asc' ? 1 : -1;
                v = v.slice().sort((a, b) => {
                    const x = c.val(a), y = c.val(b);
                    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
                    return String(x).localeCompare(String(y), 'es', { numeric: true }) * dir;
                });
            }
            st.view = v;
        }

        function pintarHead() {
            thead.innerHTML = '<tr>' + st.cols.map(c =>
                `<th class="${c.align === 'r' ? 'r' : ''} sortable ${st.sortKey === c.key ? 'sorted ' + st.sortDir : ''}" data-key="${c.key}">${esc(c.title)}<span class="ad-sort"></span></th>`
            ).join('') + '</tr>';
        }

        function pintar() {
            filtrar();
            const total = st.view.length;
            const pages = o.pager ? Math.max(1, Math.ceil(total / o.pageSize)) : 1;
            st.page = Math.min(st.page, pages);
            const ini = o.pager ? (st.page - 1) * o.pageSize : 0;
            const pageRows = o.pager ? st.view.slice(ini, ini + o.pageSize) : st.view;
            const ncol = st.cols.length;

            if (st.loading) {
                tbody.innerHTML = `<tr><td colspan="${ncol}" class="ad-table__msg"><span class="spinner-border spinner-border-sm me-2"></span>Cargando…</td></tr>`;
            } else if (!pageRows.length) {
                tbody.innerHTML = `<tr><td colspan="${ncol}" class="ad-table__msg">Sin resultados</td></tr>`;
            } else {
                tbody.innerHTML = pageRows.map((r, i) => {
                    const idx = ini + i;
                    const rid = o.expand ? (r.Id ?? idx) : idx;
                    const abierto = st.open.has(rid);
                    return `<tr class="${(o.onRowClick || o.expand) ? 'clickable' : ''} ${abierto ? 'open' : ''}" data-i="${idx}" data-rid="${rid}">` +
                        st.cols.map(c => `<td class="${c.align === 'r' ? 'r' : ''}">${c.fmt ? c.fmt(c.val(r), r) : esc(c.val(r))}</td>`).join('') +
                        `</tr>` + (abierto ? `<tr class="ad-exp" data-for="${rid}"><td colspan="${ncol}">${st.expCache?.[rid] ?? ''}</td></tr>` : '');
                }).join('');
            }

            const hayTotales = st.cols.some(c => c.total && c.total(st.view) !== '');
            tfoot.innerHTML = hayTotales && st.view.length
                ? '<tr>' + st.cols.map(c => `<td class="${c.align === 'r' ? 'r' : ''}">${c.total ? c.total(st.view) : ''}</td>`).join('') + '</tr>' : '';

            // El detalle expandible se ancla al ancho visible aunque la grilla tenga scroll horizontal.
            const scroller = host.querySelector('.ad-table__scroll');
            host.querySelectorAll('.ad-exp__box').forEach(b => { b.style.width = Math.max(320, scroller.clientWidth - 24) + 'px'; });

            if (infoEl) infoEl.textContent = `${int(total)} de ${int(st.rows.length)}`;
            if (pagerEl) pagerEl.innerHTML = pages <= 1 ? '' :
                `<button class="ad-pg" data-pg="prev" ${st.page <= 1 ? 'disabled' : ''}>◀</button>
                 <span>Página ${st.page} de ${pages}</span>
                 <button class="ad-pg" data-pg="next" ${st.page >= pages ? 'disabled' : ''}>▶</button>`;
        }

        thead.addEventListener('click', e => {
            const th = e.target.closest('th[data-key]'); if (!th) return;
            if (st.sortKey === th.dataset.key) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
            else { st.sortKey = th.dataset.key; st.sortDir = (colByKey(st.sortKey).align === 'r') ? 'desc' : 'asc'; }
            st.page = 1; pintarHead(); pintar();
        });

        tbody.addEventListener('click', async e => {
            const tr = e.target.closest('tr[data-i]'); if (!tr) return;
            const row = st.view[Number(tr.dataset.i)]; if (!row) return;
            if (o.expand) {
                const rid = row.Id ?? Number(tr.dataset.i);
                st.expCache = st.expCache || {};
                if (st.open.has(rid)) { st.open.delete(rid); pintar(); return; }
                st.open.add(rid);
                st.expCache[rid] = '<div class="ad-table__msg"><span class="spinner-border spinner-border-sm me-2"></span>Cargando productos…</div>';
                pintar();
                try { st.expCache[rid] = await o.expand(row); }
                catch (err) { st.expCache[rid] = `<div class="ad-table__msg ad-neg">No se pudo cargar el detalle</div>`; }
                if (st.open.has(rid)) pintar();
            } else if (o.onRowClick) {
                o.onRowClick(row);
            }
        });

        qEl?.addEventListener('input', () => { st.q = qEl.value; st.page = 1; pintar(); });
        pagerEl?.addEventListener('click', e => {
            const b = e.target.closest('[data-pg]'); if (!b || b.disabled) return;
            st.page += b.dataset.pg === 'next' ? 1 : -1; pintar();
        });
        host.querySelector('.ad-table__csv')?.addEventListener('click', () => descargarCsv(st.cols, st.view, o.csvName));

        return {
            setColumns(cols) { st.cols = cols; pintarHead(); },
            setRows(rows) { st.rows = safe(rows); st.loading = false; st.open.clear(); st.expCache = {}; st.page = 1; pintar(); },
            setLoading(b) { st.loading = b; pintar(); }
        };
    }

    function descargarCsv(cols, rows, nombre) {
        const celda = v => {
            let s = (typeof v === 'number') ? String(v).replace('.', ',') : String(v ?? '');
            s = s.replace(/<[^>]+>/g, '');
            return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lineas = [cols.map(c => celda(c.title)).join(';')];
        rows.forEach(r => lineas.push(cols.map(c => celda(c.csv ? c.csv(r) : c.val(r))).join(';')));
        const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${nombre}_${iso(state.desde)}_${iso(state.hasta)}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    /* ============================ export PDF ============================ */
    function showOverlay(msg) {
        let ov = $id('ad-busy');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'ad-busy';
            ov.innerHTML = `<div class="ad-busy__box"><div class="spinner-border" role="status"></div><div id="ad-busy-text"></div></div>`;
            document.body.appendChild(ov);
        }
        $id('ad-busy-text').textContent = msg; ov.style.display = 'flex';
    }
    const hideOverlay = () => { const ov = $id('ad-busy'); if (ov) ov.style.display = 'none'; };

    async function exportarPDF() {
        try {
            showOverlay('Exportando PDF…'); await new Promise(r => setTimeout(r, 60));
            const root = $id('ad-root');
            const canvas = await html2canvas(root, { scale: 1.6, backgroundColor: '#0e1224', useCORS: true });
            const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
            const imgW = pageW - 12, pxPerPage = canvas.width * (pageH - 12) / imgW;
            let sY = 0, left = canvas.height;
            while (left > 0) {
                const pc = document.createElement('canvas');
                pc.width = canvas.width; pc.height = Math.min(pxPerPage, left);
                pc.getContext('2d').drawImage(canvas, 0, sY, canvas.width, pc.height, 0, 0, canvas.width, pc.height);
                if (sY > 0) pdf.addPage();
                pdf.addImage(pc.toDataURL('image/png'), 'PNG', 6, 6, imgW, pc.height * imgW / canvas.width);
                sY += pxPerPage; left -= pxPerPage;
            }
            pdf.save(`Analisis_${state.tab}_${iso(state.desde)}_${iso(state.hasta)}.pdf`);
        } catch (e) { console.error(e); mostrarError('No se pudo exportar el PDF.'); }
        finally { hideOverlay(); }
    }
})();
