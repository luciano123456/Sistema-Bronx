let gridProductos = null;
let gridInsumos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaInsumos = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaProductos = null; // Variable para almacenar la fila seleccionada
let facturaCliente = null;
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
    $("#tituloPedido").text(`Editar Pedido ${id}`);
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

    $('#Colores option').remove(); // Eliminar opciones existentes

    let select = document.getElementById("Colores");

    // Agregar opción "Seleccionar"
    let option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    select.appendChild(option);

    // Agregar opciones de colores
    for (let i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }

    // 🔹 Asegurar que el valor por defecto sea "-1"
    select.value = "-1";
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
            fixedHeader: false,
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
                { data: 'Proveedor' },
                { data: 'Comentarios' },
                { data: 'IdUnidadMedida', visible: false },
                { data: 'IdProveedor', visible: false },
                { data: 'IdProducto', visible: false },
                { data: 'IdInsumo', visible: false },
                { data: 'Id', visible: false },
                { data: 'CantidadInicial', visible: false },
            ],

            orderCellsTop: true,
            fixedHeader: false,

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
                        // ✅ Si NO se presiona Ctrl ni Shift, limpiar todo y seleccionar solo la nueva fila
                        if (!fila.hasClass('selected') || filasSeleccionadas.length == 1) {
                            filasSeleccionadas = [fila[0]]; // Reiniciar selección
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
                            //saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
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
                                    //saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                                    saveEdit(colIndex, input.val(), input.val());
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                            });


                        var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                            if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                                /*saveEdit(colIndex, gridInsumosModal.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));*/
                                saveEdit(colIndex, input.val(), input.val());
                            }
                        });

                        var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                        // Reemplazar el contenido de la celda
                        $(this).empty().append(input).append(saveButton).append(cancelButton);

                        input.focus();
                    }

                    async function saveEdit(colIndex, newText, newValue) {
                        for (let i = 0; i < filasSeleccionadas.length; i++) {
                            const rowElement = filasSeleccionadas[i];
                            let rowData = gridInsumosModal.row($(rowElement)).data();

                            const visibleIndex = gridInsumosModal.column(colIndex).index('visible');
                            const celda = $(rowElement).find('td').eq(visibleIndex);

                            // Actualizar datos según la columna editada
                            if (colIndex === 7) {
                                rowData.IdColor = newValue;
                                rowData.Color = newText;
                            } else if (colIndex === 9) {
                                rowData.IdEstado = newValue;
                                rowData.Estado = newText;
                            } else if (colIndex === 3) {
                                rowData.Cantidad = parseFloat(newValue) || 0;
                            } else {
                                const nombreCol = gridInsumosModal.column(colIndex).header().textContent.trim();
                                rowData[nombreCol] = newText;
                            }

                            // Actualizar la celda en el grid visual
                            gridInsumosModal.cell(rowElement, colIndex).data(newText).draw();

                            // Parpadeo visual en la celda
                            celda.addClass('blinking');
                            setTimeout(() => {
                                celda.removeClass('blinking');
                            }, 3000);
                        }

                        // Limpiar selección visual y lógica
                        $(filasSeleccionadas).each(function (_, rowElement) {
                            $(rowElement).removeClass('selected');
                            $(rowElement).find('td').removeClass('selected');
                        });

                        isEditing = false;
                        filasSeleccionadas = [];
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
           /* rowData.Cantidad = parseInt(cantidad);  // Actualizar la cantidad en rowData*/
            rowData.Cantidad = Math.round(rowData.CantidadInicial * parseInt(cantidad, 10) * 100) / 100;
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

            const idPedido = $("#IdPedido").val();

            rowData.Cantidad = Math.round(rowData.CantidadInicial * parseInt(cantidad, 10) * 100) / 100;


            // Actualizar el objeto rowData
           
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

async function cargarDatosClienteRegistrado(idCliente) {
    const datosCliente = await ObtenerDatosCliente(idCliente);

    document.getElementById("Telefono").value = datosCliente.Telefono;
    $('#Clientes').val(datosCliente.Id).trigger('change');

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
            pageLength: 100,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'IdProducto', visible: false },
                { data: 'Nombre' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'Cantidad' },
                { data: 'PorcGanancia' },
                { data: 'Ganancia' },
                { data: 'PorcIva' },
                { data: 'IVA' },
                { data: 'PrecioVentaUnitario' },
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
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${row.Id})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: false,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [6, 8, 9, 10] // Índices de las columnas de números
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
            pageLength: 100,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'IdDetalle'},
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
                { data: 'Proveedor' },
                {
                    data: 'FechaActualizacion',
                    render: function (data) {
                        if (!data) return '-';
                        return new Date(data).toLocaleString('es-AR'); 
                    }
                },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
  <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(${data})' title='Eliminar'>
      <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
  </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: false,
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

    const detalleId = (Date.now() % 1000000) * 100 + Math.floor(Math.random() * 100);//IDENTIFICADOR UNICO EN BASE AL TIEMPO


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
            if (parseInt(data.Id) == parseInt(IdProductoEditando)) {
                data.Nombre = NombreProducto,
                    data.IdCategoria = IdCategoria,
                    data.Categoria = Categoria,
                    data.CostoUnitario = CostoUnitario,
                    data.PorcGanancia = PorcGanancia,
                    data.PrecioVentaUnitario  = PrecioVenta / Cantidad,
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
                        if (insumoDataInsumos.IdDetalle == parseInt(IdProductoEditando) && insumoDataInsumos.IdInsumo == insumoData.IdInsumo) {
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
            Id: detalleId,
            IdProducto: IdProducto,
            PrecioVentaUnitario: PrecioVenta / Cantidad,
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
                IdDetalle: detalleId,
                Id: (Date.now() % 1000000) * 100 + Math.floor(Math.random() * 100),
                IdProducto: IdProducto,
                Producto: NombreProducto,
                Cantidad: insumoData.Cantidad,
                CantidadInicial: insumoData.CantidadInicial,
                IdInsumo: insumoData.IdInsumo,
                Insumo: insumoData.Nombre,
                PrecioVentaUnitario: insumoData.PrecioVenta / insumoData.Cantidad,
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
                Proveedor: insumoData.Proveedor,
                IdUnidadMedida: insumoData.IdUnidadMedida
                // Otros campos necesarios
            }).draw();
        });
    }

    limpiarInformacionProducto();
    $('#Colores').val('-1').trigger('change');
    // Eliminar el producto agregado de gridProductosModal
    if (!editando) {
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

    // Ahora se cargan los datos filtrados (productos que no están en gridProductos)
    configurarDataTableProductosModal(datosProducto);
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
    $('#grd_Productos_Modal tbody tr').removeClass('selected');
    $('#grd_Productos_Modal tbody tr td').removeClass('selected');

    // Resetear las filas seleccionadas
    filasSeleccionadas = [];
    ultimaFilaSeleccionada = null;

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
    document.getElementById("ProductoModalPrecioVenta").value = formatNumber(Math.ceil(Producto.CostoUnitario / 100) * 100);


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
    document.getElementById("ProductoModalPrecioVenta").value = formatoMoneda.format(Math.ceil(costoTotal / 100) * 100);

}


