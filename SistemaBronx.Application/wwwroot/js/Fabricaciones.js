let gridFabricaciones;
let isEditing = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, name: 'Pedido', filterType: 'text' },
    { index: 2, name: 'Detalle', filterType: 'text' },
    { index: 3, name: 'Producto', filterType: 'select', fetchDataFunc: listaProductosFilter },
    { index: 4, name: 'Insumo', filterType: 'text' },
    { index: 5, name: 'Cantidad', filterType: 'text' },
    { index: 6, name: 'Color', filterType: 'select', fetchDataFunc: listaColoresFilter },
    { index: 7, name: 'Estado', filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 8, name: 'Comentarios', filterType: 'text' },
    { index: 9, name: 'Descripcion', filterType: 'text' },
    { index: 10, name: 'Categoria', filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 11, name: 'Proveedor', filterType: 'select', fetchDataFunc: listaProveedoresFilter },
    { index: 12, name: 'text', filterType: 'text' }
];

// ===== Persistencia del switch =====
const STORAGE_MOSTRAR_FINALIZADOS = 'Fabricaciones_MostrarFinalizados';
const getMostrarFinalizados = () => localStorage.getItem(STORAGE_MOSTRAR_FINALIZADOS) === 'true';
const setMostrarFinalizados = (v) => localStorage.setItem(STORAGE_MOSTRAR_FINALIZADOS, v ? 'true' : 'false');

// ===== UI: overlay =====
function mostrarOverlay(c) {
    const el = document.getElementById('overlayCarga');
    if (!el) return;
    el.style.display = c ? 'flex' : 'none';
    el.setAttribute('aria-hidden', c ? 'false' : 'true');
}

$(document).ready(() => {
    // estado inicial del switch
    const chk = document.getElementById('chkMostrarFinalizados');
    if (chk) chk.checked = getMostrarFinalizados();

    // carga inicial (por defecto: NO finalizados)
    listaFabricaciones(getMostrarFinalizados());

    // toggle -> reconsultar backend
    $('#chkMostrarFinalizados').on('change', function () {
        setMostrarFinalizados(this.checked);
        listaFabricaciones(this.checked);
    });
});

// ======================= Carga desde backend =======================
async function listaFabricaciones(incluirFinalizados) {
    const url = `/Fabricaciones/Lista?incluirFinalizados=${incluirFinalizados ? 'true' : 'false'}`;
    try {
        mostrarOverlay(true);
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();
        await configurarDataTable(data, incluirFinalizados);
    } catch (e) {
        console.error(e);
        errorModal('No se pudieron obtener las fabricaciones.');
    } finally {
        mostrarOverlay(false);
    }
}

