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
];


$(document).ready(() => {

    listaFabricaciones();

    
})


async function listaFabricaciones() {
    const url = `/Fabricaciones/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

async function configurarDataTable(data) {
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
            columns: [
                {

                    data: "Id",
                    title: '',
                    width: "1%", // Ancho fijo para la columna
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
                
                { data: 'IdPedido', name:"Pedido" },
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
                        columns: [2, 5,4,6,8]
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
                const idTabla = '#grd_Fabricaciones';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoFabricaciones')) || {};

                const visibilidadActual = api.columns().visible().toArray();

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
                                    await api.column(index).search(regex, true, false).draw();
                                } else {
                                    await api.column(index).search('').draw();
                                }
                            });

                        const data = await config.fetchDataFunc();
                        data.forEach(item => {
                            select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
                        });

                        select.select2({ placeholder: 'Seleccionar...', width: '100%' });

                        // Aplicar filtro guardado
                        if (valorGuardado) {
                            const valores = Array.isArray(valorGuardado) ? valorGuardado : [valorGuardado];
                            const opcionesActuales = data.map(x => x.Nombre);
                            const valoresValidos = valores.filter(v => opcionesActuales.includes(v));
                            if (valoresValidos.length > 0) {
                                select.val(valoresValidos).trigger('change.select2');

                                // Aplicar búsqueda al DataTable
                                const regex = '^(' + valoresValidos.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                await api.column(index).search(regex, true, false).draw();
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
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });

                        // Aplicar búsqueda al inicializar
                        if (valorGuardado) {
                            const regexr = '(((' + valorGuardado + ')))';
                            api.column(index).search(regexr, true, false);
                        }
                    }
                }


                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario
                

                await configurarOpcionesColumnas()


                await aplicarFiltrosRestaurados(api, '#grd_Fabricaciones', 'estadoFabricaciones', false);
                localStorage.removeItem('estadoFabricaciones');

               
                setTimeout(function () {
                    gridFabricaciones.columns.adjust();
                }, 1);

                actualizarKpisFabricaciones(data)

                $('body').on('mouseenter', '#grd_Fabricaciones .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

                $('body').on('click', '#grd_Fabricaciones .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });

        // Variable para almacenar la última fila seleccionada
        var ultimaFilaSeleccionada = null;
        var dobleclick = false;

        gridFabricaciones.on('draw', function () {
            ajustarAlturaProveedores();
        });

        $('#grd_Fabricaciones tbody').on('dblclick', 'tr', function (event) {
            dobleclick = true;
        });

        $('#grd_Fabricaciones tbody').on('click', 'tr', function (event) {
            var fila = $(this);

            // Verificar si se está presionando Ctrl (o Cmd en Mac)
            var ctrlPresionado = event.ctrlKey || event.metaKey; // Ctrl en Windows/Linux, Cmd en Mac
            // Verificar si se está presionando Shift
            var shiftPresionado = event.shiftKey;

            if (ctrlPresionado) {
                // Si se presiona Ctrl/Cmd, agregar o quitar la fila de la selección
                var index = filasSeleccionadas.indexOf(fila[0]);

                if (index === -1) {
                    // Si no está seleccionada, agregarla
                    filasSeleccionadas.push(fila[0]);
                    fila.addClass('selected');
                    $('td', fila).addClass('selected');
                } else {
                    // Si ya está seleccionada, quitarla
                    filasSeleccionadas.splice(index, 1);
                    fila.removeClass('selected');
                    $('td', fila).removeClass('selected');
                }
            } else if (shiftPresionado && ultimaFilaSeleccionada) {
                // Si se presiona Shift, seleccionar todas las filas entre la última fila seleccionada y la fila actual
                var filas = $('#grd_Fabricaciones tbody tr');
                var indexActual = filas.index(fila);
                var indexUltima = filas.index(ultimaFilaSeleccionada);

                // Determinar el rango de filas a seleccionar
                var inicio = Math.min(indexActual, indexUltima);
                var fin = Math.max(indexActual, indexUltima);

                // Seleccionar todas las filas en el rango
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
                    filasSeleccionadas = [fila[0]]; // Reiniciar selección
                    $('#grd_Fabricaciones tbody tr').removeClass('selected');
                    $('#grd_Fabricaciones tbody tr td').removeClass('selected');
                    fila.addClass('selected');
                    $('td', fila).addClass('selected');
                }
                
            }

            // Actualizar la última fila seleccionada
            ultimaFilaSeleccionada = fila[0];
        });

        // ✅ PREVENIR QUE AL HACER DOBLE CLIC SE DESMARQUEN TODAS LAS FILAS
        $('#grd_Fabricaciones tbody').on('dblclick', 'tr', function () {
            // Acá puedes poner la acción de cambiar el estado sin modificar la selección
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

            if (colIndex == 0 || colIndex == 1 || colIndex == 2 || colIndex == 3 || colIndex == 4 ||  colIndex == 9 || colIndex == 10) {
                return;
            }

            if (isEditing == true) {
                return;
            } else {
                isEditing = true;
            }

            // Eliminar la clase 'blinking' si está presente
            if ($(this).hasClass('blinking')) {
                $(this).removeClass('blinking');
            }

            // Si ya hay un input o select, evitar duplicados
            if ($(this).find('input').length > 0 || $(this).find('select').length > 0) {
                return;
            }



            // Si la columna es la de la provincia (por ejemplo, columna 3)
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


                // Estilo para las opciones del select
                select.find('option').css('color', 'white'); // Cambiar el color del texto de las opciones a blanco
                select.find('option').css('background-color', 'black'); // Cambiar el fondo de las opciones a negro

                // Obtener las provincias disponibles

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


                // Crear los botones de guardar y cancelar
                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    var selectedValue = select.val();
                    var selectedText = select.find('option:selected').text();
                    saveEdit(colIndex, selectedText, selectedValue);
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Agregar los botones de guardar y cancelar en la celda
                $(this).append(saveButton).append(cancelButton);

                // Enfocar el select
                select.focus();

            } else {
                var valueToDisplay = originalData
                var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .val(valueToDisplay)
                    .on('input', function () {
                        var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                        if (colIndex === 4) { // Validar solo si es la columna 0
                            if ($(this).val().trim() === "") {
                                $(this).css('border-bottom', '2px solid red'); // Borde rojo
                                saveBtn.css('opacity', '0.5'); // Desactivar botón de guardar visualmente
                                saveBtn.prop('disabled', true); // Desactivar funcionalidad del botón
                            } else {
                                $(this).css('border-bottom', '2px solid green'); // Borde verde
                                saveBtn.css('opacity', '1'); // Habilitar botón de guardar visualmente
                                saveBtn.prop('disabled', false); // Habilitar funcionalidad del botón
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
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, input.val(), input.val());
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Reemplazar el contenido de la celda
                $(this).empty().append(input).append(saveButton).append(cancelButton);

                input.focus();
            }

            // === Helpers opcionales ===
            function getFilasObjetivo(dt, filasSeleccionadas, trActual) {
                // Si hay selección múltiple, editamos esas; si no, solo la fila actual.
                if (Array.isArray(filasSeleccionadas) && filasSeleccionadas.length > 0) {
                    return [...filasSeleccionadas];
                }
                return [trActual];
            }

            // === Reemplazo de saveEdit/cancelEdit ===
            // Ejecuta promesas con límite de concurrencia (evita cuelgues y saturación)
            async function runLimited(items, limit, taskFn) {
                const executing = new Set();
                const results = [];
                for (const item of items) {
                    const p = Promise.resolve().then(() => taskFn(item));
                    results.push(p);
                    executing.add(p);
                    p.finally(() => executing.delete(p));
                    if (executing.size >= limit) {
                        await Promise.race(executing);
                    }
                }
                return Promise.allSettled(results);
            }

            async function saveEdit(colIndex, newText, newValue) {
                const dt = gridFabricaciones;

                // 1) Guardar estado de filtros ANTES de mutar (barato)
                guardarFiltrosPantalla("#grd_Fabricaciones", "filtrosFabricaciones", true);

                // 2) Índice visible una vez
                const visibleIndex = dt.column(colIndex).index('visible');

                // 3) Resolver filas objetivo (multi o actual)
                const trActual = $(cell.node()).closest('tr')[0];
                const filas = (typeof filasSeleccionadas !== 'undefined' && Array.isArray(filasSeleccionadas) && filasSeleccionadas.length > 0)
                    ? [...filasSeleccionadas]
                    : [trActual];

                // 4) Cachear nodos de celdas para parpadeo (evita .find() en loop)
                const celdaNodes = [];
                if (visibleIndex != null && visibleIndex >= 0) {
                    for (const rowNode of filas) {
                        const tds = rowNode.cells; // HTMLCollection más rápido que jQuery
                        if (visibleIndex < tds.length) celdaNodes.push(tds[visibleIndex]);
                        else celdaNodes.push(null);
                    }
                }

                // 5) Actualizar modelo en memoria (sin draw)
                const filasParaPersistir = [];
                for (let i = 0; i < filas.length; i++) {
                    const rowNode = filas[i];
                    const row = dt.row(rowNode);
                    const rowData = row.data();

                    // Texto original plano (sin HTML)
                    let originalText = dt.cell(rowNode, colIndex).data();
                    if (typeof originalText === 'string') {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = originalText;
                        originalText = tmp.textContent.trim();
                    }

                    // Si no cambió, salteo persistencia/parpadeo
                    if (String(originalText) === String(newText)) continue;

                    // Sincronizaciones específicas
                    if (colIndex === 6) {
                        rowData.IdColor = (newValue === '' || newValue == null) ? null : parseInt(newValue, 10);
                        rowData.Color = newText;
                    } else if (colIndex === 7) {
                        rowData.IdEstado = (newValue === '' || newValue == null) ? null : parseInt(newValue, 10);
                        rowData.Estado = newText;
                    } else {
                        // Fallback por cabecera visible (mismo criterio que usás en Insumos)
                        const headerText = dt.column(colIndex).header().textContent.trim();
                        if (headerText && Object.prototype.hasOwnProperty.call(rowData, headerText)) {
                            rowData[headerText] = newText;
                        }
                    }

                    // Seteo data en memoria (no dibuja)
                    row.data(rowData);

                    // Marcar para persistir
                    filasParaPersistir.push(rowData);
                }

                // 6) Un solo draw al final (sin invalidaciones extras)
                dt.draw(false);

                // 7) Parpadeo visual liviano (post-draw)
                for (const td of celdaNodes) {
                    if (!td) continue;
                    td.classList.add('blinking');
                    // requestAnimationFrame evita jank del main thread
                    requestAnimationFrame(() => {
                        setTimeout(() => td.classList.remove('blinking'), 3000);
                    });
                }

                // 8) Persistir en backend en paralelo con límite (mejor latencia total)
                //    Ajustá el 4 si tu API lo tolera (2-6 suele ir bien).
                try {
                    await runLimited(filasParaPersistir, 4, (rd) => guardarCambiosFila(rd));
                } catch (err) {
                    console.error('Error en persistencia en paralelo:', err);
                }

                // 9) Reaplicar filtros UNA sola vez y fuera del flujo crítico
                //    (cede el hilo para que el UI actualice primero)
                setTimeout(async () => {
                    try {
                        await aplicarFiltrosRestaurados(dt, "#grd_Fabricaciones", "filtrosFabricaciones", true);
                    } catch (e) {
                        console.warn('aplicarFiltrosRestaurados falló:', e);
                    }
                }, 0);

                // 10) Limpiar selección y estado
                if (typeof filasSeleccionadas !== 'undefined' && Array.isArray(filasSeleccionadas)) {
                    for (const n of filasSeleccionadas) {
                        n.classList.remove('selected');
                        // quitar 'selected' de todas las celdas (si lo usás)
                        for (const td of n.cells) td.classList.remove('selected');
                    }
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
        gridFabricaciones.clear().rows.add(data).draw();
        actualizarKpisFabricaciones(data)
    }
}

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Pedidos/ActualizarDetalleProceso', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (response.ok) {
            return true;
        } else {
            errorModal('Ha ocurrido un error al guardar los datos...')
            return false;
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

function configurarOpcionesColumnas() {
    const grid = $('#grd_Fabricaciones').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Fabricaciones_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data != "Id" && index != 12) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);


            let columnName;

            if (col.data == "IdPedido") {
                columnName = "Pedido";
            } else if (col.data == "IdDetalle") {
                columnName = "Detalle";
            } else {
                columnName = col.data;
            }

            // Ahora agregamos el checkbox, asegurándonos de que se marque solo si 'isChecked' es 'true'
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

    // Asocia el evento para ocultar/mostrar columnas
    $('.toggle-column').on('change', function () {
        const columnIdx = parseInt($(this).data('column'), 10);
        const isChecked = $(this).is(':checked');
        savedConfig[`col_${columnIdx}`] = isChecked;
        localStorage.setItem(storageKey, JSON.stringify(savedConfig));
        grid.column(columnIdx).visible(isChecked);
    });
}



function editarPedido(id) {
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    guardarFiltrosPantalla('#grd_Fabricaciones', 'estadoFabricaciones', false);
    localStorage.setItem("RedireccionFabricaciones", 1);
    window.location.href = '/Pedidos/NuevoModif/' + id;
}



async function listaEstadosFilter() {
    const url = `/PedidosEstados/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}