let productoSeleccionado = null;

async function editarProducto(producto) {
    const rowData = producto;  // Obtener los datos de la fila basada en `IdProducto`
    await listaCategorias();
    await listaColores();

    if (rowData) {
        var insumosData = gridInsumos.rows().data().toArray().filter(row => row.IdDetalle === producto.Id);

        var transformedData = insumosData.map(function (row) {
            return {
                Nombre: row.Producto,          // Suponiendo que 'Producto' es el nombre
                Cantidad: row.Cantidad,
                CantidadInicial: row.CantidadInicial ?? row.Cantidad,
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
                Proveedor: row.Proveedor,
                Id: row.Id,
                IdProducto: row.IdProducto,
                IdInsumo: row.IdInsumo
            };
        });


        $('#productoModal #listaProductos').hide(); // Ocultar toda la fila
        $("#columnaProductoSeleccionado").removeClass("col-md-6");
        $("#columnaProductoSeleccionado").addClass("col-md-12");


        $('#ProductoEditandoModalId').val(rowData.Id);
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
        if (data != null && data.Id == id) {
            gridProductos.row(rowIdx).remove();
        }
    });
    gridProductos.draw();

    rowsInsumos.forEach(rowIdx => {
        let data = gridInsumos.row(rowIdx).data();
        if (data != null && data.IdDetalle == id) {
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw();

    calcularDatosPedido();
}


function eliminarInsumo(Id) {
    var idDetalle = 0;
    // Eliminar el insumo con el Id correspondiente
    gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {


        const data = this.data();
        if (data != null && data.Id == Id) {
            idDetalle = data.IdDetalle;
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw(); // Redibujar después de eliminar insumo

    // Verificar si quedan insumos para ese producto
    let tieneInsumos = false;

    gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data.IdDetalle == idDetalle) {
            tieneInsumos = true;
            return false; // Salimos del loop si encontramos al menos un insumo
        }
    });

    // Si el producto ya no tiene insumos, eliminarlo
    if (!tieneInsumos) {
        gridProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
            const data = this.data();
            if (data && data.Id == idDetalle) {
                gridProductos.row(rowIdx).remove();
            }
        });
        gridProductos.draw();
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
        if (col.data && (!col.data.includes("Id") || col.data == "IdDetalle")) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data == "IdDetalle" ? "Detalle" : col.data;

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


async function guardarCambios(redirecciona = true) {
    const NAV_DEST_KEY = '__NAV_DEST_POST_SAVE__';

    try {
        const idPedido = $("#IdPedido").val();

        if (!isValidPedido()) return false;

        await calcularDatosPedido();

        // --- Helpers de armado ---
        function obtenerProductos() {
            const productos = [];
            gridProductos.rows().every(function () {
                const p = this.data();
                productos.push({
                    "Id": p.Id,
                    "IdProducto": parseInt(p.IdProducto),
                    "IdCategoria": parseInt(p.IdCategoria),
                    "CostoUnitario": parseFloat(p.CostoUnitario),
                    "Cantidad": parseFloat(p.Cantidad),
                    "PorcGanancia": parseFloat(p.PorcGanancia),
                    "Ganancia": parseFloat(p.Ganancia),
                    "PorcIva": parseFloat(p.PorcIva),
                    "IVA": parseFloat(p.IVA),
                    "PrecioVenta": parseFloat(p.PrecioVenta),
                    "IdColor": parseInt(p.IdColor),
                    "Producto": p.Nombre
                });
            });
            return productos;
        }

        function obtenerInsumos() {
            const insumos = [];
            let invalido = false;

            gridInsumos.rows().every(function () {
                const i = this.data();

                if (!i.IdColor || i.IdColor === 0) {
                    invalido = true;
                    // Mostramos mensaje y cortamos luego
                }

                insumos.push({
                    "Id": idPedido !== "" ? i.Id : 0,
                    "IdProducto": parseInt(i.IdProducto),
                    "IdInsumo": parseInt(i.IdInsumo),
                    "IdCategoria": parseInt(i.IdCategoria),
                    "PrecioUnitario": parseFloat(i.PrecioUnitario),
                    "Cantidad": parseFloat(i.Cantidad),
                    "SubTotal": parseFloat(i.SubTotal),
                    "IdColor": parseInt(i.IdColor),
                    "IdTipo": parseInt(i.IdTipo),
                    "IdEstado": parseInt(i.IdEstado),
                    "IdDetalle": parseInt(i.IdDetalle),
                    "IdProveedor": parseInt(i.IdProveedor),
                    "IdUnidadMedida": parseInt(i.IdUnidadMedida),
                    "Especificacion": i.Especificacion,
                    "Comentarios": i.Comentarios
                });
            });

            if (invalido) {
                if (typeof errorModal === 'function') errorModal("Uno de los insumos no tiene color asignado.");
                else alert("Uno de los insumos no tiene color asignado.");
                return null; // señal de error
            }
            return insumos;
        }

        const productos = obtenerProductos();
        const insumos = obtenerInsumos();
        if (!insumos) return false; // hubo insumo sin color → NO seguimos

        // --- Payload ---
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

        // --- Endpoint ---
        const url = idPedido === "" ? "/Pedidos/Insertar" : "/Pedidos/Actualizar";
        const method = idPedido === "" ? "POST" : "PUT";

        // --- Fetch ---
        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(nuevoModelo)
        });

        if (!resp.ok) {
            // Intentamos leer mensaje del servidor; si no, usamos statusText
            let serverMsg = '';
            try { serverMsg = await resp.text(); } catch { }
            const msg = serverMsg?.trim() ? serverMsg : `Error ${resp.status} - ${resp.statusText}`;
            if (typeof errorModal === 'function') errorModal(msg);
            else alert(msg);
            return false;
        }

        const dataJson = await resp.json();
        console.log("Respuesta del servidor:", dataJson);

        // --- Detección flexible de éxito ---
        let ok = true;
        let serverMessage = null;

        if (typeof dataJson === 'object' && dataJson !== null) {
            if ('ok' in dataJson) ok = !!dataJson.ok;
            else if ('success' in dataJson) ok = !!dataJson.success;
            else if ('exito' in dataJson) ok = !!dataJson.exito;
            else if ('valor' in dataJson) ok = Number(dataJson.valor) > 0;
            else if ('error' in dataJson) ok = !dataJson.error;

            serverMessage = dataJson.mensaje || dataJson.message || dataJson.errorMessage || null;
        } else {
            ok = Boolean(dataJson);
        }

        if (!ok) {
            const msg = serverMessage || 'No se pudo guardar el pedido.';
            if (typeof errorModal === 'function') errorModal(msg);
            else alert(msg);
            return false;
        }

        // --- Éxito ---
        const mensajeOk = serverMessage || (idPedido === "" ? "Pedido registrado correctamente" : "Pedido modificado correctamente");
        if (typeof exitoModal === 'function') exitoModal(mensajeOk);

        // a) Si venimos del "Guardar y salir", redirigir EXACTO al destino elegido
        const destinoGuard = sessionStorage.getItem(NAV_DEST_KEY);
        if (destinoGuard) {
            sessionStorage.removeItem(NAV_DEST_KEY);
            setTimeout(() => { window.location.assign(destinoGuard); }, 150);
            return true;
        }

        // b) Si NO venimos del guard y el caller permite redirigir
        if (redirecciona) {
            if (localStorage.getItem("RedireccionFabricaciones") == 1) {
                window.location.href = "../../Fabricaciones";
                localStorage.removeItem("RedireccionFabricaciones");
            } else {
                window.location.href = "/Pedidos";
            }
        }

        return true;

    } catch (error) {
        console.error('Error en guardarCambios:', error);
        const msg = (error && error.message) ? error.message : 'Ocurrió un error al guardar el pedido.';
        if (typeof errorModal === 'function') errorModal(msg);
        else alert(msg);
        return false;
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

async function guardarCambiosCliente() {
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
            .then(async dataJson => {
                if (dataJson.valor > 0) {
                    const mensaje = "Cliente registrado correctamente";
                    $('#modalEdicionCliente').modal('hide');
                    exitoModal(mensaje);
                    await listaClientes();
                    cargarDatosClienteRegistrado(dataJson.valor)
                } else {
                    errorModal("Ha ocurrido un error al registrar el cliente.")
                }
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

function generarDatosPedidoPDF() {

    let cliente = $("#Clientes").select2("data")[0].text
    let formaPago = $("#Formasdepago").select2("data")[0].text
    let idCliente = $("#Clientes").val();

    var cantidadFilasTotales = gridProductos.data().length;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un pedido debes seleccionar un cliente.");
        return;
    }


    // Verificar si al eliminar las filas seleccionadas se quedaría con menos de una fila
    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un remito sin al menos un producto.");
        return;
    }



    var datosPedidoJson =
    {
        IdPedido: document.getElementById("IdPedido").value,
        Cliente: cliente,// Obtener el texto seleccionado de la lista de categorías
        Fecha: document.getElementById("Fecha").value,
        ImporteTotal: document.getElementById("ImporteTotal").value,
        PorcDesc: document.getElementById("PorcDesc").value,
        Descuento: document.getElementById("Descuento").value,
        SubTotal: document.getElementById("SubTotal").value,
        ImporteAbonado: document.getElementById("ImporteAbonado").value,
        Telefono: document.getElementById("Telefono").value,
        Saldo: document.getElementById("Saldo").value,
        FormaPago: formaPago
    };


    var productos = [];
    gridProductos.rows().every(function () {
        let producto = this.data();
        productos.push(producto)
    });


    var datos = {
        Pedido: datosPedidoJson,
        Productos: productos
    }

    factura = generarPedidoPDF(datos);
    facturaCliente = cliente;
    descargarPedidoPDF(datos, factura);
}

async function generarPedidoPDF(datos) {

    // fuerza tamaño/units estándar
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true });

    // 1) normalizar imágenes a dataURL
    const logo1El = document.getElementById('logoImpresion1');
    const logo2El = document.getElementById('logoImpresion2');
    const [logo1, logo2] = await Promise.all([
        imgToDataURL(logo1El, 'image/jpeg'), // JPEG sólido = menos problemas
        imgToDataURL(logo2El, 'image/jpeg')
    ]);

    // 2) insertar
    doc.addImage(logo1, 'JPEG', 14, 8, 50, 20);
    doc.addImage(logo2, 'JPEG', 155, 2, 65, 35);

    // tipografías base de PDF (siempre soportadas)
    doc.setFont('Helvetica', 'normal');

    // Bloque izquierdo
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("SANTA ROSA 3755, VICENTE LÓPEZ,", 14, 37);
    doc.text("BUENOS AIRES, ARGENTINA.", 14, 41);
    doc.text("+541165075229", 14, 45);
    doc.text("HOLA@BRONXCONCEPT.COM.AR", 14, 49);

    // Bloque centro
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NINCHICH SRL", 90, 37);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("CUIT: 30-71743646-2", 90, 41);
    doc.text("IIBB: 30-71743646-2", 90, 45);
    doc.text("Inicio Act: 09/03/2022", 90, 49);

    // Encabezado derecho
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("DOCUMENTO NO VÁLIDO COMO FACTURA", 120, 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PEDIDO", 155, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text("N", 160, 27);
    doc.text(`${datos.Pedido.IdPedido}`, 165, 27);

    // Datos cliente
    doc.setFontSize(8);
    doc.text(`Nombre: ${datos.Pedido.Cliente}`, 150, 37);
    doc.text(`Teléfono: ${datos.Pedido.Telefono}`, 150, 41);
    doc.text(`Fecha: ${moment(datos.Pedido.Fecha, "YYYY-MM-DD").format("DD/MM/YYYY")}`, 150, 45);

    //// Línea horizontal
    //doc.setDrawColor(0);
    //doc.setLineWidth(0.5);
    //doc.line(14, 50, 194, 50);

    const columns = ["C", "Producto", "Color", "Precio", "Subtotal"];
    const rows = datos.Productos.map((item, i) => [
        item.Cantidad,
        item.Nombre,
        item.Color,
        formatNumber(item.PrecioVenta / item.Cantidad),
        formatNumber(item.PrecioVenta)
    ]);

    doc.autoTable({
        startY: 55,
        head: [columns],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 55 },
            2: { cellWidth: 55 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 }
        }
    });

    let y = doc.lastAutoTable.finalY + 10;
    const pageHeight = doc.internal.pageSize.height;
    const boxHeight = 45;
    const marginBottom = 30;

    // Si no entra el bloque de totales + pie, crear nueva página
    if (y + boxHeight + marginBottom > pageHeight) {
        doc.addPage();
        y = 20; // posición inicial en nueva página
    }

    const boxX = 14;
    const boxY = y - 5;
    const boxWidth = 180;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, boxHeight);

    const total = datos.Pedido.ImporteTotal || 0;
    const descuento = datos.Pedido.PorcDesc || 0;
    const totalDescuento = datos.Pedido.Descuento || 0;
    const importeTotal = datos.Pedido.SubTotal || 0;
    const abonado = datos.Pedido.ImporteAbonado || 0;
    const saldo = datos.Pedido.Saldo ?? importeTotal - abonado;

    doc.setFontSize(10);
    const labels = [
        "Importe total con IVA:",
        "Descuento %:",
        "Total descuento:",
        "Importe total:",
        "Importe abonado :",
        "Saldo:"
    ];
    const valores = [
        total,
        `${descuento}%`,
        totalDescuento,
        importeTotal,
        datos.Pedido.ImporteAbonado,
        datos.Pedido.Saldo
    ];

    labels.forEach((label, i) => {
        const yPos = y + i * 7;
        doc.text(label, boxX + 100, yPos);
        doc.text(valores[i], boxX + 145, yPos, { align: "right" });
    });

    // Pie dinámico: debajo del recuadro de totales
    const pieY = boxY + boxHeight + 10;

    doc.setFontSize(9);
    doc.text(`WWW.BRONXCONCEPT.COM.AR`, 15, pieY);
    doc.setFontSize(11);
    doc.text(`BRONXCONCEPT®`, 160, pieY);
    doc.text(`2024`, 186, pieY + 5);
    return doc;
}