async function configurarDataTable(data, incluirFinalizados) {
    if (!gridFabricaciones) {
        $('#grd_Fabricaciones thead tr').clone(true).addClass('filters').appendTo('#grd_Fabricaciones thead');

        gridFabricaciones = $('#grd_Fabricaciones').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: true,
            scrollCollapse: true,
            pageLength: 50,
            deferRender: true,
            processing: true,
            autoWidth: false,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data, type, row) {
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='editarPedido(${row.IdPedido})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },

                { data: 'IdPedido', name: "Pedido" },
                { data: 'IdDetalle' },
                { data: 'Producto' },
                { data: 'Insumo' },
                { data: 'Cantidad' },
                { data: 'Color' },
                { data: 'Estado' },
                { data: 'Comentarios' },
                { data: 'Descripcion' },
                { data: 'Categoria' },
                { data: 'Proveedor' },
                {
                    data: 'FechaActualizacion',
                    render: function (data) {
                        if (!data) return '-';
                        return new Date(data).toLocaleString('es-AR');
                    }
                },
                { data: 'IdPedido', visible: false },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Fabricaciones_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [2, 5, 4, 6, 8]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Fabricaciones_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [2, 5, 4, 6, 8]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',

                    title: '',
                    exportOptions: {
                        columns: [2, 5, 4, 6, 8]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: false,

            initComplete: async function () {
                const api = this.api();
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoFabricaciones')) || {};

              

                for (const config of columnConfig) {
                    const index = config.index;
                    const name = config.name;
                    const cell = $('.filters th').eq(index);
                    const valorGuardado = estadoGuardado.filtrosPorNombre?.[name];

                    if (!api.column(index).visible()) continue;

                    cell.attr('data-colname', name);
                    cell.empty();

                    if (config.filterType === 'select') {
                        const select = $('<select id="filter' + index + '" multiple="multiple"><option value="">Seleccionar...</option></select>')
                            .attr('data-index', index)
                            .appendTo(cell)
                            .on('change', async function () {
                                const selectedValues = $(this).val();
                                if (selectedValues && selectedValues.length > 0) {
                                    const regex = '^(' + selectedValues.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                    await api.column(index).search(regex, true, false).draw(false);
                                } else {
                                    await api.column(index).search('').draw(false);
                                }
                            });

                        const dataSel = await config.fetchDataFunc();
                        dataSel.forEach(item => {
                            select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
                        });

                        select.select2({ placeholder: 'Seleccionar...', width: '100%' });

                        if (valorGuardado) {
                            const valores = Array.isArray(valorGuardado) ? valorGuardado : [valorGuardado];
                            const opcionesActuales = dataSel.map(x => x.Nombre);
                            const valoresValidos = valores.filter(v => opcionesActuales.includes(v));
                            if (valoresValidos.length > 0) {
                                select.val(valoresValidos).trigger('change.select2');
                                const regex = '^(' + valoresValidos.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                await api.column(index).search(regex, true, false);
                            }
                        }

                    } else if (config.filterType === 'text') {
                        const input = $('<input type="text" />')
                            .attr('data-index', index)
                            .val(valorGuardado || '')
                            .attr('placeholder', valorGuardado ? '' : 'Buscar...')
                            .appendTo(cell)
                            .on('keyup change', function () {
                                const regexr = '(((' + this.value + ')))';
                                const cursorPosition = this.selectionStart;
                                api.column(index)
                                    .search(this.value !== '' ? regexr : '', this.value !== '', this.value === '')
                                    .draw(false);
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });

                        if (valorGuardado) {
                            const regexr = '(((' + valorGuardado + ')))';
                            api.column(index).search(regexr, true, false);
                        }
                    }
                }

                $('.filters th').eq(0).html('');

                await configurarOpcionesColumnas();
                await aplicarFiltrosRestaurados(api, '#grd_Fabricaciones', 'estadoFabricaciones', false);
                localStorage.removeItem('estadoFabricaciones');

               
                setTimeout(function () {
                    gridFabricaciones.columns.adjust();
                }, 1);

                const visiblesInit = api.rows({ filter: 'applied' }).data().toArray();
                actualizarKpisFabricaciones(visiblesInit);

                $('body').on('mouseenter', '#grd_Fabricaciones .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

                $('body').on('click', '#grd_Fabricaciones .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' ');
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });

        // ===== eventos de grilla (tu código tal cual) =====
        var ultimaFilaSeleccionada = null;
        var dobleclick = false;

        gridFabricaciones.on('draw', function () {
            ajustarAlturaProveedores();
            const visibles = gridFabricaciones.rows({ filter: 'applied' }).data().toArray();
            actualizarKpisFabricaciones(visibles);
        });

        $('#grd_Fabricaciones tbody').on('dblclick', 'tr', function (event) {
            dobleclick = true;
        });

        $('#grd_Fabricaciones tbody').on('click', 'tr', function (event) {
            var fila = $(this);
            var ctrlPresionado = event.ctrlKey || event.metaKey;
            var shiftPresionado = event.shiftKey;

            if (ctrlPresionado) {
                var index = filasSeleccionadas.indexOf(fila[0]);

                if (index === -1) {
                    filasSeleccionadas.push(fila[0]);
                    fila.addClass('selected');
                    $('td', fila).addClass('selected');
                } else {
                    filasSeleccionadas.splice(index, 1);
                    fila.removeClass('selected');
                    $('td', fila).removeClass('selected');
                }
            } else if (shiftPresionado && ultimaFilaSeleccionada) {
                var filas = $('#grd_Fabricaciones tbody tr');
                var indexActual = filas.index(fila);
                var indexUltima = filas.index(ultimaFilaSeleccionada);
                var inicio = Math.min(indexActual, indexUltima);
                var fin = Math.max(indexActual, indexUltima);

                filas.slice(inicio, fin + 1).each(function () {
                    if (!filasSeleccionadas.includes(this)) {
                        filasSeleccionadas.push(this);
                        $(this).addClass('selected');
                        $('td', this).addClass('selected');
                    }
                });
            } else {
                // ✅ Si NO se presiona Ctrl ni Shift, limpiar todo y seleccionar solo la nueva fila
                if (!fila.hasClass('selected') || filasSeleccionadas.length == 1) {
                    filasSeleccionadas = [fila[0]];
                    $('#grd_Fabricaciones tbody tr').removeClass('selected');
                    $('#grd_Fabricaciones tbody tr td').removeClass('selected');
                    fila.addClass('selected');
                    $('td', fila).addClass('selected');
                }
            }
            ultimaFilaSeleccionada = fila[0];
        });

        $('#grd_Fabricaciones tbody').on('dblclick', 'tr', function () {
            console.log("Doble clic en fila. Manteniendo selección.");
        });

        $('#grd_Fabricaciones tbody').on('dblclick', 'td', async function () {
            var cell = gridFabricaciones.cell(this);
            var originalData = cell.data();
            if (cell.index() == undefined) {
                return;
            }
            var colIndex = cell.index().column;
            var rowData = gridFabricaciones.row($(this).closest('tr')).data();

            if (colIndex == 0 || colIndex == 1 || colIndex == 2 || colIndex == 3 || colIndex == 4 || colIndex == 9 || colIndex == 10 || colIndex == 12) {
                return;
            }

            if (isEditing == true) {
                return;
            } else {
                isEditing = true;
            }

            if ($(this).hasClass('blinking')) {
                $(this).removeClass('blinking');
            }

            if ($(this).find('input').length > 0 || $(this).find('select').length > 0) {
                return;
            }

            if (colIndex === 6 || colIndex == 7) {
                var select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .appendTo($(this).empty())
                    .on('keydown', function (e) {
                        if (e.key === 'Enter') {
                            var selectedValue = select.val();
                            var selectedText = select.find('option:selected').text();
                            saveEdit(colIndex, selectedText, selectedValue);
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                select.find('option').css('color', 'white');
                select.find('option').css('background-color', 'black');

                var result = null;

                if (colIndex == 6) {
                    result = await listaColoresFilter();
                } else if (colIndex == 7) {
                    result = await listaEstadosFilter();
                }

                result.forEach(function (res) {
                    select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                });

                if (colIndex == 6) {
                    select.val(rowData.IdColor);
                } else if (colIndex == 7) {
                    select.val(rowData.IdEstado);
                }

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    var selectedValue = select.val();
                    var selectedText = select.find('option:selected').text();
                    saveEdit(colIndex, selectedText, selectedValue);
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                $(this).append(saveButton).append(cancelButton);
                select.focus();

            } else {
                var valueToDisplay = originalData
                var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .val(valueToDisplay)
                    .on('input', function () {
                        var saveBtn = $(this).siblings('.fa-check');

                        if (colIndex === 4) {
                            if ($(this).val().trim() === "") {
                                $(this).css('border-bottom', '2px solid red');
                                saveBtn.css('opacity', '0.5');
                                saveBtn.prop('disabled', true);
                            } else {
                                $(this).css('border-bottom', '2px solid green');
                                saveBtn.css('opacity', '1');
                                saveBtn.prop('disabled', false);
                            }
                        }
                    })
                    .on('keydown', function (e) {
                        if (e.key === 'Enter') {
                            saveEdit(colIndex, input.val(), input.val());
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) {
                        saveEdit(colIndex, input.val(), input.val());
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                $(this).empty().append(input).append(saveButton).append(cancelButton);
                input.focus();
            }

            function getFilasObjetivo(dt, filasSeleccionadas, trActual) {
                // Si hay selección múltiple, editamos esas; si no, solo la fila actual.
                if (Array.isArray(filasSeleccionadas) && filasSeleccionadas.length > 0) {
                    return [...filasSeleccionadas];
                }
                return [trActual];
            }

            // === Reemplazo de saveEdit/cancelEdit ===
            async function saveEdit(colIndex, newText, newValue) {
                const dt = gridFabricaciones;

                // 1) Guardar estado de filtros ANTES de tocar datos
                guardarFiltrosPantalla("#grd_Fabricaciones", "filtrosFabricaciones", true);

                // 2) Calcular el índice visible de la columna editada
                const visibleIndex = dt.column(colIndex).index('visible');

                // 3) Determinar filas objetivo (multi-selección o fila actual)
                const trActual = $(cell.node()).closest('tr')[0];
                const filas = getFilasObjetivo(dt, typeof filasSeleccionadas !== 'undefined' ? filasSeleccionadas : [], trActual);

                // 4) Edición en lote sin draw por cada fila
                for (let i = 0; i < filas.length; i++) {
                    const rowNode = filas[i];
                    const rowData = dt.row($(rowNode)).data();

                    // Tomo el texto original (para evitar re-escrituras innecesarias)
                    let originalText = dt.cell(rowNode, colIndex).data();
                    // Si venía con HTML, me quedo con el texto plano
                    if (typeof originalText === 'string') {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = originalText;
                        originalText = tmp.textContent.trim();
                    }

                    // Si no cambió, sigo con la próxima
                    if (String(originalText) === String(newText)) {
                        continue;
                    }

                    // 4.a) Actualizar el modelo según la columna
                    if (colIndex === 6) {
                        // Color
                        rowData.IdColor = (newValue === '' || newValue == null) ? null : parseInt(newValue, 10);
                        rowData.Color = newText;
                    } else if (colIndex === 7) {
                        // Estado
                        rowData.IdEstado = (newValue === '' || newValue == null) ? null : parseInt(newValue, 10);
                        rowData.Estado = newText;
                    } else {
                        // Resto de columnas: asigno por cabecera visible (como fallback seguro)
                        // Si tenés un map dataSrc por columna, podés usarlo acá.
                        const headerText = dt.column(colIndex).header().textContent.trim();
                        if (headerText && Object.prototype.hasOwnProperty.call(rowData, headerText)) {
                            rowData[headerText] = newText;
                        } else {
                            // Si la propiedad no existe, no ensucio el modelo.
                            // (Si querés forzar, podés crear un map ColIndex->Propiedad)
                        }
                    }

                    // 4.b) Actualizar solo esa fila sin redibujar toda la tabla
                    dt.row($(rowNode)).data(rowData);

                    // 4.c) Feedback visual en la celda correcta (por índice visible)
                    // OJO: si la columna está oculta, no existe el TD visual; chequeo primero:
                    const $tds = $(rowNode).find('td');
                    if (visibleIndex != null && visibleIndex >= 0 && visibleIndex < $tds.length) {
                        const $celda = $tds.eq(visibleIndex);
                        $celda.addClass('blinking');
                        setTimeout(() => $celda.removeClass('blinking'), 3000);
                    }

                    // 4.d) Persistir cada fila en backend
                    try {
                        await guardarCambiosFila(rowData);
                    } catch (err) {
                        console.error('Error guardando fila', err);
                    }
                }

                // 5) Un solo draw al final
                dt.draw(false);

                // 6) Reaplicar filtros guardados (como en Insumos)
                await aplicarFiltrosRestaurados(dt, "#grd_Fabricaciones", "filtrosFabricaciones", true);

                // 7) Limpiar selección y salir de modo edición
                if (typeof filasSeleccionadas !== 'undefined' && Array.isArray(filasSeleccionadas)) {
                    $(filasSeleccionadas).each((_, n) => {
                        $(n).removeClass('selected').find('td').removeClass('selected');
                    });
                    filasSeleccionadas = [];
                }
                isEditing = false;
            }

            async function cancelEdit() {
                // Restaurar el valor original SOLO de la celda actual y redibujar
                gridFabricaciones.cell(cell.index()).data(originalData).draw(false);

                // Reaplicar filtros como en Insumos (por si la restauración cambió algo visual)
                await aplicarFiltrosRestaurados(gridFabricaciones, "#grd_Fabricaciones", "filtrosFabricaciones", true);

                isEditing = false;
            }
        });

    } else {
        // 🔥 Solo refrescamos datos (sin destruir la tabla)
        gridFabricaciones.clear().rows.add(data).draw(false);

        const visibles = gridFabricaciones.rows({ filter: 'applied' }).data().toArray();
        actualizarKpisFabricaciones(visibles);
    }
}

// ======================= RESTO: helpers/servicios =======================
async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Pedidos/ActualizarDetalleProceso', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rowData)
        });
        if (response.ok) return true;
        errorModal('Ha ocurrido un error al guardar los datos...');
        return false;
    } catch (error) {
        console.error('Error de red:', error);
    }
}

$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});

function configurarOpcionesColumnas() {
    const grid = $('#grd_Fabricaciones').DataTable();
    const columnas = grid.settings().init().columns;
    const container = $('#configColumnasMenu');

    const storageKey = `Fabricaciones_Columnas`;

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {};

    container.empty();

    columnas.forEach((col, index) => {
        if (col.data && col.data != "Id" && index != 13) {
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            grid.column(index).visible(isChecked);

            let columnName;
            if (col.data == "IdPedido") columnName = "Pedido";
            else if (col.data == "IdDetalle") columnName = "Detalle";
            else columnName = col.data;

            container.append(`
                <li>
                    <label class="dropdown-item">
                        <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                        ${columnName}
                    </label>
                </li>
            `);
        }
    });

    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}

function editarPedido(id) {
    guardarFiltrosPantalla('#grd_Fabricaciones', 'estadoFabricaciones', false);
    localStorage.setItem("RedireccionFabricaciones", 1);
    window.location.href = '/Pedidos/NuevoModif/' + id;
}

// ---- catálogos ----
async function listaEstadosFilter() {
    const response = await fetch(`/PedidosEstados/Lista`);
    const data = await response.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
async function listaProductosFilter() {
    const response = await fetch(`/Productos/Lista`);
    const data = await response.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
async function listaColoresFilter() {
    const response = await fetch(`/Colores/Lista`);
    const data = await response.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
async function listaColores() {
    const data = await listaColoresFilter();
    $('#Colores option').remove();
    select = document.getElementById("Colores");
    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}
async function listaCategoriasFilter() {
    const response = await fetch(`/InsumosCategorias/Lista`);
    const data = await response.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
async function listaCategorias() {
    const data = await listaCategoriasFilter();
    $('#Categorias option').remove();
    select = document.getElementById("Categorias");
    option = document.createElement("option");
    option.value = "-1"; option.text = "Todos"; select.appendChild(option);
    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}
async function listaProveedoresFilter() {
    const response = await fetch(`/Proveedores/Lista`);
    const data = await response.json();
    return data.map(dto => ({ Id: dto.Id, Nombre: dto.Nombre }));
}

// ---- sidebar proveedores (igual que tenías) ----
async function cargarListadoProveedores() {
    const listado = document.getElementById('listadoProveedores');
    listado.innerHTML = '';
    const proveedores = await listaProveedoresFilter();
    proveedores.forEach(p => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<a href="#" onclick="seleccionarProveedor(${p.id})">${p.Nombre}</a>`;
        listado.appendChild(div);
    });
}
function seleccionarProveedor(id) { console.log("Proveedor seleccionado:", id); }
window.onload = cargarListadoProveedores;

document.getElementById('buscarProveedor').addEventListener('input', function () {
    const filtro = this.value.toLowerCase();
    const proveedores = document.querySelectorAll('#listadoProveedores > div');
    proveedores.forEach(function (prov) {
        const texto = prov.textContent.toLowerCase();
        prov.style.display = texto.includes(filtro) ? '' : 'none';
    });
});

let proveedoresSeleccionados = [];

$(document).on("click", "#listadoProveedores a", function (e) {
    e.preventDefault();
    const proveedor = $(this).text().trim();
    const tabla = $('#grd_Fabricaciones').DataTable();
    const index = proveedoresSeleccionados.indexOf(proveedor);

    $("#grd_Fabricaciones tbody tr").removeClass("hover-intenso hover-verde");
    $("#grd_Fabricaciones tbody td").removeClass("hover-intenso hover-verde");

    if (index !== -1) {
        proveedoresSeleccionados.splice(index, 1);
        $(this).removeClass("proveedor-activo");
    } else {
        proveedoresSeleccionados.push(proveedor);
        $(this).addClass("proveedor-activo");
    }

    if (proveedoresSeleccionados.length === 0) {
        tabla.column(11).search('').draw(false);
    } else {
        const filtroRegex = proveedoresSeleccionados.map(p => `^${p}$`).join('|');
        tabla.column(11).search(filtroRegex, true, false).draw(false);
    }
});

$(document).on("mouseenter", "#listadoProveedores a", function () {
    if (proveedoresSeleccionados.length > 0) return;
    const proveedorHover = $(this).text().trim();
    $('#grd_Fabricaciones tbody tr').each(function () {
        const tdProveedor = $(this).find("td").eq(11);
        if (tdProveedor.text().trim() === proveedorHover) {
            $(this).addClass("hover-verde");
            $(this).find("td").addClass("hover-verde");
        }
    });
});
$(document).on("mouseenter", "#listadoProveedores a.proveedor-activo", function () {
    const proveedor = $(this).text().trim();
    if (proveedoresSeleccionados.length < 2) return;
    $(this).addClass("hover-intenso");
    $('#grd_Fabricaciones tbody tr').each(function () {
        const tdProveedor = $(this).find("td").eq(11);
        if (tdProveedor.text().trim() === proveedor) {
            $(this).addClass("hover-intenso");
            $(this).find("td").addClass("hover-intenso");
        }
    });
});
$(document).on("mouseleave", "#listadoProveedores a.proveedor-activo", function () {
    $(this).removeClass("hover-intenso");
    $("#grd_Fabricaciones tbody tr, #grd_Fabricaciones tbody td").removeClass("hover-intenso");
});
$(document).on("mouseleave", "#listadoProveedores a", function () {
    $("#grd_Fabricaciones tbody tr, #grd_Fabricaciones tbody td").removeClass("hover-verde");
});

function ajustarAlturaProveedores() {
    let tabla = document.querySelector('#grd_Fabricaciones');
    if (tabla) {
        let alturaTabla = tabla.offsetHeight + 168;
        document.querySelector('#listadoProveedores').style.height = alturaTabla + 'px';
    }
}

let proveedorActivoIndex = -1;
$(document).on('keydown', function (e) {
    const links = $('#listadoProveedores a');
    if (links.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (proveedorActivoIndex === -1) proveedorActivoIndex = 0;
        else proveedorActivoIndex = (e.key === 'ArrowDown')
            ? (proveedorActivoIndex + 1) % links.length
            : (proveedorActivoIndex - 1 + links.length) % links.length;

        links.removeClass('proveedor-activo');
        proveedoresSeleccionados = [];

        const linkActivo = links.eq(proveedorActivoIndex);
        const proveedor = linkActivo.text().trim();

        linkActivo.addClass('proveedor-activo');
        proveedoresSeleccionados.push(proveedor);

        const tabla = $('#grd_Fabricaciones').DataTable();
        tabla.column(11).search(`^${proveedor}$`, true, false).draw(false);
    }
});

function actualizarKpisFabricaciones(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiCantFabricaciones');
    if (el) el.textContent = cant;
}