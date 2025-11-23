// ============================== Pedidos.js ==============================
let gridPedidos;
let isEditing = false;

const columnConfig = [
    { index: 1, name: 'Nro', filterType: 'text' },
    { index: 2, name: 'Fecha', filterType: 'text' },
    { index: 3, name: 'Cliente', filterType: 'text' },
    { index: 4, name: 'Importe Total', filterType: 'text' },
    { index: 5, name: 'Porc. Descuento', filterType: 'text' },
    { index: 6, name: 'SubTotal', filterType: 'text' },
    { index: 7, name: 'Importe Abonado', filterType: 'text' },
    { index: 8, name: 'Saldo', filterType: 'text' },
    { index: 9, name: 'Forma de pago', filterType: 'text' },
    { index: 10, name: 'Estado', filterType: 'text' },
    { index: 11, name: 'Comentarios', filterType: 'text' }
];

/* ============================
   Arranque
   ============================ */
$(document).ready(async () => {
    // Fechas default (últimos 7 días)
    $('#FechaDesde').val(moment().add(-7, 'days').format('YYYY-MM-DD'));
    $('#FechaHasta').val(moment().format('YYYY-MM-DD'));

    // Cargar clientes y armar Select2 robusto
    await listaClientesFiltro();
    initSelect2Simple('#ClientesFiltro', '#formFiltrosPedidos', 'Todos', -1);


    // Primera carga
    await listaPedidos(-1, "TODOS", 0, -1, -1);

    // Validación rápida
    $('#txtNombre, #txtCodigo').on('input', validarCampos);

    var userSession = JSON.parse(localStorage.getItem('userSession'));

    const divImporteTotal = document.getElementById('divImporteTotal');
    const divImporteAbonado = document.getElementById('divImporteAbonado');
    const divSaldo = document.getElementById('divSaldo');
    if (userSession && Number(userSession.IdRol) === 1) {
        divImporteTotal.removeAttribute('hidden');   // habilitar para admin
        divImporteAbonado.removeAttribute('hidden');   // habilitar para admin
        divSaldo.removeAttribute('hidden');   // habilitar para admin
    }

    // Toggle filtros con persistencia (igual Ventas)
    initToggleFiltrosPersistente();

    // Recalcular Select2 al abrir/cerrar panel
    $('#btnToggleFiltros').on('click', () => {
        setTimeout(() => $('#ClientesFiltro').trigger('change.select2'), 30);
    });
});

/* ============================
   Util — Select2 (genérico, estable)
   ============================ */
function initSelect2Simple(selector, dropdownParentSelector, placeholderText) {
    const $el = $(selector);
    if (!$el.length) return;

    // Evitar dobles inits
    if ($el.data('select2')) $el.select2('destroy');

    // Asegurar placeholder real
    if (!$el.find('option[value=""]').length) $el.prepend('<option value=""></option>');

    const $parent = $(dropdownParentSelector);
    $el.select2({
        placeholder: placeholderText || 'Seleccionar...',
        allowClear: true,
        width: '100%',
        dropdownParent: $parent.length ? $parent : $('body')
    });

    // Limpia textos huérfanos (evita “Todos” duplicado)
    $el.parent().contents().filter(function () {
        return this.nodeType === 3 && this.nodeValue.trim() !== '';
    }).remove();
}

/* ============================
   Acciones / navegación
   ============================ */
function nuevoPedido() { window.location.href = '/Pedidos/NuevoModif/0'; }

function validarCampos() {
    const Nombre = $("#txtNombre").val();
    const campoValidoNombre = Nombre !== "";
    const campoValidoCodigo = (typeof codigo !== 'undefined') ? (codigo !== "") : true;
    $("#lblNombre").css("color", campoValidoNombre ? "" : "red");
    $("#txtNombre").css("border-color", campoValidoNombre ? "" : "red");
    return campoValidoNombre && campoValidoCodigo;
}