async function descargarPedidoPDF(datos) {
    const doc = await generarPedidoPDF(datos);

    let file = "";

    const nro = datos.Pedido.IdPedido ? `Nº ${datos.Pedido.IdPedido} ` : '';

    if (datos.Pedido.FormaPago == "Tarjeta") {
        file = sanitizeFileName(`TJ - Pedido ${nro}Cliente ${datos.Pedido.Cliente} ${fmtMoneda(datos.Pedido.SubTotal)}.pdf`);
    } else {
        file = sanitizeFileName(`Pedido ${nro}Cliente ${datos.Pedido.Cliente} ${fmtMoneda(datos.Pedido.SubTotal)}.pdf`);
    }
   
    
    doc.save(file);
}

function generarDatosRemitoPDF() {

    let cliente = $("#Clientes").select2("data")[0].text
    let idCliente = $("#Clientes").val();
    let formaPago = $("#Formasdepago").select2("data")[0].text

    var cantidadFilasTotales = gridProductos.data().length;


    // Verificar si al eliminar las filas seleccionadas se quedaría con menos de una fila
    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un remito sin al menos un producto.");
        return;
    }

    if (cantidadFilasTotales > 18) {
        errorModal("No puedes exportar el remito: supera el límite de 18 productos.");
        return;
    }

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un remito debes seleccionar un cliente.");
        return;
    }

    var datosPedidoJson =
    {
        IdPedido: document.getElementById("IdPedido").value,
        Cliente: cliente,// Obtener el texto seleccionado de la lista de categorías
        Fecha: document.getElementById("Fecha").value,
        ImporteTotal: document.getElementById("ImporteTotal").value,
        PorcDesc: document.getElementById("PorcDesc").value,
        Descuento: document.getElementById("Descuento").value,
        SubTotal: document.getElementById("SubTotal").value,
        ImporteAbonado: document.getElementById("ImporteAbonado").value,
        Telefono: document.getElementById("Telefono").value,
        Saldo: document.getElementById("Saldo").value,
        FormaPago: formaPago
    };


    var productos = [];
    gridProductos.rows().every(function () {
        let producto = this.data();
        productos.push(producto)
    });


    var datos = {
        Pedido: datosPedidoJson,
        Productos: productos
    }

    factura = generarRemitoPDF(datos);
    facturaCliente = cliente;
    descargarRemitoPDF(datos, factura);
}

