let gridProductos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaProductos = null; // Variable para almacenar la fila seleccionada


$(document).ready(async function () {



    document.getElementById("Fecha").value = moment().format('YYYY-MM-DD');

    configurarDataTableProductos(null);

    await listaClientes();

    $("#Clientes").select2({
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });


    $("#Categorias").select2({
        dropdownParent: $("#productoModal"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $("#Categorias").on("change", function () {
        var textoSeleccionado = $(this).find("option:selected").text().toLowerCase().trim(); // Obtener el texto seleccionado de la lista de categorías

        // Si se selecciona "Todos", mostrar todas las filas
        if (textoSeleccionado === "todos") {
            $("#grd_Productos_Modal tbody tr").show(); // Muestra todas las filas
            // Eliminar mensaje de "No se encontraron resultados" si está presente
            $("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").remove();
        } else {
            // Filtrar las filas de la tabla
            var foundAny = false; // Variable para saber si encontramos al menos una coincidencia

            $("#grd_Productos_Modal tbody tr").each(function () {
                var categoriaTexto = $(this).find('td').eq(1).text().toLowerCase().trim(); // Ajusta el índice de la columna si es necesario
                if (categoriaTexto.indexOf(textoSeleccionado) > -1) {
                    $(this).show(); // Mostrar la fila si hay coincidencia
                    foundAny = true; // Marcamos que encontramos una coincidencia
                } else {
                    $(this).hide(); // Ocultar la fila si no hay coincidencia
                }
            });

            // Si no se encontró ninguna coincidencia, mostrar un mensaje o hacer algo
            if (!foundAny) {
                // Verificar si ya existe la fila de "No se encontraron resultados"
                if ($("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").length === 0) {
                    $("#grd_Productos_Modal tbody").append('<tr><td colspan="5" class="text-center">No hay datos disponibles en la tabla</td></tr>');
                }
            } else {
                // Si hay coincidencias, asegurarse de que cualquier mensaje previo sea eliminado
                $("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").remove();
            }
        }
    });



    $("#busqueda").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#grd_Productos_Modal tbody tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });


    


});

async function listaEstadosFilter() {
    const url = `/PedidosEstados/Lista`;
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
    const url = `/Productos/ListaCategorias`;
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

    ption = document.createElement("option");
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


async function configurarDataTableProductosModal(data) {
    if (gridProductosModal == null) {
        gridProductosModal = $('#grd_Productos_Modal').DataTable({
            data: data != null ? data : null,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            paging: false,  // Desactiva la paginación
            scrollX: true,  // Asegura que se pueda hacer scroll horizontal
            scrollY: "400px",  // Ajusta la altura para el scroll vertical
            scrollCollapse: true,  // Habilita el colapso del scroll si hay pocas filas
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'CostoUnitario' },
                { data: 'Id', visible: false },

            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [2] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {

                var api = this.api();

                setTimeout(function () {
                    gridProductosModal.columns.adjust();
                }, 250);


                
                $('#grd_Productos_Modal tbody').on('click', 'tr', async function () {
                    // Remover la clase de la fila anteriormente seleccionada
                    if (filaSeleccionadaProductos) {
                        $(filaSeleccionadaProductos).removeClass('selected');
                        $('td', filaSeleccionadaProductos).removeClass('selected');

                    }

                    var data = gridProductosModal.row(this).data();

                    if (data != null) {
                        cargarInformacionProducto(data.Id);
                    }


                    // Obtener la fila actual
                    filaSeleccionadaProductos = $(this);

                    // Agregar la clase a la fila actual
                    $(filaSeleccionadaProductos).addClass('selected');
                    $('td', filaSeleccionadaProductos).addClass('selected');

                });

                $('body').on('mouseenter', '#grd_Productos_Modal', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {



        gridProductosModal.clear().rows.add(data).draw();

        setTimeout(function () {
            gridProductosModal.columns.adjust();
        }, 250);
    }
}

async function configurarDataTableInsumosModal(data) {
    if (gridInsumosModal == null) {
        gridInsumosModal = $('#grd_Insumos_Modal').DataTable({
            data: data != null ? data.$values : null,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            paging: false,  // Desactiva la paginación
            scrollX: true,  // Asegura que se pueda hacer scroll horizontal
            scrollY: "200px",  // Ajusta la altura para el scroll vertical
            scrollCollapse: true,  // Habilita el colapso del scroll si hay pocas filas
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Cantidad' },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'IdColor', visible: false, name: 'IdColor' },
                { data: 'Color', name: 'Color' },  // Establece el ancho para la columna de Color
                { data: 'IdEstado', visible: false },
                { data: 'Estado', },  // Establece el ancho para la columna de Estado
                { data: 'IdTipo', visible: false },
                { data: 'Tipo', },  // Establece el ancho para la columna de Estado
                { data: 'Especificacion' },
                { data: 'Comentarios' },
                { data: 'Id', visible: false },
            ],
            
            orderCellsTop: true,
            fixedHeader: true,

            "columnDefs": [],

            initComplete: async function () {
                var api = this.api();

                setTimeout(function () {
                    gridInsumosModal.columns.adjust();
                }, 250);

               

                // Variable para almacenar la última fila seleccionada
                var ultimaFilaSeleccionada = null;

                $('#grd_Insumos_Modal tbody').on('click', 'tr', function (event) {
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
                        var filas = $('#grd_Insumos_Modal tbody tr');
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
                        // Si no se presiona Ctrl/Cmd ni Shift, selecciona solo esta fila
                        if (filasSeleccionadas.length === 1 && filasSeleccionadas.includes(fila[0])) {
                            // Si ya está seleccionada y es la única fila seleccionada, deseleccionarla
                            filasSeleccionadas = []; // Vaciar el array
                            $('#grd_Insumos_Modal tbody tr').removeClass('selected');
                            $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
                        } else {
                            // Reemplazamos la selección con la nueva fila
                            filasSeleccionadas = [fila[0]];
                            $('#grd_Insumos_Modal tbody tr').removeClass('selected');
                            $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        }
                    }

                    // Actualizar la última fila seleccionada
                    ultimaFilaSeleccionada = fila[0];
                });


                $('#grd_Insumos_Modal tbody').on('dblclick', 'td', async function () {
                    var cell = gridInsumosModal.cell(this);
                    var originalData = cell.data();
                    if (cell.index() == undefined) {
                        return;
                    }
                    var colIndex = cell.index().column;
                    var rowData = gridInsumosModal.row($(this).closest('tr')).data();

                    if (colIndex != 0 && colIndex != 4 && colIndex != 5 && colIndex != 6 && colIndex != 7 && colIndex != 8) {
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
                    if (colIndex === 4 || colIndex == 6) {
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


                        if (colIndex == 4) {
                            result = await listaColoresFilter();
                        } else if (colIndex == 6) {
                            result = await listaEstadosFilter();
                        }

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });

                        if (colIndex == 4) {
                            select.val(rowData.IdColor);
                        } else if (colIndex == 6) {
                            select.val(rowData.IdEstado);
                        }


                        // Crear los botones de guardar y cancelar
                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            var selectedValue = select.val();
                            var selectedText = select.find('option:selected').text();
                            saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
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

                                if (colIndex === 0) { // Validar solo si es la columna 0
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
                                    saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });


                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    }


                    // Función para guardar los cambios
                    function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                        // Obtener el nombre de la propiedad basado en el dataSrc


                        // Convertir el índice de columna (data index) al índice visible
                        var visibleIndex = gridInsumosModal.column(colIndex).index('visible');

                        // Obtener la celda visible y aplicar la clase blinking
                        var celda = $(trElement).find('td').eq(visibleIndex);

                        // Obtener el valor original de la celda
                        var originalText = gridInsumosModal.cell(trElement, celda).data();

                        // Actualizar el valor de la fila según la columna editada
                        if (colIndex === 4) { // Columna de la provincia
                            rowData.IdColor = newValue;
                            rowData.Color = newText;

                        } else {
                            rowData[gridInsumosModal.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                        }

                        // Actualizar la fila en la tabla con los nuevos datos
                        gridInsumosModal.row(trElement).data(rowData).draw();

                        // Aplicar el parpadeo solo si el texto cambió
                        if (originalText !== newText) {
                            celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                        }


                        // Desactivar el modo de edición
                        isEditing = false;

                        // Remover la clase blinking después de 3 segundos
                        setTimeout(function () {
                            celda.removeClass('blinking');
                        }, 3000);
                    }



                    // Función para cancelar la edición
                    function cancelEdit() {
                        // Restaurar el valor original
                        gridInsumosModal.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });

                // Para asegurarnos de que las filas seleccionadas se mantengan consistentes con los eventos de Ctrl y Shift
                $('#grd_Insumos_Modal tbody').on('click', 'tr', function (event) {
                    var fila = $(this);
                    // Si se hace clic sin Shift ni Ctrl, actualizar la última fila seleccionada.
                    if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
                        ultimaFilaSeleccionada = fila[0];
                    }
                });

                // Cambiar el cursor cuando el mouse esté sobre la tabla
                $('body').on('mouseenter', '#grd_Insumos_Modal', function () {
                    $(this).css('cursor', 'pointer');
                });
            },
        });
    } else {
        if (data != null) {
            gridInsumosModal.clear().rows.add(data.$values).draw();
        }

        setTimeout(function () {
            gridInsumosModal.columns.adjust();
        }, 250);
    }
}


$('#ProductoModalCantidad').on('keyup', function () {
    // Obtener el valor de la cantidad
    var cantidad = $(this).val();

    // Verificar si hay filas en gridInsumosModal
    var filasEnGrid = gridInsumosModal.rows().data().length;

    // Si no hay filas en el grid, no hacer nada
    if (filasEnGrid === 0) {
        return; // Detener la ejecución si no hay filas
    }

    // Verificar si hay filas seleccionadas
    if (filasSeleccionadas.length > 0) {
        // Si hay filas seleccionadas, actualizar solo esas
        filasSeleccionadas.forEach(function (fila) {
            var tr = $(fila); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            if (cantidad == '') {
                cantidad = 1;
            }

            // Actualizar el objeto rowData
            rowData.Cantidad = parseInt(cantidad);  // Actualizar la cantidad en rowData

            calcularIVAyGanancia();

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    } else {
        // Si no hay filas seleccionadas, actualizar todas las filas
        $('#grd_Insumos_Modal tbody tr').each(function () {
            var tr = $(this); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            if (cantidad == '') {
                cantidad = 1;
            }
            // Actualizar el objeto rowData
            rowData.Cantidad = parseInt(cantidad);  // Actualizar la cantidad en rowData

            calcularIVAyGanancia();

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    }
});



$('#Colores').on('change', function () {
    // Obtener el color seleccionado

    // Verificar si hay filas en gridInsumosModal
    var filasEnGrid = gridInsumosModal.rows().data().length;

    // Si no hay filas en el grid, no hacer nada
    if (filasEnGrid === 0) {
        return; // Detener la ejecución si no hay filas
    }

    var idColorSeleccionado = $(this).val(); // El valor es el ID del color
    var colorSeleccionadoTexto = $('#Colores option:selected').text(); // El texto es el nombre del color

    // Verificar si hay filas seleccionadas
    if (filasSeleccionadas.length > 0) {
        // Si hay filas seleccionadas, actualizar solo esas
        filasSeleccionadas.forEach(function (fila) {
            var tr = $(fila); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Actualizar el objeto rowData
            rowData.Color = colorSeleccionadoTexto;  // Actualiza el color en rowData
            rowData.IdColor = idColorSeleccionado;  // Actualiza el ID del color

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    } else {
        // Si no hay filas seleccionadas, actualizar todas las filas
        $('#grd_Insumos_Modal tbody tr').each(function () {
            var tr = $(this); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Actualizar el objeto rowData
            rowData.Color = colorSeleccionadoTexto;  // Actualiza el color en rowData
            rowData.IdColor = idColorSeleccionado;  // Actualiza el ID del color

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    }
});



$('#btnEliminarInsumo').on('click', function () {
    // Verificar si hay filas seleccionadas
    if (filasSeleccionadas.length === 0) {
        alert("No tienes ninguna fila seleccionada.");
        return;
    }

    // Verificar cuántas filas están en la tabla
    var cantidadFilasTotales = gridInsumosModal.data().length;
    var cantidadFilasSeleccionadas = filasSeleccionadas.length;

    // Verificar si al eliminar las filas seleccionadas se quedaría con menos de una fila
    if (cantidadFilasTotales - cantidadFilasSeleccionadas < 1) {
        alert("No puedes eliminar todas las filas. Debe quedar al menos un insumo.");
        return;
    }

    // Confirmar eliminación
    var confirmacion = confirm("¿Deseas eliminar " + cantidadFilasSeleccionadas + " registro(s)?");

    if (confirmacion) {
        // Eliminar las filas seleccionadas
        filasSeleccionadas.forEach(function (fila) {
            var tr = $(fila); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Eliminar la fila de la tabla
            gridInsumosModal.row(tr).remove().draw();
        });

        // Limpiar el array de filas seleccionadas
        filasSeleccionadas = [];
    }
});

async function configurarDataTableProductos(data) {
    if (gridProductos == null) {
        gridProductos = $('#grd_Productos').DataTable({
            data: data != null ? data.$values : data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'IdProducto', visible: false },
                { data: 'Nombre' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'CostoUnitario' },
                { data: 'Cantidad' },
                { data: 'PorcGanancia' },
                { data: 'Ganancia' },
                { data: 'PorcIva' },
                { data: 'IVA' },
                { data: 'SubTotal' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(${row.IdProducto})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${row.IdProducto})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [4, 7,9,10] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();


                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                setTimeout(function () {
                    gridProductos.columns.adjust();
                }, 200);

                $('body').on('mouseenter', '#grd_Pedidos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}



async function guardarProducto() {
    const IdProducto = document.getElementById('ProductoModalId').value;
    const NombreProducto = document.getElementById('ProductoModalNombre').value;
    const IdCategoria = document.getElementById('ProductoModalIdCategoria').value;
    const Categoria = document.getElementById('ProductoModalCategoria').value;
    const CostoUnitario = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalCostoUnitario').value));
    const PorcGanancia = document.getElementById('ProductoModalPorcGanancia').value;
    const Ganancia = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalGanancia').value));
    const PorcIva = document.getElementById('ProductoModalPorcIva').value;
    const TotalIva = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalIva').value));
    const PrecioVenta = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalPrecioVenta').value));
    const Cantidad = document.getElementById('ProductoModalCantidad').value;
    const IdColor = document.getElementById('Colores');
    const Color = IdColor != null ? IdColor.options[IdColor.selectedIndex].text : "";

    if (NombreProducto == "") {
        errorModal("Debes seleccionar un producto");
        return false;
    }

    if (filaSeleccionadaProductos == null) {
        errorModal("Debes seleccionar un producto");
        return false;
    }

    // Verificar si la cantidad está vacía o no es un número
    if (Cantidad === "" || isNaN(Cantidad) || Cantidad <= 0) {
        errorModal("Escriba una cantidad valida.")
        return false; // Detiene la ejecución
    }
    

    let i = 0;

    const modal = $('#ProductoModal');
    const isEditing = modal.attr('data-editing') === 'true';
    const editId = modal.attr('data-id');

    // Verificar si el producto ya existe en la tabla
    let productoExistente = false;

        if (!productoExistente) {
            // Si no existe, agregar un nuevo producto
            gridProductos.row.add({

                IdProducto: IdProducto,
                Nombre: NombreProducto,
                IdCategoria: IdCategoria,
                Categoria: Categoria,
                CostoUnitario: CostoUnitario,
                PorcGanancia: PorcGanancia,
                Ganancia: Ganancia,
                PorcIva: PorcIva,
                IVA: TotalIva,
                SubTotal: PrecioVenta,
                Cantidad: Cantidad,
                IdColor: IdColor,
                Color: Color
            }).draw();
        }
    
    limpiarInformacionProducto();
    // Eliminar el producto agregado de gridProductosModal
    gridProductosModal.rows().every(function () {
        gridProductosModal.row(this).remove().draw();
    });

}

async function cargarDatosProductoModal() {

    await limpiarInformacionProducto();
    await listaCategorias();
    await listaColores();

    const datosProducto = await ObtenerDatosProductoModal();

    // Obtener los IdProducto de los productos ya existentes en gridProductos
    var productosExistentes = gridProductos.rows().data().toArray(); // Obtener los datos actuales en gridProductos
    var idsExistentes = productosExistentes.map(function (producto) {
        return parseInt(producto.IdProducto); // Crear un array de Ids de productos existentes en gridProductos
    });

    // Filtrar los productos que ya están en gridProductos
    var productosFiltrados = datosProducto.filter(function (producto) {
        return !idsExistentes.includes(parseInt(producto.Id)); // Excluir productos con IdProducto ya existente
    });

   
    

    // Ahora se cargan los datos filtrados (productos que no están en gridProductos)
    configurarDataTableProductosModal(productosFiltrados);
}


async function ObtenerDatosProductoModal() {


    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}


async function ObtenerInsumosProducto(id) {
    const url = `/Productos/EditarInfo?Id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}


async function limpiarInformacionProducto() {

    filasSeleccionadas = [];
    filaSeleccionadaProductos = null;

    if (gridInsumosModal != null) {
        gridInsumosModal.clear().draw();  // Limpia la tabla
    }

    document.getElementById("ProductoModalNombre").value = "";
    document.getElementById("ProductoModalCantidad").value = "";
    document.getElementById("ProductoModalCategoria").value = "";
    document.getElementById("ProductoModalCostoUnitario").value = "";
    document.getElementById("ProductoModalPorcIva").value = "";
    document.getElementById("ProductoModalPorcGanancia").value = "";
    document.getElementById("ProductoModalIva").value = "";
    document.getElementById("ProductoModalGanancia").value = "";
    document.getElementById("ProductoModalPrecioVenta").value = "";
}

async function cargarInformacionProducto(id) {
    const insumosProducto = await ObtenerInsumosProducto(id);
    configurarDataTableInsumosModal(insumosProducto.Insumos);

    let totalInsumos = 0;

    insumosProducto.Insumos.$values.forEach(function (insumo) {
        totalInsumos += insumo.SubTotal;
    });

    var Producto = insumosProducto.Producto;


    var totalGanancia = totalInsumos * (Producto.PorcGanancia / 100);


    var totalConGanancia = totalInsumos + totalGanancia;
    var totalIva = totalConGanancia * (Producto.PorcIva / 100);



    document.getElementById("ProductoModalId").value = Producto.Id;
    document.getElementById("ProductoModalNombre").value = Producto.Nombre;
    document.getElementById("ProductoModalIdCategoria").value = Producto.IdCategoria;
    document.getElementById("ProductoModalCategoria").value = Producto.Categoria;
    document.getElementById("ProductoModalCostoUnitario").value = formatNumber(totalInsumos);
    document.getElementById("ProductoModalPorcIva").value = Producto.PorcIva;
    document.getElementById("ProductoModalPorcGanancia").value = Producto.PorcGanancia;
    document.getElementById("ProductoModalIva").value = formatNumber(totalIva);
    document.getElementById("ProductoModalGanancia").value = formatNumber(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatNumber(Producto.CostoUnitario);

}

document.getElementById("ProductoModalPorcIva").addEventListener("input", calcularIVAyGanancia);
document.getElementById("ProductoModalPorcGanancia").addEventListener("input", calcularIVAyGanancia);

function calcularIVAyGanancia() {
    // Obtener valores y asegurarse de que sean números
    const totalInsumos = parseFloat(convertirMonedaAFloat(document.getElementById("ProductoModalCostoUnitario").value));
    const porcIVA = parseFloat(document.getElementById("ProductoModalPorcIva").value) || 0;
    const porcGanancia = parseFloat(document.getElementById("ProductoModalPorcGanancia").value) || 0;
    const cantidad = parseFloat(document.getElementById("ProductoModalCantidad").value) || 1;

    // Calcular la ganancia por producto
    const gananciaUnitario = totalInsumos * (porcGanancia / 100);

    // Calcular el total de ganancia para la cantidad
    const totalGanancia = gananciaUnitario * cantidad;

    // Calcular el precio con ganancia por unidad
    const totalConGananciaUnitario = totalInsumos + gananciaUnitario;

    // Calcular el IVA por unidad
    const totalIVAUnitario = totalConGananciaUnitario * (porcIVA / 100);

    // Calcular el total de IVA para la cantidad
    const totalIVA = totalIVAUnitario * cantidad;

    // Calcular costo total para la cantidad (incluyendo insumos, ganancia e IVA)
    const costoTotal = (totalInsumos + gananciaUnitario + totalIVAUnitario) * cantidad;

    // Mostrar resultados formateados
    document.getElementById("ProductoModalIva").value = formatoMoneda.format(totalIVA);
    document.getElementById("ProductoModalGanancia").value = formatoMoneda.format(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatoMoneda.format(costoTotal);
}



async function anadirProducto() {
    await cargarDatosProductoModal();
    await configurarDataTableInsumosModal(null);

    if (gridInsumosModal != null) {
        gridInsumosModal.clear().draw();  // Limpia la tabla
    }

    $("#productoModal").modal('show');
    


}


async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    select = document.getElementById("Clientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


function eliminarProducto(id) {
    gridProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data.IdProducto == id) {
            gridProductos.row(rowIdx).remove().draw();
        }
    });

}