async function aplicarFiltros() {
    listaPedidos(
        document.getElementById("ClientesFiltro").value,
        document.getElementById("EstadosFiltro").value,
        document.getElementById("FinalizadosFiltro").value,
        document.getElementById("FechaDesde").value,
        document.getElementById("FechaHasta").value
    );
}

function editarPedido(id) {
    guardarFiltrosPantalla?.('#grd_Pedidos', 'estadoPedidos', false);
    window.location.href = '/Pedidos/NuevoModif/' + id;
}

async function eliminarPedido(id) {
    if (!window.confirm("¿Desea eliminar el Pedido?")) return;
    try {
        const response = await fetch("Pedidos/Eliminar?id=" + id, { method: "DELETE" });
        if (!response.ok) { errorModal?.("Error al eliminar el Pedido."); return; }
        const ok = await response.json();
        if (ok) { aplicarFiltros(); exitoModal?.("Pedido eliminado correctamente"); }
    } catch (e) { console.error(e); }
}

/* ============================
   Listado / DataTable
   ============================ */
async function listaPedidos(IdCliente, Estado, Finalizado, FechaDesde = null, FechaHasta = null) {
    let url = `/Pedidos/Lista?IdCliente=${IdCliente}&Estado=${Estado}&Finalizado=${Finalizado}`;
    if (FechaDesde) url += `&FechaDesde=${FechaDesde}`;
    if (FechaHasta) url += `&FechaHasta=${FechaHasta}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

async function configurarDataTable(data) {
    if (!gridPedidos) {
        // Header con filtros clonados
        $('#grd_Pedidos thead tr').clone(true).addClass('filters').appendTo('#grd_Pedidos thead');

        gridPedidos = $('#grd_Pedidos').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            pageLength: 50,
            columns: [
                {
                    data: "Id", title: '', width: "1%",
                    render: function (data) {
                        return `
              <div class="acciones-menu" data-id="${data}">
                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                  <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                </button>
                <div class="acciones-dropdown" style="display:none;">
                  <button class='btn btn-sm btneditar' type='button' onclick='editarPedido(${data})'>
                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Editar
                  </button>
                  <button class='btn btn-sm btneliminar' type='button' onclick='eliminarPedido(${data})'>
                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                  </button>
                </div>
              </div>`;
                    },
                    orderable: false, searchable: false,
                },
                { data: 'Id' },
                { data: 'Fecha' },
                { data: 'Cliente' },
                { data: 'ImporteTotal' },
                { data: 'PorcDescuento' },
                { data: 'SubTotal' },
                { data: 'ImporteAbonado' },
                { data: 'Saldo' },
                { data: 'FormaPago' },
                { data: 'Estado' },
                { data: 'Comentarios' },
                {
                    data: 'Finalizado', title: 'Finalizado',
                    render: function (data, type) {
                        if (type !== 'display') {
                            return (data === 1 || data === true) ? '1'
                                : (data === 0 || data === false) ? '0' : '';
                        }
                        return (data === 1 || data === true)
                            ? `<i class="fa fa-check-circle text-success" title="Finalizado"></i>`
                            : `<i class="fa fa-times-circle text-danger" title="No Finalizado"></i>`;
                    },
                    orderable: false, searchable: true
                },
                {
                    data: 'Facturado', title: 'Facturado',
                    render: function (data, type) {
                        if (type !== 'display') {
                            return (data === 1 || data === true) ? '1'
                                : (data === 0 || data === false) ? '0' : '';
                        }
                        return (data === 1 || data === true)
                            ? `<i class="fa fa-check-circle text-success" title="Facturado"></i>`
                            : `<i class="fa fa-times-circle text-danger" title="No Facturado"></i>`;
                    },
                    orderable: false, searchable: true
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: `Reporte Pedidos_${moment().format('YYYY-MM-DD')}`, title: '', exportOptions: { columns: [1, 2, 3, 4, 5] }, className: 'btn-exportar-excel' },
                { extend: 'print', text: 'Imprimir', title: '', exportOptions: { columns: [1, 2, 3, 4, 5] }, className: 'btn-exportar-print' },
            ],
            orderCellsTop: true,
            fixedHeader: false,
            columnDefs: [
                { targets: [4, 6, 7, 8], render: (data) => formatNumber(data) },
                { targets: [2], render: (data) => data ? new Date(data).toLocaleDateString('es-ES') : '' }
            ],
            initComplete: async function () {
                const api = this.api();
                const idTabla = '#grd_Pedidos';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoPedidos')) || {};

                // ===== Filtros por columna (thead clonado) =====
                for (const cfg of columnConfig) {
                    const idx = cfg.index;
                    const name = cfg.name;
                    const $cell = $('.filters th').eq(idx);
                    const valorGuardado = estadoGuardado?.filtrosPorNombre?.[name];

                    if (!api.column(idx).visible()) continue;

                    $cell.attr('data-colname', name).empty();

                    // Texto por defecto
                    const $input = $('<input type="text" class="form-control form-control-sm dt-input-dark" placeholder="Buscar..." />')
                        .attr('data-index', idx)
                        .val(valorGuardado || '')
                        .appendTo($cell)
                        .on('keyup change', function () {
                            const rx = this.value ? '(((' + $.fn.dataTable.util.escapeRegex(this.value) + ')))' : '';
                            const cur = this.selectionStart || 0;
                            api.column(idx).search(rx, !!this.value, !this.value).draw();
                            $(this).focus()[0].setSelectionRange(cur, cur);
                        });

                    if (valorGuardado) api.column(idx).search('(((' + $.fn.dataTable.util.escapeRegex(valorGuardado) + ')))', true, false);
                }
                // Sin filtro en col 0 (acciones)
                $('.filters th').eq(0).empty();

                // ===== Chips (Todos / Sí / No) Finalizado/Facturado =====
                function addTriChips(api, colIndex, etiqueta, metodo) {
                    const $cell = $('.filters th').eq(colIndex);
                    if (!$cell.length) return;

                    $cell.empty().addClass('tri-filter');
                    const html = `
            <div class="tri-chips" role="group" aria-label="${etiqueta}">
              <button type="button" class="chip active" data-val="all" title="Mostrar todos">Todos</button>
              <button type="button" class="chip" data-val="1" title="Solo Sí">Sí</button>
              <button type="button" class="chip" data-val="0" title="Solo No">No</button>
            </div>`;
                    const $wrap = $(html).appendTo($cell);

                    const apply = (val) => {
                        const s = String(val);
                        if (s === '1') {
                            api.column(colIndex).search('^1$', true, false).draw();
                        } else if (s === '0') {
                            // “No”: 0 o vacío (porque normalizamos a '1'/'0'/'' en render no-display)
                            api.column(colIndex).search('^(0|)$', true, false).draw();
                        } else {
                            api.column(colIndex).search('').draw();
                        }
                        $wrap.find('.chip').removeClass('active');
                        $wrap.find(`.chip[data-val="${s}"]`).addClass('active');
                    };

                    $wrap.on('click', '.chip', function (e) { e.preventDefault(); e.stopPropagation(); apply($(this).data('val')); });
                    $wrap.on('keydown', '.chip', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); } });

                    apply(metodo); // default
                }
                addTriChips(api, 12, 'Finalizado', '0');
                addTriChips(api, 13, 'Facturado', 'all');

                // ===== Totales en cada draw =====
                $('#grd_Pedidos').off('draw.dt.calc').on('draw.dt.calc', calcularTotalesPedidos);

                // Menú columnas + restaurar estado (tuyos)
                await configurarOpcionesColumnas();
                await aplicarFiltrosRestaurados?.(api, idTabla, 'estadoPedidos', true);
                localStorage.removeItem('estadoPedidos');

                // Ajuste y primer cálculo
                setTimeout(() => { gridPedidos?.columns.adjust(); calcularTotalesPedidos(); }, 10);

                // UX filas
                $('#grd_Pedidos tbody').on('mouseenter', 'tr', function () { $(this).css('cursor', 'pointer'); });
                $('#grd_Pedidos tbody').on('dblclick', 'tr', function () {
                    const id = gridPedidos.row(this).data().Id;
                    editarPedido(id);
                });

                let filaSeleccionada = null;
                $('#grd_Pedidos tbody').on('click', 'tr', function () {
                    if (filaSeleccionada) {
                        $(filaSeleccionada).removeClass('seleccionada');
                        $('td', filaSeleccionada).removeClass('seleccionada');
                    }
                    filaSeleccionada = $(this);
                    $(filaSeleccionada).addClass('seleccionada');
                    $('td', filaSeleccionada).addClass('seleccionada');
                });
            }
        });
    } else {
        gridPedidos.clear().rows.add(data).draw();
        calcularTotalesPedidos();
    }
}

/* ============================
   Menú columnas (tu lógica)
   ============================ */
function configurarOpcionesColumnas() {
    const grid = $('#grd_Pedidos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');
    const storageKey = `Pedidos_Columnas`;
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    container.empty();

    columnas.forEach((col, index) => {
        if ((col.data && col.data != "Id") || index == 1) {
            const isChecked = saved?.[`col_${index}`] !== undefined ? saved[`col_${index}`] : true;
            grid.column(index).visible(isChecked);
            const columnName = index == 1 ? "NroPedido" : col.data;
            container.append(`
        <li>
          <label class="dropdown-item">
            <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
            ${columnName}
          </label>
        </li>`);
        }
    });

    $('.toggle-column').on('change', function () {
        const idx = parseInt($(this).data('column'), 10);
        const on = $(this).is(':checked');
        saved[`col_${idx}`] = on;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        grid.column(idx).visible(on);
    });
}

/* ============================
   Acciones (3 puntitos)
   ============================ */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide();
    else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

/* ============================
   Datos auxiliares
   ============================ */
async function listaClientesFiltro() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    const $sel = $('#ClientesFiltro').empty();
    $sel.append(new Option('Todos', -1));
    (data || []).forEach(x => $sel.append(new Option(x.Nombre, x.Id)));
}

/* ============================
   Totales (KPIs)
   ============================ */
if (typeof window.formatNumber !== 'function') {
    window.formatNumber = function (n) {
        const v = Number(n || 0);
        return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
}
function calcularTotalesPedidos() {
    if (!gridPedidos) return;
    const rows = gridPedidos.rows({ search: 'applied' }).data().toArray();
    let cant = rows.length, tot = 0, abo = 0, sal = 0, sub = 0;

    for (const r of rows) {
        sub += (+r.SubTotal || 0);
        tot += (+r.ImporteTotal || 0);
        abo += (+r.ImporteAbonado || 0);
        sal += (+r.Saldo || 0);
    }
    $('#kpiCantPedidos').text(cant.toLocaleString('es-AR'));
    $('#kpiImporteTotal').text(formatNumber(tot));
    $('#kpiAbonado').text(formatNumber(abo));
    $('#kpiSaldo').text(formatNumber(sal));
}

/* ============================
   Toggle filtros con persistencia (igual Ventas)
   ============================ */
function initToggleFiltrosPersistente() {
    const btn = document.getElementById('btnToggleFiltros');
    const icon = document.getElementById('iconFiltros');
    const panel = document.getElementById('formFiltrosPedidos');
    const STORAGE_KEY = 'Pedidos_FiltrosVisibles';

    if (!btn || !icon || !panel) return;

    // Restaurar
    const saved = localStorage.getItem(STORAGE_KEY);
    const visible = (saved === null) ? true : (saved === 'true');

    panel.classList.toggle('d-none', !visible);
    icon.classList.toggle('fa-arrow-down', !visible);
    icon.classList.toggle('fa-arrow-up', visible);

    // Toggle + persistencia
    btn.addEventListener('click', () => {
        const hide = panel.classList.toggle('d-none');
        const nowVisible = !hide;
        icon.classList.toggle('fa-arrow-down', hide);
        icon.classList.toggle('fa-arrow-up', nowVisible);
        localStorage.setItem(STORAGE_KEY, String(nowVisible));
    });
}
// ======================================================================
