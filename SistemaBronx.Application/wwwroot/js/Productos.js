// ============================== Productos.js ==============================
let gridProductos;

const columnConfigProductos = [
    { index: 1, name: 'Nombre', filterType: 'text' },
    { index: 2, name: 'Categoria', filterType: 'select', fetchDataFunc: listaProductosCategoriaFilter },
    { index: 3, name: 'Porc. IVA', filterType: 'text' },
    { index: 4, name: 'Porc. Ganancia', filterType: 'text' },
    { index: 5, name: 'Costo Unitario', filterType: 'text' },
];

/* ============================
   Arranque
   ============================ */
$(document).ready(async () => {
    await listaProductos();
});

/* ============================
   Acciones / navegación
   ============================ */
function nuevoProducto() { window.location.href = '/Productos/NuevoModif'; }
function editarProducto(id) {
    guardarFiltrosPantalla?.('#grd_Productos', 'estadoProductos', false);
    window.location.href = '/Productos/NuevoModif/' + id;
}
function duplicarProducto(id) {
    guardarFiltrosPantalla?.('#grd_Productos', 'estadoProductos', false);
    localStorage.setItem("DuplicarProducto", true);
    window.location.href = '/Productos/NuevoModif/' + id;
}
async function eliminarProducto(id) {
    if (!window.confirm("¿Desea eliminar el Producto?")) return;
    try {
        const response = await fetch("Productos/Eliminar?id=" + id, { method: "DELETE" });
        if (!response.ok) throw new Error("Error al eliminar el Producto.");
        const ok = await response.json();
        if (ok?.valor ?? ok) { exitoModal?.("Producto eliminado correctamente"); await listaProductos(); }
    } catch (e) { console.error(e); }
}

/* ============================
   Datos / Listado
   ============================ */
async function listaProductos() {
    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTableProductos(data);
}

