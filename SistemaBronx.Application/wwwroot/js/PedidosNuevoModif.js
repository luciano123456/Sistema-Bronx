let gridProductos = null;
let gridInsumos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaInsumos = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaProductos = null; // Variable para almacenar la fila seleccionada
const IdPedido = document.getElementById('IdPedido').value;




$(document).ready(async function () {


    $('#txtNombreClienteModal').on('input', function () {
        validarCamposCliente()
    });

    $('#exitoModal, #ErrorModal, #AdvertenciaModal').on('shown.bs.modal', function () {
        $('.modal').css('z-index', 1057); // Baja el z-index de todos los modales
        $(this).css('z-index', 1058); // Sube el z-index solo del modal actual
    });

    $('#exitoModal, #ErrorModal, #AdvertenciaModal').on('hidden.bs.modal', function () {
        $(this).css('z-index', 1050); // Restaurar el z-index cuando se cierre
    });


    $("#Categorias, #Colores").select2({
        dropdownParent: $("#productoModal"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });



    await listaColores();
    await listaClientes();
    await listaFormasdepago();




    if (parseInt(pedidoData) > 0) {
        await cargarDatosPedido(pedidoData);
    } else {
        document.getElementById("Fecha").value = moment().format('YYYY-MM-DD');
        configurarDataTableProductos(null);
        configurarDataTableInsumos(null);
        calcularDatosPedido();
    }

    $("#Clientes, #Formasdepago").select2({
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

async function cargarDatosPedido(id) {
    $("#tituloPedido").text("Editar Pedido");
    const datosPedido = await ObtenerDatosPedido(id);
    await configurarDataTableProductos(datosPedido.PedidoDetalle);
    await configurarDataTableInsumos(datosPedido.PedidoDetalleProceso);
    await insertarDatosPedido(datosPedido);
    

}


async function insertarDatosPedido(datosPedido) {

    document.getElementById("IdPedido").value = datosPedido.pedido.Id;
    document.getElementById("Clientes").value = parseInt(datosPedido.pedido.IdCliente);
    document.getElementById("Telefono").value = datosPedido.pedido.Telefono;
    document.getElementById("Fecha").value = moment(datosPedido.pedido.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
    document.getElementById("Formasdepago").value = parseInt(datosPedido.pedido.IdFormaPago);
    document.getElementById("ImporteTotal").value = datosPedido.pedido.ImporteTotal;
    document.getElementById("PorcDesc").value = datosPedido.pedido.PorcDescuento;
    document.getElementById("SubTotal").value = datosPedido.pedido.SubTotal;
    document.getElementById("ImporteAbonado").value = datosPedido.pedido.ImporteAbonado;
    document.getElementById("Saldo").value = datosPedido.pedido.Saldo;
    document.getElementById("Comentarios").value = datosPedido.pedido.Comentarios ?? "";
    document.getElementById("Finalizado").checked = datosPedido.pedido.Finalizado === 1;




    document.getElementById("btnNuevoModificar").textContent = "Guardar";


    await calcularDatosPedido();


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

async function configurarDataTableInsumosModal(data, editando) {
    if (gridInsumosModal == null) {
        gridInsumosModal = $('#grd_Insumos_Modal').DataTable({
            data: editando ? data : (data != null ? data.$values : null),
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

                { data: 'Nombre' },
                { data: 'Cantidad' },
                { data: 'CostoUnitario' },
                { data: 'SubTotal' },
                { data: 'IdCategoria', visible: false, name: 'IdCategoria' },
                { data: 'Categoria' },
                { data: 'IdColor', visible: false, name: 'IdColor' },
                { data: 'Color', name: 'Color' },  // Establece el ancho para la columna de Color
                { data: 'IdEstado', visible: false },
                { data: 'Estado', },  // Establece el ancho para la columna de Estado
                { data: 'IdTipo', visible: false },
                { data: 'Tipo', },  // Establece el ancho para la columna de Estado
                { data: 'Especificacion' },
                { data: 'Comentarios' },
                { data: 'IdUnidadMedida', visible: false },
                { data: 'IdProveedor', visible: false },
                { data: 'IdProducto', visible: false },
                { data: 'IdInsumo', visible: false},
                { data: 'Id', visible: false },
            ],

            orderCellsTop: true,
            fixedHeader: true,

            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [2, 3] // Índices de las columnas de números
                },

            ],

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

                    if (colIndex == 0 || colIndex == 2 || colIndex == 3 || colIndex == 5 || colIndex == 11) {
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
                    if (colIndex === 7 || colIndex == 9) {
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


                        if (colIndex == 7) {
                            result = await listaColoresFilter();
                        } else if (colIndex == 9) {
                            result = await listaEstadosFilter();
                        }

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });

                        if (colIndex == 7) {
                            select.val(rowData.IdColor);
                        } else if (colIndex == 9) {
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

                                if (colIndex === 1) { // Validar solo si es la columna 0
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
                        if (colIndex === 7) { // Columna de la provincia
                            rowData.IdColor = newValue;
                            rowData.Color = newText;
                        } else if (colIndex === 9) { // Columna de la provincia
                            rowData.IdEstado = newValue;
                            rowData.Estado = newText;
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
            let dataFinal = editando ? data : data.$values;
            gridInsumosModal.clear().rows.add(dataFinal).draw();
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
            //rowData.SubTotal = parseFloat(rowData.CostoUnitario) * parseInt(cantidad);  // Actualizar la cantidad en rowData

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
            //rowData.SubTotal = parseFloat(rowData.CostoUnitario) * parseInt(cantidad);  // Actualizar la cantidad en rowData

            calcularIVAyGanancia();

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    }
});

$('#Clientes').on('change', async function () {
    var IdCliente = document.getElementById("Clientes").value;
    await cargarDatosCliente(IdCliente);
});

async function cargarDatosCliente(idCliente) {
    const datosCliente = await ObtenerDatosCliente(idCliente);

    document.getElementById("Telefono").value = datosCliente.Telefono;
    }

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
                { data: 'PrecioVenta' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                  <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(${JSON.stringify(row)})' title='Editar'>
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
                    "targets": [4, 7, 9, 10] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();

                configurarOpcionesColumnasProductos();

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                $('body').on('mouseenter', '#grd_Pedidos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}

async function configurarDataTableInsumos(data) {
    if (gridInsumos == null) {
        gridInsumos = $('#grd_Insumos').DataTable({
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
                { data: 'IdDetalle', visible: false },
                { data: 'IdProducto', visible: false },
                { data: 'Producto' },
                { data: 'Cantidad' },
                { data: 'PrecioUnitario' },
                { data: 'SubTotal' },
                { data: 'IdInsumo', visible: false },
                { data: 'Insumo' },
                { data: 'IdTipo', visible: false },
                { data: 'Tipo' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                { data: 'Especificacion' },
                { data: 'Comentarios' },
                { data: 'IdEstado', visible: false },
                { data: 'Estado' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(${row.IdInsumo},${row.IdProducto})' title='Eliminar'>
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
                    "targets": [4, 5] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();


                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                configurarOpcionesColumnasInsumos();

                var ultimaFilaSeleccionada = null;

                $('#grd_Insumos tbody').on('click', 'tr', function (event) {
                    var fila = $(this);

                    // Verificar si se está presionando Ctrl (o Cmd en Mac)
                    var ctrlPresionado = event.ctrlKey || event.metaKey; // Ctrl en Windows/Linux, Cmd en Mac
                    // Verificar si se está presionando Shift
                    var shiftPresionado = event.shiftKey;

                    if (ctrlPresionado) {
                        // Si se presiona Ctrl/Cmd, agregar o quitar la fila de la selección
                        var index = filaSeleccionadaInsumos.indexOf(fila[0]);

                        if (index === -1) {
                            // Si no está seleccionada, agregarla
                            filaSeleccionadaInsumos.push(fila[0]);
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        } else {
                            // Si ya está seleccionada, quitarla
                            filaSeleccionadaInsumos.splice(index, 1);
                            fila.removeClass('selected');
                            $('td', fila).removeClass('selected');
                        }
                    } else if (shiftPresionado && ultimaFilaSeleccionada) {
                        // Si se presiona Shift, seleccionar todas las filas entre la última fila seleccionada y la fila actual
                        var filas = $('#grd_Insumos tbody tr');
                        var indexActual = filas.index(fila);
                        var indexUltima = filas.index(ultimaFilaSeleccionada);

                        // Determinar el rango de filas a seleccionar
                        var inicio = Math.min(indexActual, indexUltima);
                        var fin = Math.max(indexActual, indexUltima);

                        // Seleccionar todas las filas en el rango
                        filas.slice(inicio, fin + 1).each(function () {
                            if (!filaSeleccionadaInsumos.includes(this)) {
                                filaSeleccionadaInsumos.push(this);
                                $(this).addClass('selected');
                                $('td', this).addClass('selected');
                            }
                        });
                    } else {
                        // ✅ Si NO se presiona Ctrl ni Shift, limpiar todo y seleccionar solo la nueva fila
                        if (!fila.hasClass('selected') || filaSeleccionadaInsumos.length == 1) {
                            filaSeleccionadaInsumos = [fila[0]]; // Reiniciar selección
                            $('#grd_Insumos tbody tr').removeClass('selected');
                            $('#grd_Insumos tbody tr td').removeClass('selected');
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        }

                    }

                    // Actualizar la última fila seleccionada
                    ultimaFilaSeleccionada = fila[0];
                });

                $('#grd_Insumos tbody').on('dblclick', 'td', async function () {
                    var cell = gridInsumos.cell(this);
                    var originalData = cell.data();
                    if (cell.index() == undefined) {
                        return;
                    }
                    var colIndex = cell.index().column;
                    var rowData = gridInsumos.row($(this).closest('tr')).data();

                    if (colIndex != 3 && colIndex != 13 && colIndex != 14 && colIndex != 15 && colIndex != 17) {
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
                    if (colIndex === 13 || colIndex == 17) {
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


                        if (colIndex == 13) {
                            result = await listaColoresFilter();
                        } else if (colIndex == 17) {
                            result = await listaEstadosFilter();
                        }

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });

                        if (colIndex == 13) {
                            select.val(rowData.IdColor);
                        } else if (colIndex == 17) {
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

                                if (colIndex === 3) { // Validar solo si es la columna 0
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
                        for (let i = 0; i < filaSeleccionadaInsumos.length; i++) {
                            const rowElement = filaSeleccionadaInsumos[i];

                            // Obtener los datos de la fila usando gridFabricaciones.row()
                            let rowData = gridInsumos.row($(rowElement)).data(); // Aquí obtenemos los datos de la fila seleccionada

                            // Obtener la celda editada de la fila seleccionada
                            const celda = $(rowElement).find('td').eq(colIndex);

                            // Actualizar el valor de la fila según la columna editada
                            if (colIndex === 13) { // Columna de la provincia
                                rowData.IdColor = newValue;
                                rowData.Color = newText;
                            } else if (colIndex === 17) { // Columna de la provincia
                                rowData.IdEstado = newValue;
                                rowData.Estado = newText;
                            } else {
                                rowData[gridInsumos.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                            }

                            // Actualizar la celda específica en la tabla
                            gridInsumos.cell(rowElement, colIndex).data(newText).draw();

                            // Añadir la clase de parpadeo a la celda
                            celda.addClass('blinking');

                            try {
        

                                // Remover el parpadeo después de 3 segundos solo en la celda editada
                                setTimeout(function () {
                                    $(rowElement).find('td').eq(colIndex).removeClass('blinking');
                                }, 3000);

                            } catch (error) {
                                console.error(`Error guardando la fila ${i + 1}:`, error);
                            }
                        }

                        // **Eliminar la clase 'selected' de las filas seleccionadas después de guardar**
                        $(filaSeleccionadaInsumos).each(function (index, rowElement) {
                            $(rowElement).removeClass('selected');
                            $(rowElement).find('td').removeClass('selected');
                        });

                        // Desactivar el modo de edición
                        isEditing = false;

                        // Limpiar las filas seleccionadas después de guardar
                        filaSeleccionadaInsumos = [];
                    }

                    //// Función para guardar los cambios con el parpadeo en las filas
                    //async function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                    //    // Obtener el nombre de la propiedad basado en el dataSrc
                    //    var visibleIndex = gridInsumos.column(colIndex).index('visible');

                    //    // Obtener la celda visible y aplicar la clase blinking
                    //    var celda = $(trElement).find('td').eq(visibleIndex);

                    //    // Obtener el valor original de la celda
                    //    var originalText = gridInsumos.cell(trElement, visibleIndex).data();

                    //    // Actualizar el valor de la fila según la columna editada
                    //    if (colIndex === 13) { // Columna de la provincia
                    //        rowData.IdColor = newValue;
                    //        rowData.Color = newText;
                    //    } else if (colIndex === 17) { // Columna de la provincia
                    //        rowData.IdEstado = newValue;
                    //        rowData.Estado = newText;
                    //    } else {
                    //        rowData[gridInsumos.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                    //    }

                    //    // Actualizar la fila en la tabla con los nuevos datos
                    //    gridInsumos.row(trElement).data(rowData).draw();

                    //    // Aplicar el parpadeo solo si el texto cambió
                    //    if (originalText !== newText) {
                    //        celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                    //    }

                    //    try {
 

                    //        // Remover el parpadeo después de 3 segundos solo en la celda editada
                    //        setTimeout(function () {
                    //            celda.removeClass('blinking');
                    //        }, 3000);

                    //    } catch (error) {
                    //        console.error("Error guardando la fila:", error);
                    //    }

                    //    // Desactivar el modo de edición
                    //    isEditing = false;
                    //}




                    // Función para cancelar la edición
                    function cancelEdit() {
                        // Restaurar el valor original
                        gridInsumos.cell(cell.index()).data(originalData).draw();
                        isEditing = false;
                    }
                });

            },
        });

    } else {
        gridInsumos.clear().rows.add(data).draw();
    }
}

async function guardarProducto() {
    const IdProducto = document.getElementById('ProductoModalId').value;
    const IdProductoEditando = document.getElementById('ProductoEditandoModalId').value;
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


    const editando = IdProductoEditando != "" ? true : false;

    if (!editando) {
        if (NombreProducto == "") {
            errorModal("Debes seleccionar un producto");
            return false;
        }

        if (filaSeleccionadaProductos == null) {
            errorModal("Debes seleccionar un producto");
            return false;
        }
    }

    // Verificar si la cantidad está vacía o no es un número
    if (Cantidad === "" || isNaN(Cantidad) || Cantidad <= 0) {

        errorModal("Escriba una cantidad valida.")
        return false; // Detiene la ejecución
    }

    // Verificar si alguno de los insumos no tiene color
    let colorValido = true;
    gridInsumosModal.rows().every(function () {
        let insumoData = this.data();
        if (!insumoData.IdColor || insumoData.IdColor == 0) {
            colorValido = false; // Si algún insumo no tiene color, flag se pone a false
        }
    });

    if (!colorValido) {
        errorModal("Uno de los insumos no tiene color.");
        return false;
    }

    let i = 0;

    const modal = $('#productoModal');
    const isEditing = modal.attr('data-editing') === 'true';
    const editId = modal.attr('data-id');

    // Verificar si el producto ya existe en la tabla
    let productoExistente = false;

    if (editando) {
        // Si estamos editando, solo actualizamos la fila correspondiente
        gridProductos.rows().every(function () {
            const data = this.data();
            if (parseInt(data.IdProducto) == parseInt(IdProductoEditando)) {
                data.Nombre = NombreProducto,
                data.IdCategoria = IdCategoria,
                data.Categoria = Categoria,
                data.CostoUnitario = CostoUnitario,
                data.PorcGanancia = PorcGanancia,
                data.Ganancia = Ganancia,
                data.PorcIva = PorcIva,
                data.IVA = TotalIva,
                data.PrecioVenta = PrecioVenta,
                data.Cantidad = Cantidad,
                data.IdColor = IdColor.value,
                data.Color = Color

                this.data(data).draw();

                // Actualizar insumos relacionados con este producto en gridInsumos
                gridInsumosModal.rows().every(function () {
                    let insumoData = this.data();

                    // Buscar la fila correspondiente en gridInsumos para actualizarla
                    gridInsumos.rows().every(function () {
                        let insumoDataInsumos = this.data();
                        if (insumoDataInsumos.IdProducto == parseInt(IdProductoEditando) && insumoDataInsumos.IdInsumo == insumoData.IdInsumo) {
                            // Si el IdInsumo coincide, actualizamos la fila existente
                            insumoDataInsumos.Cantidad = insumoData.Cantidad;
                            insumoDataInsumos.Comentarios = insumoData.Comentarios;
                            insumoDataInsumos.Especificacion = insumoData.Especificacion;
                            insumoDataInsumos.IdEstado = insumoData.IdEstado;
                            insumoDataInsumos.Estado = insumoData.Estado;
                            insumoDataInsumos.Color = insumoData.Color;
                            insumoDataInsumos.IdColor = insumoData.IdColor;
                            // Actualiza otros campos si es necesario

                            // Actualizamos la fila en gridInsumos
                            this.data(insumoDataInsumos).draw();
                        }
                    });
                });

            }
        });
    } else if (!productoExistente) {
        // Si no existe, agregar un nuevo producto
        gridProductos.row.add({
            Id: 0,
            IdProducto: IdProducto,
            Nombre: NombreProducto,
            IdCategoria: IdCategoria,
            Categoria: Categoria,
            CostoUnitario: CostoUnitario,
            PorcGanancia: PorcGanancia,
            Ganancia: Ganancia,
            PorcIva: PorcIva,
            IVA: TotalIva,
            PrecioVenta: PrecioVenta,
            Cantidad: Cantidad,
            IdColor: IdColor.value,
            Color: Color
        }).draw();

        gridInsumosModal.rows().every(function () {
            let insumoData = this.data();
            // Agregar la fila a la tabla de insumos principal
            gridInsumos.row.add({
                // Mapea las propiedades según tu estructura
                IdDetalle: 0,
                Id: 0,
                IdProducto: IdProducto,
                Producto: NombreProducto,
                Cantidad: insumoData.Cantidad,
                IdInsumo: insumoData.IdInsumo,
                Insumo: insumoData.Nombre,
                IdTipo: insumoData.IdTipo,
                Tipo: insumoData.Tipo,
                IdCategoria: insumoData.IdCategoria,
                Categoria: insumoData.Categoria,
                IdColor: insumoData.IdColor,
                Color: insumoData.Color,
                Especificacion: insumoData.Especificacion,
                PrecioUnitario: insumoData.CostoUnitario,
                SubTotal: insumoData.SubTotal,
                Comentarios: insumoData.Comentarios,
                IdEstado: insumoData.IdEstado,
                Estado: insumoData.Estado,
                IdProveedor: insumoData.IdProveedor,
                IdUnidadMedida: insumoData.IdUnidadMedida
                // Otros campos necesarios
            }).draw();
        });
    }

    limpiarInformacionProducto();
    // Eliminar el producto agregado de gridProductosModal
    if (!editando) {
        gridProductosModal.rows().every(function () {
            gridProductosModal.row(this).remove().draw();
        });
    } else {
        $('#productoModal').modal('hide');

    }

    calcularDatosPedido();

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


async function ObtenerDatosCliente(id) {
    const url = `/Clientes/EditarInfo?Id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
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
    configurarDataTableInsumosModal(insumosProducto.Insumos, false);

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


let productoSeleccionado = null;

async function editarProducto(producto) {
    const rowData = producto;  // Obtener los datos de la fila basada en `IdProducto`
    await listaCategorias();
    await listaColores();

    if (rowData) {
        var insumosData = gridInsumos.rows().data().toArray().filter(row => row.IdProducto === producto.IdProducto);

        var transformedData = insumosData.map(function (row) {
            return {
                Nombre: row.Producto,          // Suponiendo que 'Producto' es el nombre
                Cantidad: row.Cantidad,
                CostoUnitario: row.PrecioUnitario,
                SubTotal: row.SubTotal,
                IdCategoria: row.IdCategoria,
                Categoria: row.Categoria,
                IdColor: row.IdColor,
                Color: row.Color,
                IdEstado: row.IdEstado,
                Estado: row.Estado,
                IdTipo: row.IdTipo,
                Tipo: row.Tipo,
                Especificacion: row.Especificacion,
                Comentarios: row.Comentarios,
                IdUnidadMedida: row.IdUnidadMedida,
                IdProveedor: row.IdProveedor,
                Id: row.Id,
                IdProducto: row.IdProducto,
                IdInsumo: row.IdInsumo
            };
        });


        $('#productoModal #listaProductos').hide(); // Ocultar toda la fila
        $("#columnaProductoSeleccionado").removeClass("col-md-6");
        $("#columnaProductoSeleccionado").addClass("col-md-12");


        $('#ProductoEditandoModalId').val(rowData.IdProducto);
        $('#ProductoModalNombre').val(rowData.Nombre);
        $('#ProductoModalIdCategoria').val(rowData.IdCategoria);
        $('#ProductoModalCategoria').val(rowData.Categoria);
        $('#ProductoModalCostoUnitario').val(formatNumber(rowData.CostoUnitario));
        $('#ProductoModalPorcGanancia').val(rowData.PorcGanancia);
        $('#ProductoModalGanancia').val(formatNumber(rowData.Ganancia));
        $('#ProductoModalPorcIva').val(rowData.PorcIva);
        $('#ProductoModalIva').val(formatNumber(rowData.IVA));
        $('#ProductoModalPrecioVenta').val(formatNumber(rowData.PrecioVenta));
        $('#ProductoModalCantidad').val(rowData.Cantidad);

        $('#Colores').val(parseInt(rowData.IdColor));

        $("#Colores").select2({
            dropdownParent: $("#productoModal"),
            width: "100%",
            placeholder: "Selecciona una opción",
            allowClear: false
        });

        // Mostrar el modal
        $("#productoModal").modal('show');

        $("#productoModal .modal-title").text("Editar Producto");
       
        $("#btnGuardarProducto").text("✔ Guardar");


        $('#productoModal .modal-dialog').css({
            'max-width': '100%',
            'width': '50%',

        });





        // Configurar insumos si es necesario
        await configurarDataTableInsumosModal(transformedData, true);


    }
}


async function anadirProducto() {
    $('#productoModal #listaProductos').show(); // Ocultar toda la fila
    $("#columnaProductoSeleccionado").removeClass("col-md-12");
    $("#columnaProductoSeleccionado").addClass("col-md-6");

    $("#productoModal .modal-title").text("Añadir Producto");
    $("#btnGuardarProducto").text("✔ Añadir");

    // Cambiar el ancho del modal desde JavaScript
    $('#productoModal .modal-dialog').css({
        'max-width': '100%', // O ajusta el porcentaje según necesites
        'width': '70%' // Ajusta el valor del ancho
    });

    document.getElementById('ProductoEditandoModalId').value = ""



    await cargarDatosProductoModal();
    await configurarDataTableInsumosModal(null, false);

   

    if (gridInsumosModal != null) {
        gridInsumosModal.clear().draw();  // Limpia la tabla
    }

    $("#productoModal").modal('show');





}

async function listaFormasdepago() {
    const url = `/Formasdepago/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Formasdepago option').remove();

    select = document.getElementById("Formasdepago");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    select = document.getElementById("Clientes");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

function eliminarProducto(id) {
    let rowsProductos = gridProductos.rows().indexes().toArray().reverse();
    let rowsInsumos = gridInsumos.rows().indexes().toArray().reverse();

    rowsProductos.forEach(rowIdx => {
        let data = gridProductos.row(rowIdx).data();
        if (data != null && data.IdProducto == id) {
            gridProductos.row(rowIdx).remove();
        }
    });
    gridProductos.draw();

    rowsInsumos.forEach(rowIdx => {
        let data = gridInsumos.row(rowIdx).data();
        if (data != null && data.IdProducto == id) {
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw();

    calcularDatosPedido();
}


function eliminarInsumo(id, idProducto) {

    // Eliminar el insumo y obtener su IdProducto
    gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data != null && data.IdInsumo == id && data.IdProducto == idProducto) {
            idProducto = data.IdProducto; // Guardamos el IdProducto antes de eliminar
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw(); // Redibujar después de eliminar insumo

    // Verificar si quedan insumos para ese producto
    if (idProducto !== null) {
        let tieneInsumos = false;

        gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {
            const data = this.data();
            if (data.IdProducto == idProducto) {
                tieneInsumos = true;
                return false; // Salimos del loop si encontramos al menos un insumo
            }
        });

        // Si el producto ya no tiene insumos, eliminarlo
        if (!tieneInsumos) {
            gridProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
                const data = this.data();
                if (data && data.IdProducto == idProducto) {
                    gridProductos.row(rowIdx).remove();
                }
            });
            gridProductos.draw();
        }
    }
}


$('a[data-bs-toggle="tab"]').on('shown.bs.tab', function () {
    if ($.fn.DataTable.isDataTable('#grd_Productos')) {
        $('#grd_Productos').DataTable().columns.adjust().draw();
    }
    if ($.fn.DataTable.isDataTable('#grd_Insumos')) {
        $('#grd_Insumos').DataTable().columns.adjust().draw();
    }
});

function configurarOpcionesColumnasProductos() {
    const grid = $('#grd_Productos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenuProductos'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Pedidos_Productos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && !col.data.includes("Id")) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data;

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

function configurarOpcionesColumnasInsumos() {
    const grid = $('#grd_Insumos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenuInsumos'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Pedidos_Insumos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && !col.data.includes("Id")) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data;

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

function calcularDatosPedido() {
    let importeTotal = 0;
    let porcDesc = parseFloat(document.getElementById("PorcDesc").value) || 0;
    let importeAbonado = parseFloat(convertirMonedaAFloat(document.getElementById("ImporteAbonado").value)) || 0;
    let descuento = 0;
    let subTotal = 0;
    let saldo = 0;

    // Calcular Importe Total si hay productos en la tabla
    if (gridProductos && gridProductos.rows().count() > 0) {
        gridProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
            const data = this.data();
            if (data && data.PrecioVenta) {
                importeTotal += parseFloat(data.PrecioVenta) || 0;
            }
        });
    }

    // Calcular descuento
    descuento = (importeTotal * porcDesc) / 100;

    // Calcular subtotal
    subTotal = importeTotal - descuento;

    // Calcular saldo
    saldo = subTotal - importeAbonado;

    // Actualizar los valores en los inputs
    document.getElementById("ImporteTotal").value = formatNumber(importeTotal);
    document.getElementById("ImporteAbonado").value = formatNumber(importeAbonado);
    document.getElementById("Descuento").value = formatNumber(descuento);
    document.getElementById("SubTotal").value = formatNumber(subTotal);
    document.getElementById("Saldo").value = formatNumber(saldo);
}


document.getElementById("PorcDesc").addEventListener("blur", calcularDatosPedido);

document.getElementById("ImporteAbonado").addEventListener("blur", function () {
    let rawValue = this.value.trim();

    // Verificamos si ya tiene el formato correcto (p. ej. $12.800,00)
    if (!rawValue.includes('$') && !rawValue.includes(',')) {
        // Si no tiene símbolo de moneda ni coma decimal, formateamos el valor
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(parsedValue);
    } else {
        // Si ya tiene formato, no tocamos el valor
        // Solo nos aseguramos de que sea un número válido para la operación
        rawValue = rawValue.replace(/[^\d,\.]/g, ''); // Eliminar caracteres no numéricos, excepto coma y punto
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(parsedValue);
    }
    calcularDatosPedido(); // Recalcular los datos
});


async function ObtenerDatosPedido(id) {
    const url = `/Pedidos/ObtenerDatosPedido?idPedido=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}



async function guardarCambios() {

    const idPedido = $("#IdPedido").val();

    if (isValidPedido()) {
        await calcularDatosPedido();
        function obtenerProductos() {
            let productos = [];
            gridProductos.rows().every(function () {
                const producto = this.data();
                const productoJson = {
                    "Id": idPedido != "" ? producto.Id : 0,
                    "IdProducto": parseInt(producto.IdProducto),
                    "IdCategoria": parseInt(producto.IdCategoria),
                    "CostoUnitario": parseFloat(producto.CostoUnitario),
                    "Cantidad": parseInt(producto.Cantidad),
                    "PorcGanancia": parseInt(producto.PorcGanancia),
                    "Ganancia": parseFloat(producto.Ganancia),
                    "PorcIva": parseInt(producto.PorcIva),
                    "IVA": parseInt(producto.IVA),
                    "PrecioVenta": parseFloat(producto.PrecioVenta),
                    "IdColor": parseInt(producto.IdColor),
                };
                productos.push(productoJson);
            });
            return productos;
        }

        function obtenerInsumos() {
            let insumos = [];
            gridInsumos.rows().every(function () {
                const insumo = this.data();
                if (!insumo.IdColor || insumo.IdColor === 0) {
                    alert("Uno de los insumos no tiene color asignado.");
                    throw "Error: Insumo sin color"; // Esto detendrá la ejecución del código
                }
                const insumoJson = {
                    "Id": idPedido != "" ? insumo.Id : 0,
                    "IdProducto": parseInt(insumo.IdProducto),
                    "IdInsumo": parseInt(insumo.IdInsumo),
                    "IdCategoria": parseInt(insumo.IdCategoria),
                    "PrecioUnitario": parseFloat(insumo.PrecioUnitario),
                    "Cantidad": parseInt(insumo.Cantidad),
                    "SubTotal": parseFloat(insumo.SubTotal),
                    "IdColor": parseInt(insumo.IdColor),
                    "IdTipo": parseInt(insumo.IdTipo),
                    "IdEstado": parseInt(insumo.IdEstado),
                    "IdProveedor": parseInt(insumo.IdProveedor),
                    "IdUnidadMedida": parseInt(insumo.IdUnidadMedida),
                    "Especificacion": insumo.Especificacion,
                    "Comentarios": insumo.Comentarios,
                };
                insumos.push(insumoJson);
            });
            return insumos;
        }

        const productos = obtenerProductos();
        const insumos = obtenerInsumos();

        // Construcción del objeto para el modelo
        const nuevoModelo = {
            "Id": idPedido !== "" ? parseInt(idPedido) : 0,
            "Fecha": moment($("#Fecha").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
            "IdCliente": parseInt($("#Clientes").val()),
            "IdFormaPago": parseInt($("#Formasdepago").val()),
            "ImporteAbonado": parseFloat(convertirMonedaAFloat($("#ImporteAbonado").val())),
            "ImporteTotal": parseFloat(convertirMonedaAFloat($("#ImporteTotal").val())),
            "SubTotal": parseFloat(convertirMonedaAFloat($("#SubTotal").val())),
            "PorcDescuento": parseFloat($("#PorcDesc").val()),
            "Saldo": parseFloat(convertirMonedaAFloat($("#Saldo").val())),
            "Comentarios": $("#Comentarios").val(),
            "Finalizado": $("#Finalizado").prop('checked') ? 1 : 0,
            "PedidosDetalles": productos,
            "PedidosDetalleProcesos": insumos
        };

        // Definir la URL y el método para el envío
        const url = idPedido === "" ? "/Pedidos/Insertar" : "/Pedidos/Actualizar";
        const method = idPedido === "" ? "POST" : "PUT";

        console.log(JSON.stringify(nuevoModelo))

        // Enviar los datos al servidor
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {

                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                console.log("Respuesta del servidor:", dataJson);
                const mensaje = idPedido === "" ? "Pedido registrado correctamente" : "Pedido modificado correctamente";
                exitoModal(mensaje);
                if (localStorage.getItem("RedireccionFabricaciones") == 1){
                    window.location.href = "../../Fabricaciones";
                    localStorage.removeItem("RedireccionFabricaciones");
                } else {
                    window.location.href = "/Pedidos";
                }

            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}




function isValidPedido() {
    // Assuming grd_productos is a table with an id 'grd_productos'
    var cantidadFilas = $('#grd_Productos').DataTable().rows().count();
    var saldo = parseFloat(convertirMonedaAFloat($("#Saldo").val()));
    const IdPedido = document.getElementById('IdPedido').value;
    const IdCliente = document.getElementById('Clientes').value;

    if (IdCliente == -1) {
        errorModal("Para crear un pedido, debes seleccionar un cliente.");
        return false;
    }

   

    if (cantidadFilas <= 0) {
        if (IdPedido == "") {
            errorModal('No puedes crear un pedido sin productos.')
        } else {
            errorModal('No puedes modificar un pedido sin productos.')
        }
        return false;
    }

    if (saldo < 0) {
        errorModal('No puedes tener un saldo de pago negativo')
        return false;
    }


    return true;
}

function nuevoCliente() {
    limpiarModalCliente();
    listaProvincias();
    $('#modalEdicionCliente').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Cliente");
    $('#lblNombreClienteModal').css('color', 'red');
    $('#txtNombreClienteModal').css('border-color', 'red');
}

function limpiarModalCliente() {
    const campos = ["IdClienteModal", "NombreClienteModal", "TelefonoClienteModal", "DireccionClienteModal", "IdProvinciaClienteModal", "LocalidadClienteModal", "DniClienteModal"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}


async function listaProvincias() {
    const url = `/Clientes/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    $('#ProvinciasClienteModal option').remove();

    selectProvincias = document.getElementById("ProvinciasClienteModal");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

function guardarCambiosCliente() {
    if (validarCamposCliente()) {
        const idCliente = $("#txtIdClienteModal").val();
        const nuevoModelo = {
            "Id": idCliente !== "" ? idCliente : 0,
            "Nombre": $("#txtNombreClienteModal").val(),
            "Telefono": $("#txtTelefonoClienteModal").val(),
            "Direccion": $("#txtDireccionClienteModal").val(),
            "IdProvincia": $("#ProvinciasClienteModal").val(),
            "Localidad": $("#txtLocalidadClienteModal").val(),
            "DNI": $("#txtDniClienteModal").val()
        };

        const url = "/Clientes/Insertar";
        const method = "POST";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = "Cliente registrado correctamente";
                $('#modalEdicionCliente').modal('hide');
                exitoModal(mensaje);
                listaClientes();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function validarCamposCliente() {
    const nombre = $("#txtNombreClienteModal").val();
    const camposValidos = nombre !== "";

    $("#lblNombreClienteModal").css("color", camposValidos ? "" : "red");
    $("#txtNombreClienteModal").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
