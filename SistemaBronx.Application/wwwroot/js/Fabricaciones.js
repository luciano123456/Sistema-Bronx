let gridFabricaciones;
let isEditing = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaProductosFilter },
    { index: 4, filterType: 'text' }, // Columna con un filtro de selección (de provincias)
    { index: 5, filterType: 'text' }, // Columna con un filtro de selección (de provincias)
    { index: 6, filterType: 'text', filterType: 'select', fetchDataFunc: listaColoresFilter },
    { index: 7, filterType: 'text', filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text', filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 11, filterType: 'select', fetchDataFunc: listaProveedoresFilter },
    { index: 12, filterType: 'text' },
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
                        columns: [1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Fabricaciones_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',

                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: false,


            initComplete: async function () {
                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        // Crear el select con la opción de multiselect
                        var select = $('<select id="filter' + config.index + '" multiple="multiple"><option value="">Seleccionar...</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var selectedValues = $(this).val();

                                if (selectedValues && selectedValues.length > 0) {
                                    var regex = selectedValues.join('|'); // Crear una expresión regular para múltiples opciones

                                    // Aplica la búsqueda en la columna oculta
                                    api.column(config.index, { search: 'applied' }).search(regex, true, false).draw();
                                } else {
                                    api.column(config.index, { search: 'applied' }).search('').draw(); // Limpiar filtro
                                }
                            });

                        // Llamada a la función para obtener los datos para el filtro
                        var data = await config.fetchDataFunc();
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
                        });

                        // Inicializar Select2 para el filtro con la opción de multiselect
                        select.select2({
                            placeholder: 'Seleccionar...',
                            width: '100%'
                        });
                    }
 else if (config.filterType === 'text') {
                        var input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change') // Desactivar manejadores anteriores
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                var regexr = '({search})';
                                var cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '', this.value != '', this.value == '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                });

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario
                

                configurarOpcionesColumnas()

                setTimeout(function () {
                    gridFabricaciones.columns.adjust();
                }, 30);

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
                    .on('change', function () {
                        // No hacer nada en el change, lo controlamos con el botón de aceptar
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

            // Función para guardar los cambios con el parpadeo en las filas seleccionadas
            async function saveEdit(colIndex, newText, newValue) {
                // Asegurarnos de que las filas seleccionadas se guardan una por una
                for (let i = 0; i < filasSeleccionadas.length; i++) {
                    const rowElement = filasSeleccionadas[i];

                    // Obtener los datos de la fila usando gridFabricaciones.row()
                    let rowData = gridFabricaciones.row($(rowElement)).data(); // Aquí obtenemos los datos de la fila seleccionada

                    // Obtener la celda editada de la fila seleccionada
                    const celda = $(rowElement).find('td').eq(colIndex);

                    // Actualizar los datos en la fila según la columna editada
                    if (colIndex === 6) {
                        rowData.IdColor = newValue;
                        rowData.Color = newText;
                    } else if (colIndex === 7) {
                        rowData.IdEstado = parseInt(newValue);
                        rowData.Estado = newText;
                    } else {
                        let header = gridFabricaciones.column(colIndex).header().textContent;
                        rowData[header] = newText;
                    }

                    // Actualizar la celda específica en la tabla
                    gridFabricaciones.cell(rowElement, colIndex).data(newText).draw();

                    // Añadir la clase de parpadeo a la celda
                    celda.addClass('blinking');

                    try {
                        // Enviar los datos al servidor y esperar que se complete el guardado antes de continuar
                        await guardarCambiosFila(rowData); // Usamos los datos de la fila seleccionada
                        console.log(`Fila ${i + 1} guardada exitosamente`);

                        // Remover el parpadeo después de 3 segundos solo en la celda editada
                        setTimeout(function () {
                            $(rowElement).find('td').eq(colIndex).removeClass('blinking');
                        }, 3000);

                    } catch (error) {
                        console.error(`Error guardando la fila ${i + 1}:`, error);
                    }
                }

                // **Eliminar la clase 'selected' de las filas seleccionadas después de guardar**
                $(filasSeleccionadas).each(function (index, rowElement) {
                    $(rowElement).removeClass('selected');
                    $(rowElement).find('td').removeClass('selected');
                });

                // Desactivar el modo de edición
                isEditing = false;

                // Limpiar las filas seleccionadas después de guardar
                filasSeleccionadas = [];
            }









            // Función para cancelar la edición
            function cancelEdit() {
                // Restaurar el valor original
                gridFabricaciones.cell(cell.index()).data(originalData).draw();
                isEditing = false;
            }
        });


    } else {
        gridFabricaciones.clear().rows.add(data).draw();
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
    const url = `/PedidosCategorias/Lista`;
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