async function configurarDataTableProductos(data) {
    if (!gridProductos) {
        // Header con filtros clonados
        $('#grd_Productos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');

        gridProductos = $('#grd_Productos').DataTable({
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
              <button class='btn btn-sm btnacciones' type='button' onclick='toggleAccionesProd(${data})' title='Acciones'>
                <i class='fa fa-ellipsis-v fa-lg text-white'></i>
              </button>
              <div class="acciones-dropdown" style="display:none;">
                <button class='btn btn-sm btneditar' type='button' onclick='editarProducto(${data})'>
                  <i class='fa fa-pencil-square-o fa-lg text-success'></i> Editar
                </button>
                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProducto(${data})'>
                  <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                </button>
                <button class='btn btn-sm btneliminar' type='button' onclick='duplicarProducto(${data})'>
                  <i class='fa fa-clone fa-lg text-warning'></i> Duplicar
                </button>
              </div>
            </div>`;
                    },
                    orderable: false, searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'PorcIva' },
                { data: 'PorcGanancia' },
                { data: 'CostoUnitario' },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Productos_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5] },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: false,
            columnDefs: [
                { targets: [5], render: (data) => formatNumber(redondearCien(data)) },
            ],
            initComplete: async function () {
                const api = this.api();
                const idTabla = '#grd_Productos';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoProductos')) || {};

                // ===== Filtros por columna (thead clonado) =====
                for (const cfg of columnConfigProductos) {
                    const idx = cfg.index;
                    const name = cfg.name;
                    const $cell = $('.filters th').eq(idx);
                    const valorGuardado = estadoGuardado?.filtrosPorNombre?.[name];

                    if (!api.column(idx).visible()) continue;

                    $cell.attr('data-colname', name).empty();

                    if (cfg.filterType === 'select') {
                        const $sel = $(`<select id="filter${idx}" multiple="multiple"><option value=""></option></select>`)
                            .attr('data-index', idx)
                            .appendTo($cell)
                            .on('change', async function () {
                                const values = $(this).val();
                                if (values && values.length > 0) {
                                    const rx = '^(' + values.map(v => $.fn.dataTable.util.escapeRegex(v)).join('|') + ')$';
                                    await api.column(idx).search(rx, true, false).draw();
                                } else {
                                    await api.column(idx).search('').draw();
                                }
                            });

                        const dataSel = await cfg.fetchDataFunc();
                        dataSel.forEach(item => $sel.append(`<option value="${item.Nombre}">${item.Nombre}</option>`));

                        // Select2 dentro del wrapper de DataTable (no hay panel)
                        $sel.select2({
                            placeholder: 'Seleccionar...',
                            width: '100%',
                            dropdownParent: $('#grd_Productos').closest('.dataTables_wrapper')
                        });


                        if (valorGuardado) {
                            const vals = Array.isArray(valorGuardado) ? valorGuardado : [valorGuardado];
                            const opciones = dataSel.map(x => x.Nombre);
                            const validos = vals.filter(v => opciones.includes(v));
                            if (validos.length) {
                                $sel.val(validos).trigger('change.select2');
                                const rx = '^(' + validos.map(v => $.fn.dataTable.util.escapeRegex(v)).join('|') + ')$';
                                await api.column(idx).search(rx, true, false).draw();
                            }
                        }
                    } else {
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

                        if (valorGuardado) {
                            api.column(idx).search('(((' + $.fn.dataTable.util.escapeRegex(valorGuardado) + ')))', true, false);
                        }
                    }
                }
                // sin filtro en col 0 (acciones)
                $('.filters th').eq(0).empty();

                // Menú columnas + restaurar estado (si tenés esa helper global)
                await configurarOpcionesColumnasProductos();
                await aplicarFiltrosRestaurados?.(api, idTabla, 'estadoProductos', true);
                localStorage.removeItem('estadoProductos');

                // Ajuste + primer cálculo de KPIs
                setTimeout(() => { gridProductos?.columns.adjust(); calcularTotalesProductos(); }, 10);

                // Recalcular en cada draw
                $('#grd_Productos').off('draw.dt.calc').on('draw.dt.calc', calcularTotalesProductos);

                // UX filas
                $('#grd_Productos tbody').on('mouseenter', 'tr', function () { $(this).css('cursor', 'pointer'); });
                $('#grd_Productos tbody').on('dblclick', 'tr', function () {
                    const id = gridProductos.row(this).data().Id;
                    editarProducto(id);
                });

                // selección visual
                let filaSel = null;
                $('#grd_Productos tbody').on('click', 'tr', function () {
                    if (filaSel) {
                        $(filaSel).removeClass('seleccionada');
                        $('td', filaSel).removeClass('seleccionada');
                    }
                    filaSel = $(this);
                    $(filaSel).addClass('seleccionada');
                    $('td', filaSel).addClass('seleccionada');
                });
            }
        });
    } else {
        gridProductos.clear().rows.add(data).draw();
        calcularTotalesProductos();
    }
}

/* ============================
   Menú columnas
   ============================ */
function configurarOpcionesColumnasProductos() {
    const grid = $('#grd_Productos').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenuProductos');
    const storageKey = `Productos_Columnas`;
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") {
            const isChecked = saved?.[`col_${index}`] !== undefined ? saved[`col_${index}`] : true;
            grid.column(index).visible(isChecked);
            const name = col.data;
            container.append(`
        <li>
          <label class="dropdown-item">
            <input type="checkbox" class="toggle-column-prod" data-column="${index}" ${isChecked ? 'checked' : ''}>
            ${name}
          </label>
        </li>
      `);
        }
    });

    $('.toggle-column-prod').on('change', function () {
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
function toggleAccionesProd(id) {
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
async function listaProductosCategoriaFilter() {
    const url = `/Productos/ListaCategorias`;
    const response = await fetch(url);
    const data = await response.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ============================
   KPIs / Sumatorias
   ============================ */
if (typeof window.formatNumber !== 'function') {
    window.formatNumber = function (n) {
        const v = Number(n || 0);
        return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
}
function redondearCien(value) {
    if (value == null || value === '') return '';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return Math.ceil(num / 100) * 100;
}

function calcularTotalesProductos() {
    if (!gridProductos) return;
    const rows = gridProductos.rows({ search: 'applied' }).data().toArray();

    const cant = rows.length;
    const categorias = new Set(rows.map(r => r.Categoria).filter(Boolean));
    let sumaCostos = 0;
    for (const r of rows) sumaCostos += (+r.CostoUnitario || 0);

    // KPIs (si existen en la vista)
    const $cant = $('#kpiCantProductos');
    const $cat = $('#kpiCantCategorias');
    if ($cant.length) $cant.text(cant.toLocaleString('es-AR'));
    if ($cat.length) $cat.text(categorias.size.toLocaleString('es-AR'));

    const $sumCost = $('#kpiSumaCostos'); // opcional
    if ($sumCost.length) $sumCost.text(formatNumber(sumaCostos));
}


// Muestra solo N chips y agrega un badge "+N" con tooltip de los ocultos
function enhanceSelect2ChipSummary($select, maxVisible = 2) {
    const s2 = $select.data('select2');
    if (!s2) return;
    const $selection = s2.$container.find('.select2-selection--multiple');

    function updateSummary() {
        // Aseguramos que existan los chips
        const $chips = $selection.find('.select2-selection__choice');
        // Mostrar todos para recalcular y luego ocultar excedentes
        $chips.show();

        const extra = Math.max(0, $chips.length - maxVisible);
        if (extra > 0) {
            // oculto visualmente el excedente (no lo saco del DOM)
            $chips.slice(maxVisible).hide();

            // tooltip con los ocultos
            const hidden = $chips.slice(maxVisible).map(function () {
                return $(this).attr('title') || $(this).text().trim();
            }).get();

            $selection.attr('data-overflow-count', `+${extra}`);
            $selection.attr('title', hidden.join(', '));
        } else {
            $selection.removeAttr('data-overflow-count').removeAttr('title');
        }
    }

    // Actualizar cuando select2 agrega/remueve chips
    $select.on('change select2:select select2:unselect', () => setTimeout(updateSummary, 0));

    // Click en el badge (o en la caja) abre el dropdown
    $selection.on('mousedown', function (e) {
        // Evita que el click se "pierda" si se hace sobre el badge
        if (!s2.isOpen()) { $select.select2('open'); }
    });

    // Primer render
    setTimeout(updateSummary, 0);
}