function generarRemitoPDF(datos) {

    const doc = new jsPDF();


    // Datos cliente
    doc.setFontSize(8);
    doc.text(`${datos.Pedido.Cliente}`, 150, 37);
    doc.text(`${datos.Pedido.Telefono}`, 150, 41);
    doc.text(`${moment(datos.Pedido.Fecha, "YYYY-MM-DD").format("DD/MM/YYYY")}`, 150, 45);
    doc.setFontSize(13);
    doc.text(`${datos.Pedido.IdPedido}`, 165, 27);
    const columns = ["C", "Producto", "Color", "Precio", "Subtotal"];

    let rows = datos.Productos.map((item) => [
        item.Cantidad,
        item.Nombre,
        item.Color,
        formatNumber(item.PrecioVenta / item.Cantidad),
        formatNumber(item.PrecioVenta)
    ]);

    // Completa hasta 15 filas vacías
    while (rows.length < 18) {
        rows.push(["", "", "", "", ""]);
    }


    doc.autoTable({
        startY: 55,
        body: rows,
        styles: {
            fontSize: 10,
            lineWidth: 0 // elimina líneas de borde generales
        },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            halign: 'center'
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            lineWidth: 0 // elimina bordes de celdas en el cuerpo
        },
        alternateRowStyles: {
            fillColor: false // evita el gris alternado
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 55 },
            2: { cellWidth: 55 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 }
        }
    });


    let y = doc.lastAutoTable.finalY + 10;
    const pageHeight = doc.internal.pageSize.height;
    const boxHeight = 45;
    const marginBottom = 30;

    // Si no entra el bloque de totales + pie, crear nueva página
    if (y + boxHeight + marginBottom > pageHeight) {
        doc.addPage();
        y = 20; // posición inicial en nueva página
    }

    const boxX = 14;
    const boxY = y - 5;
    const boxWidth = 180;

    const total = datos.Pedido.ImporteTotal || 0;
    const descuento = datos.Pedido.PorcDesc || 0;
    const totalDescuento = datos.Pedido.Descuento || 0;
    const importeTotal = datos.Pedido.SubTotal || 0;
    const abonado = datos.Pedido.ImporteAbonado || 0;
    const saldo = datos.Pedido.Saldo ?? importeTotal - abonado;

    doc.setFontSize(10);
    const labels = [
        "Importe total con IVA:",
        "Descuento %:",
        "Total descuento:",
        "Importe total:",
        "Importe abonado :",
        "Saldo:"
    ];
    const valores = [
        total,
        `${descuento}%`,
        totalDescuento,
        importeTotal,
        datos.Pedido.ImporteAbonado,
        datos.Pedido.Saldo
    ];

    labels.forEach((label, i) => {
        const yPos = y + i * 7;
        doc.text(valores[i], boxX + 145, yPos, { align: "right" });
    });

    return doc;
}

