let gridProductos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;


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


    $("#busqueda").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#grd_Productos_Modal tbody tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });



});


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
            scrollX: "200px",
            scrollCollapse: true,
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
                }, 150);


                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_Productos_Modal tbody').on('click', 'tr', async function () {
                    // Remover la clase de la fila anteriormente seleccionada
                    if (filaSeleccionada) {
                        $(filaSeleccionada).removeClass('selected');
                        $('td', filaSeleccionada).removeClass('selected');

                    }

                    var data = gridProductosModal.row(this).data();

                    cargarInformacionProducto(data.Id);




                    // Obtener la fila actual
                    filaSeleccionada = $(this);

                    // Agregar la clase a la fila actual
                    $(filaSeleccionada).addClass('selected');
                    $('td', filaSeleccionada).addClass('selected');

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
            scrollX: "200px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Cantidad' },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'Color', name: 'Color' },
                { data: 'IdColor', visible: false, name: 'IdColor' },
                { data: 'Id', visible: false },
            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [],

            initComplete: async function () {
                var api = this.api();

                setTimeout(function () {
                    gridInsumosModal.columns.adjust();
                }, 150);

                let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas

                // Variable para almacenar la última fila seleccionada
                var ultimaFilaSeleccionada = null;

                // Evento para seleccionar o deseleccionar filas
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
                        filasSeleccionadas = [fila[0]]; // Reemplazamos la selección con la nueva fila
                        $('#grd_Insumos_Modal tbody tr').removeClass('selected');
                        $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
                        fila.addClass('selected');
                        $('td', fila).addClass('selected');
                    }

                    // Actualizar la última fila seleccionada
                    ultimaFilaSeleccionada = fila[0];
                });

                $('#grd_Insumos_Modal tbody').on('dblclick', 'td', async function () {
                    var cell = gridInsumosModal.cell(this);
                    var originalData = cell.data();
                    var colIndex = cell.index().column;
                    var rowData = gridInsumosModal.row($(this).closest('tr')).data();

                    if (colIndex != 0 && colIndex != 3) {
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
                    if (colIndex === 3) {
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


                        result = await listaColoresFilter();

                        result.forEach(function (res) {
                            select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                        });


                        select.val(rowData.IdColor);


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

                        if (colIndex === 5) {
                            var tempDiv = document.createElement('div'); // Crear un div temporal
                            tempDiv.innerHTML = originalText; // Establecer el HTML de la celda
                            originalText = tempDiv.textContent.trim(); // Extraer solo el texto
                            newText = newText.trim();
                        }


                        // Actualizar el valor de la fila según la columna editada
                        if (colIndex === 5) { // Si es la columna de la dirección
                            rowData.Ubicacion = newText;

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
    // Obtener el color seleccionado
    var cantidad = $(this).val(); // El valor es el ID del color


    // Actualizar las celdas correspondientes en la tabla
    $('#grd_Insumos_Modal tbody tr').each(function () {
        var tr = $(this); // Referencia al <tr> actual

        // Obtener las celdas de "IdColor" (columna oculta) y "Color" (columna visible)
        var celdaCantidad = tr.find('td').eq(0); // Columna "IdColor" (índice 3, columna oculta)


        // Establecer el nuevo valor y el nuevo texto en las celdas
        celdaCantidad.text(cantidad); // Poner el ID del color en "IdColor"

    });
});

$('#Colores').on('change', function () {
    // Obtener el color seleccionado
    var idColorSeleccionado = $(this).val(); // El valor es el ID del color
    var colorSeleccionadoTexto = $('#Colores option:selected').text(); // El texto es el nombre del color

    // Actualizar las celdas correspondientes en la tabla
    $('#grd_Insumos_Modal tbody tr').each(function () {
        var tr = $(this); // Referencia al <tr> actual

        // Obtener las celdas de "IdColor" (columna oculta) y "Color" (columna visible)
        var celdaIdColor = tr.find('td').eq(4); // Columna "IdColor" (índice 3, columna oculta)
        var celdaColor = tr.find('td').eq(3); // Columna "Color" (índice 4, columna visible)

        // Establecer el nuevo valor y el nuevo texto en las celdas
        celdaIdColor.text(idColorSeleccionado); // Poner el ID del color en "IdColor"
        celdaColor.text(colorSeleccionadoTexto); // Poner el nombre del color en "Color"
    });
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
                { data: 'Nombre' },
                { data: 'CostoUnitario' },
                { data: 'Cantidad' },
                { data: 'SubTotal' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarInsumo(${row.IdInsumo})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(${row.IdInsumo})' title='Eliminar'>
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
                    "targets": [1, 3] // Índices de las columnas de números
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


async function cargarDatosProductoModal() {
    const datosProducto = await ObtenerDatosProductoModal();
    listaCategorias();
    listaColores();
    configurarDataTableProductosModal(datosProducto);

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



    document.getElementById("ProductoModalNombre").value = Producto.Nombre;
    document.getElementById("ProductoModalCategoria").value = Producto.Categoria;
    document.getElementById("ProductoModalCostoUnitario").value = formatNumber(totalInsumos);
    document.getElementById("ProductoModalPorcIva").value = Producto.PorcIva;
    document.getElementById("ProductoModalPorcGanancia").value = Producto.PorcGanancia;
    document.getElementById("ProductoModalIva").value = formatNumber(totalIva);
    document.getElementById("ProductoModalGanancia").value = formatNumber(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatNumber(Producto.CostoUnitario);






}


async function anadirProducto() {
    await cargarDatosProductoModal();
    await configurarDataTableInsumosModal(null);
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