async function listaProductosFilter() {
    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}

async function listaColoresFilter() {
    const url = `/Colores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

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
    const url = `/InsumosCategorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}

async function listaCategorias() {
    const data = await listaCategoriasFilter();

    $('#Categorias option').remove();

    select = document.getElementById("Categorias");

    option = document.createElement("option");
    option.value = "-1"
    option.text = "Todos"
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }

}


async function listaProveedoresFilter() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}


async function cargarListadoProveedores() {
    const listado = document.getElementById('listadoProveedores');
    listado.innerHTML = ''; // limpiar anterior

    const proveedores = await listaProveedoresFilter();


    proveedores.forEach(p => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<a href="#" onclick="seleccionarProveedor(${p.id})">${p.Nombre}</a>`;
        listado.appendChild(div);
    });
}

function seleccionarProveedor(id) {
    console.log("Proveedor seleccionado:", id);
    // Acá podés cargar los detalles en la tabla, por ejemplo
}

// Llamar esta función al cargar la página
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
    e.preventDefault(); // <--- ESTO evita que se suba la pantalla
    const proveedor = $(this).text().trim();
    const tabla = $('#grd_Fabricaciones').DataTable();
    const index = proveedoresSeleccionados.indexOf(proveedor);

    $("#grd_Fabricaciones tbody tr").removeClass("hover-intenso");
    $("#grd_Fabricaciones tbody td").removeClass("hover-intenso");
    $("#grd_Fabricaciones tbody tr").removeClass("hover-verde");
    $("#grd_Fabricaciones tbody td").removeClass("hover-verde");

    if (index !== -1) {
        // Ya estaba seleccionado, lo saco
        proveedoresSeleccionados.splice(index, 1);
        $(this).removeClass("proveedor-activo");
    } else {
        // No estaba seleccionado, lo agrego
       
        proveedoresSeleccionados.push(proveedor);
        $(this).addClass("proveedor-activo");
    }

    if (proveedoresSeleccionados.length === 0) {
        tabla.column(11).search('').draw();
    } else {
        // Armo expresión regex OR
        const filtroRegex = proveedoresSeleccionados.map(p => `^${p}$`).join('|');
        tabla.column(11).search(filtroRegex, true, false).draw();
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


// Mouse enter sobre proveedor seleccionado
$(document).on("mouseenter", "#listadoProveedores a.proveedor-activo", function () {
    const proveedor = $(this).text().trim();

    if (proveedoresSeleccionados.length < 2) return;

    // Aplicar clase visual más intensa en el listado
    $(this).addClass("hover-intenso");

    // Resaltar en la tabla
    $('#grd_Fabricaciones tbody tr').each(function () {
        const tdProveedor = $(this).find("td").eq(11);
        if (tdProveedor.text().trim() === proveedor) {
            $(this).addClass("hover-intenso");
            $(this).find("td").addClass("hover-intenso");
        }
    });
});

// Mouse leave, limpiar clases de hover-intenso
$(document).on("mouseleave", "#listadoProveedores a.proveedor-activo", function () {
    $(this).removeClass("hover-intenso");
    $("#grd_Fabricaciones tbody tr").removeClass("hover-intenso");
    $("#grd_Fabricaciones tbody td").removeClass("hover-intenso");
});


$(document).on("mouseleave", "#listadoProveedores a", function () {
    $("#grd_Fabricaciones tbody tr").removeClass("hover-verde");
    $("#grd_Fabricaciones tbody td").removeClass("hover-verde");
});


function ajustarAlturaProveedores() {
    let tabla = document.querySelector('#grd_Fabricaciones');
    if (tabla) {
        let alturaTabla = tabla.offsetHeight + 168;
        document.querySelector('#listadoProveedores').style.height = alturaTabla + 'px';
    }
}

    let proveedorActivoIndex = -1; // índice del proveedor actualmente seleccionado con flechas

$(document).on('keydown', function (e) {
    const links = $('#listadoProveedores a');
    if (links.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); // Evitar scroll

        if (proveedorActivoIndex === -1) {
            // Si no hay ninguno seleccionado aún, arranco desde el primero
            proveedorActivoIndex = 0;
        } else {
            // Navegar
            if (e.key === 'ArrowDown') {
                proveedorActivoIndex = (proveedorActivoIndex + 1) % links.length;
            } else if (e.key === 'ArrowUp') {
                proveedorActivoIndex = (proveedorActivoIndex - 1 + links.length) % links.length;
            }
        }

        // Limpiar selección actual
        links.removeClass('proveedor-activo');
        proveedoresSeleccionados = [];

        // Activar nuevo proveedor
        const linkActivo = links.eq(proveedorActivoIndex);
        const proveedor = linkActivo.text().trim();

        linkActivo.addClass('proveedor-activo');
        proveedoresSeleccionados.push(proveedor);

        // Filtrar en la tabla
        const tabla = $('#grd_Fabricaciones').DataTable();
        tabla.column(11).search(`^${proveedor}$`, true, false).draw();
    }
});


function actualizarKpisFabricaciones(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiCantFabricaciones');
    if (el) el.textContent = cant;
}

        function getDataSrc(dt, colIdx){
  // Esta es la forma más segura con DataTables 1.13+:
  return dt.column(colIdx).dataSrc(); // p.ej. "Estado", "IdEstado", etc.
}

// Actualiza una fila sin redibujar toda la tabla
function updateRowFast(dt, rowNode, newRowData){
  dt.row($(rowNode)).data(newRowData).invalidate(); // NO draw acá
}