function descargarRemitoPDF(datos, facturaPDF) {

    let msjpedido = "";

    if (datos.Pedido.IdPedido == "") {
        msjpedido = ""
    } else {
        msjpedido = `Nº ${datos.Pedido.IdPedido} `
    }


    let titulo = "";

    if (datos.Pedido.FormaPago == "Tarjeta") {
        titulo = `TJ - Remito ${msjpedido}Cliente ${facturaCliente} ${datos.Pedido.SubTotal}`
    } else {
        titulo = `Remito ${msjpedido}Cliente ${facturaCliente} ${datos.Pedido.SubTotal}`
    }


    facturaPDF.save(`${titulo}.pdf`);
}


function obtenerUrlCompleta(rutaRelativa) {
    const path = window.location.origin + rutaRelativa.replace("~", ""); // Construye la URL completa
    return path;
}



// Util: convierte <img> DOM a dataURL (evita problemas de CORS/transparencia)
async function imgToDataURL(imgEl, mime = 'image/png') {
    // si ya es dataURL, úsala
    if (imgEl?.src?.startsWith('data:')) return imgEl.src;

    // re-render a canvas para normalizar (quita alpha problemático)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgEl.src;
    await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // fondo blanco para eliminar alpha
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(mime, 0.92); // 92% para JPEG si lo cambiaras
}

function sanitizeFileName(name) {
    // evita : \ / * ? " < > | y también símbolos conflictivos
    return (name || '')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/[,$%]/g, '-')     // opcional: cambia $, , y % por guión
        .replace(/\s+/g, ' ')       // colapsa espacios
        .trim();
}

function fmtMoneda(v) {
    // asegura string (algunos visores fallan con floats en text())
    return typeof v === 'string' ? v : formatNumber(v ?? 0);
}

