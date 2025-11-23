// ============================== Productos.js ==============================
let gridProductos;
let isEditingProducto = false;

// Config de filtros por columna
const columnConfigProductos = [
    { index: 1, name: 'Nombre', filterType: 'text' },
    { index: 2, name: 'Categoria', filterType: 'select', fetchDataFunc: listaProductosCategoriaFilter },
    { index: 3, name: 'Porc. IVA', filterType: 'text' },
    { index: 4, name: 'Porc. Ganancia', filterType: 'text' },
    // CostoUnitario: SIN filtro
    { index: 5, name: 'Costo Unitario', filterType: 'text' }
];

// Cache de categorías para no pedirlas mil veces en la edición inline
let cacheCategoriasProductos = null;

/* ============================
   Arranque
   ============================ */
$(document).ready(async () => {
    await listaProductos();
});

/* ============================
   Acciones / navegación
   ============================ */
function nuevoProducto() {
    window.location.href = '/Productos/NuevoModif';
}

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
        if (ok?.valor ?? ok) {
            exitoModal?.("Producto eliminado correctamente");
            await listaProductos();
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Ocurrió un error al eliminar el producto.");
    }
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
        $('#grd_Productos thead tr')
            .clone(true)
            .addClass('filters')
            .appendTo('#grd_Productos thead');

        gridProductos = $('#grd_Productos').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            pageLength: 50,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
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
                    orderable: false,
                    searchable: false,
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
                {
                    targets: [5],
                    render: (data) => formatNumber(redondearCien(data))
                },
            ],
            initComplete: async function () {
                const api = this.api();
                const idTabla = '#grd_Productos';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoProductos')) || {};

                // ===== Filtros por columna (thead clonado) =====
                for (const cfg of columnConfigProductos) {
                    const idx = cfg.index;
                    const name = cfg.name;
                    const type = cfg.filterType;

                    const $cell = $('.filters th').eq(idx);
                    const valorGuardado = estadoGuardado?.filtrosPorNombre?.[name];

                    if (!api.column(idx).visible()) continue;
                    if (!type) {
                        // Sin filtro para esta columna (si algún día ponés null de nuevo)
                        $cell.empty();
                        continue;
                    }

                    $cell.attr('data-colname', name).empty();

                    if (type === 'select') {
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

                        // Select2 dentro del wrapper de DataTable
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
                    } else if (type === 'text') {
                        const $input = $('<input type="text" class="form-control form-control-sm dt-input-dark" placeholder="Buscar..." />')
                            .attr('data-index', idx)
                            .val(valorGuardado || '')
                            .appendTo($cell)
                            .on('keyup change', function () {
                                const rx = this.value
                                    ? '(((' + $.fn.dataTable.util.escapeRegex(this.value) + ')))'
                                    : '';
                                const cur = this.selectionStart || 0;
                                api.column(idx).search(rx, !!this.value, !this.value).draw();
                                $(this).focus()[0].setSelectionRange(cur, cur);
                            });

                        if (valorGuardado) {
                            api.column(idx)
                                .search('(((' + $.fn.dataTable.util.escapeRegex(valorGuardado) + ')))', true, false);
                        }
                    }
                }

                // sin filtro en col 0 (acciones)
                $('.filters th').eq(0).empty();

                // Menú columnas + restaurar estado
                await configurarOpcionesColumnasProductos();
                await aplicarFiltrosRestaurados?.(api, idTabla, 'estadoProductos', true);
                localStorage.removeItem('estadoProductos');

                // Ajuste + primer cálculo de KPIs
                setTimeout(() => {
                    gridProductos?.columns.adjust();
                    calcularTotalesProductos();
                }, 10);

                // Recalcular en cada draw
                $('#grd_Productos')
                    .off('draw.dt.calc')
                    .on('draw.dt.calc', calcularTotalesProductos);

                // UX filas (hover y selección visual, SIN abrir formulario)
                $('#grd_Productos tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

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

                // =====================================================
                // EDICIÓN EN LÍNEA (dblclick) + BLINK EN COSTO UNITARIO
                // =====================================================
                $('#grd_Productos tbody')
                    .off('dblclick.productos')
                    .on('dblclick.productos', 'td', async function () {
                        if (isEditingProducto) return;

                        const cell = gridProductos.cell(this);
                        const colIndex = cell.index().column;
                        const rowIdx = cell.index().row;
                        let rowData = gridProductos.row(rowIdx).data();
                        if (!rowData) return;

                        // No editar acciones ni CostoUnitario
                        if (colIndex === 0 || colIndex === 5) return;

                        isEditingProducto = true;
                        const $td = $(this);
                        const originalData = cell.data();

                        if ($td.find('input, select').length > 0) {
                            isEditingProducto = false;
                            return;
                        }

                        function cancelarEdicion() {
                            gridProductos.cell(cell.index()).data(originalData).draw(false);
                            isEditingProducto = false;
                        }

                        async function guardarEdicion(newText, extraValue = null) {
                            // Actualizamos el rowData en memoria según la columna
                            if (colIndex === 1) {            // Nombre
                                rowData.Nombre = newText;
                            } else if (colIndex === 2) {     // Categoría (select)
                                rowData.IdCategoria = extraValue;
                                rowData.Categoria = newText;
                            } else if (colIndex === 3) {     // Porc. IVA
                                rowData.PorcIva = newText !== '' ? Number(newText) : null;
                            } else if (colIndex === 4) {     // Porc. Ganancia
                                rowData.PorcGanancia = newText !== '' ? Number(newText) : null;
                            }

                            // Modelo para backend (solo cabecera)
                            const modelo = {
                                Id: rowData.Id,
                                Nombre: rowData.Nombre,
                                IdCategoria: rowData.IdCategoria,
                                PorcGanancia: rowData.PorcGanancia || 0,
                                PorcIva: rowData.PorcIva || 0,
                                CostoUnitario: rowData.CostoUnitario // el SP recalcula en base a insumos
                            };

                            try {
                                // 1) Actualizar SOLO el producto
                                const resp = await fetch('/Productos/ActualizarSoloProducto', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json;charset=utf-8' },
                                    body: JSON.stringify(modelo)
                                });

                                if (!resp.ok) throw new Error('Error al actualizar el producto');

                                const json = await resp.json();
                                if (!json?.valor) {
                                    throw new Error('El servidor devolvió un error al actualizar');
                                }

                                // 2) Volver a leer el producto DESDE Lista() para traer el nuevo CostoUnitario
                                try {
                                    const respLista = await fetch('/Productos/Lista');
                                    if (respLista.ok) {
                                        const lista = await respLista.json();
                                        const actualizado = lista.find(p => p.Id === rowData.Id);
                                        if (actualizado) {
                                            // nos quedamos con lo que manda el SP: IVA, Ganancia y CostoUnitario recalculado
                                            rowData.PorcIva = actualizado.PorcIva;
                                            rowData.PorcGanancia = actualizado.PorcGanancia;
                                            rowData.CostoUnitario = actualizado.CostoUnitario;
                                        }
                                    }
                                } catch (e) {
                                    console.warn('No se pudo refrescar la lista de productos para el costo nuevo', e);
                                }

                                // 3) Actualizar la fila en la tabla
                                gridProductos.row(rowIdx).data(rowData).draw(false);

                                // Blink en la celda editada
                                $td.addClass('blinking');
                                setTimeout(() => $td.removeClass('blinking'), 3000);

                                // Si tocaste IVA o Ganancia => también blink en CostoUnitario (columna 5)
                                if (colIndex === 3 || colIndex === 4) {
                                    const $tdCosto = $(gridProductos.cell(rowIdx, 5).node());
                                    $tdCosto.addClass('blinking');
                                    setTimeout(() => $tdCosto.removeClass('blinking'), 3000);
                                }

                                calcularTotalesProductos();
                            } catch (err) {
                                console.error(err);
                                errorModal?.('Ocurrió un error al guardar el producto.');
                                // restaurar dato original si falla
                                gridProductos.cell(cell.index()).data(originalData).draw(false);
                            } finally {
                                isEditingProducto = false;
                            }
                        }


                        // =======================
                        // COLUMNA: CATEGORÍA
                        // =======================
                        if (colIndex === 2) {
                            if (!cacheCategoriasProductos) {
                                cacheCategoriasProductos = await listaProductosCategoriaFilter();
                            }

                            const $select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;"></select>');

                            cacheCategoriasProductos.forEach(cat => {
                                $select.append(`<option value="${cat.Id}">${cat.Nombre}</option>`);
                            });

                            $td.empty().append($select);

                            if (rowData.IdCategoria != null) {
                                $select.val(String(rowData.IdCategoria));
                            }

                            const $ok = $('<i class="fa fa-check text-success" style="margin-left:4px; cursor:pointer;"></i>')
                                .on('click', () => {
                                    const valId = Number($select.val());
                                    const text = $select.find('option:selected').text();
                                    guardarEdicion(text, valId);
                                });

                            const $cancel = $('<i class="fa fa-times text-danger" style="margin-left:4px; cursor:pointer;"></i>')
                                .on('click', cancelarEdicion);

                            $td.append($ok).append($cancel);
                            $select.focus();
                        } else {
                            // =======================
                            // Nombre / PorcIva / PorcGanancia
                            // =======================
                            let valueToDisplay = originalData;
                            if (valueToDisplay == null) valueToDisplay = '';
                            if (typeof valueToDisplay === 'string') {
                                valueToDisplay = valueToDisplay.replace(/<[^>]+>/g, "");
                            }

                            const $input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                                .val(valueToDisplay)
                                .on('keydown', function (e) {
                                    if (e.key === 'Enter') {
                                        guardarEdicion($(this).val());
                                    } else if (e.key === 'Escape') {
                                        cancelarEdicion();
                                    }
                                });

                            const $ok = $('<i class="fa fa-check text-success" style="margin-left:4px; cursor:pointer;"></i>')
                                .on('click', () => guardarEdicion($input.val()));

                            const $cancel = $('<i class="fa fa-times text-danger" style="margin-left:4px; cursor:pointer;"></i>')
                                .on('click', cancelarEdicion);

                            $td.empty().append($input).append($ok).append($cancel);
                            $input.focus();
                        }
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
    else {
        $('.acciones-dropdown').hide();
        $dd.show();
    }
}

$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
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

/* ============================
   Select2 chips helper (por si lo usás en otros lados)
   ============================ */
// Muestra solo N chips y agrega un badge "+N" con tooltip de los ocultos
function enhanceSelect2ChipSummary($select, maxVisible = 2) {
    const s2 = $select.data('select2');
    if (!s2) return;
    const $selection = s2.$container.find('.select2-selection--multiple');

    function updateSummary() {
        const $chips = $selection.find('.select2-selection__choice');
        $chips.show();

        const extra = Math.max(0, $chips.length - maxVisible);
        if (extra > 0) {
            $chips.slice(maxVisible).hide();
            const hidden = $chips.slice(maxVisible).map(function () {
                return $(this).attr('title') || $(this).text().trim();
            }).get();

            $selection.attr('data-overflow-count', `+${extra}`);
            $selection.attr('title', hidden.join(', '));
        } else {
            $selection.removeAttr('data-overflow-count').removeAttr('title');
        }
    }

    $select.on('change select2:select select2:unselect', () => setTimeout(updateSummary, 0));

    $selection.on('mousedown', function () {
        if (!s2.isOpen()) { $select.select2('open'); }
    });

    setTimeout(updateSummary, 0);
}
