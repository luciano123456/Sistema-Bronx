let gridGastos;
let isEditing = false;


const importeTotalInput = document.getElementById('txtImporteTotal');
const importeAbonadoInput = document.getElementById('txtImporteAbonado');
const IvaInput = document.getElementById('txtIva');


const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaCategoriasFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaFormasdepagoFilter },
    { index: 4, filterType: 'text', },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
];

$(document).ready(() => {


    document.getElementById("txtFechaDesde").value = moment().add(-7, 'days').format('YYYY-MM-DD');
    document.getElementById("txtFechaHasta").value = moment().format('YYYY-MM-DD');

    listaGastos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, -1, -1);

    cargarFormasdePagoFiltro();
    cargarCategoriasFiltro();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });


})



async function guardarCambios() {
    if (validarCampos()) {
        await calcularGasto();
        const idGasto = $("#txtId").val();
        const nuevoModelo = {
            "Id": idGasto !== "" ? idGasto : 0,
            "Fecha": $("#txtFecha").val(),
            "Comentarios": $("#txtComentarios").val(),
            "IdCategoria": $("#Categorias").val(),
            "IdFormadePago": $("#FormasdePago").val(),

            "ImporteAbonado": parseFloat(convertirMonedaAFloat($("#txtImporteAbonado").val())) || 0,
            "ImporteTotal": parseFloat(convertirMonedaAFloat($("#txtImporteTotal").val())) || 0,
            "SubTotalNeto": parseFloat(convertirMonedaAFloat($("#txtSubtotalNeto").val())) || 0,
            "Iva": parseFloat($("#txtIva").val()) || 0,
            "Saldo": parseFloat(convertirMonedaAFloat($("#txtSaldo").val())) || 0
        };

        const url = idGasto === "" ? "Gastos/Insertar" : "Gastos/Actualizar";
        const method = idGasto === "" ? "POST" : "PUT";

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
                const mensaje = idGasto === "" ? "Gasto registrado correctamente" : "Gasto modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                aplicarFiltros();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCampos() {
    const nombre = $("#txtNombre").val();
    const camposValidos = nombre !== "";

    $("#lblNombre").css("color", camposValidos ? "" : "red");
    $("#txtNombre").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
async function nuevoGasto() {
    limpiarModal();


    document.getElementById("txtFecha").value = moment().format('YYYY-MM-DD');

    await listaCategoriasModal();
    await listaFormasdepagoModal()

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Gasto");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Fecha", "Comentarios", "ImporteAbonado", "ImporteTotal", "SubtotalNeto", "Iva", "Saldo"];
    campos.forEach(campo => {
        if (campo == "ImporteAbonado" || campo == "ImporteTotal" || campo == "SubtotalNeto" || campo == "Saldo") {
            $(`#txt${campo}`).val(formatNumber(modelo[campo]));
        } else if(campo == "Fecha")
        {
            $(`#txt${campo}`).val(moment(modelo.Fecha, "YYYY-MM-DDTHH:mm:ss").format("YYYY-MM-DD"));
        } else {
            $(`#txt${campo}`).val(modelo[campo]);
        }
    });

await listaCategoriasModal();
await listaFormasdepagoModal();

document.getElementById("FormasdePago").value = modelo.IdFormadePago;
document.getElementById("Categorias").value = modelo.IdCategoria;




$('#modalEdicion').modal('show');
$("#btnGuardar").text("Guardar");
$("#modalEdicionLabel").text("Editar Gasto");

}



function limpiarModal() {
    const campos = ["Id", "Fecha", "Comentarios", "ImporteAbonado", "ImporteTotal", "SubtotalNeto", "Iva", "Saldo"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

}






const editarGasto = id => {
    fetch("Gastos/EditarInfo?id=" + id)
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {
                mostrarModal(dataJson);
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}
async function eliminarGasto(id) {
    let resultado = window.confirm("¿Desea eliminar el Gasto?");

    if (resultado) {
        try {
            const response = await fetch("Gastos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Gasto.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Gasto eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridGastos) {
        $('#grd_Gastos thead tr').clone(true).addClass('filters').appendTo('#grd_Gastos thead');
        gridGastos = $('#grd_Gastos').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%", // Ancho fijo para la columna
                    render: function (data) {
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='editarGasto(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarGasto(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,

                },
                { data: 'Fecha' },
                { data: 'Categoria' },
                { data: 'FormaPago' },
                { data: 'ImporteTotal' },
                { data: 'Iva' },
                { data: 'SubtotalNeto' },
                { data: 'ImporteAbonado' },
                { data: 'Saldo' },
                { data: 'Comentarios' },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Gastos_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Gastos_${moment().format('YYYY-MM-DD')}`,
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
            fixedHeader: true,

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        let formattedNumber = formatNumber(data);
                        let color = data > 0 ? 'red' : 'green'; // Color según si es negativo o positivo
                        return `<span style="color: ${color}; font-weight: bold;">${formattedNumber}</span>`;
                    },
                    "targets": [8] // Índice de la columna 'Saldo'
                },
                {
                    "render": function (data, type, row) {
                        if (data) {
                         
                            return moment(data, "YYYY-MM-DDTHH:mm:ss").add(12, 'hours').format('DD/MM/YYYY');
                        }
                    },
                    "targets": [1]
                },

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [4, 6, 7, 8] // Columna Precio
                }

               

            ],

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
                                    // Filtrar por múltiples valores seleccionados (basado en texto completo)
                                    var regex = selectedValues.join('|'); // Crear una expresión regular para múltiples opciones
                                    await api.column(config.index).search(regex, true, false).draw(); // Realizar búsqueda con regex
                                } else {
                                    await api.column(config.index).search('').draw(); // Limpiar filtro
                                }
                            });

                        // Llamada a la función para obtener los datos para el filtro
                        var data = await config.fetchDataFunc();
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>'); // Usamos Nombre para mostrar
                        });

                        // Inicializar Select2 para el filtro con la opción de multiselect
                        select.select2({
                            placeholder: 'Seleccionar...',
                            width: '100%'
                        });


                    } else if (config.filterType === 'text') {
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
                    gridGastos.columns.adjust();
                }, 20);

                $('body').on('mouseenter', '#grd_Gastos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

                $('body').on('click', '#grd_Gastos .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });

        $('#grd_Gastos tbody').on('dblclick', 'td', async function () {
            var cell = gridGastos.cell(this);
            if(originalData == undefined) return
            var originalData = cell.data();
            var colIndex = cell.index().column;
            var rowData = gridGastos.row($(this).closest('tr')).data();

            if (colIndex == 0 || colIndex == 6 || colIndex == 8) {
                return false;
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
            if (colIndex === 2 || colIndex === 3) {
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

                if (colIndex == 2) {
                    result = await listaCategoriasFilter();
                } else if (colIndex == 3) {
                    result = await listaFormasdepagoFilter();
                }

                result.forEach(function (res) {
                    select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                });

                if (colIndex == 3) {
                    select.val(rowData.IdFormadePago);
                } else if (colIndex == 2) {
                    select.val(rowData.IdCategoria);

                }

                // Crear los botones de guardar y cancelar
                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    var selectedValue = select.val();
                    var selectedText = select.find('option:selected').text();
                    saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Agregar los botones de guardar y cancelar en la celda
                $(this).append(saveButton).append(cancelButton);

                // Enfocar el select
                select.focus();


            } else if (colIndex === 1) { // Cambia el índice según tu columna de fecha
                var fechaOriginal = originalData ? moment(originalData, "YYYY-MM-DDTHH:mm:ss").utc().format("YYYY-MM-DD") : '';

                    var inputFecha = $('<input type="date" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid blue; color: blue; text-align: center;" />')
                        .val(fechaOriginal)
                        .on('input', function () {
                            var saveBtn = $(this).siblings('.fa-check');

                            if ($(this).val().trim() === "") {
                                $(this).css('border-bottom', '2px solid red');
                                saveBtn.css('opacity', '0.5');
                                saveBtn.prop('disabled', true);
                            } else {
                                $(this).css('border-bottom', '2px solid blue');
                                saveBtn.css('opacity', '1');
                                saveBtn.prop('disabled', false);
                            }
                        })
                        .on('keydown', function (e) {
                            if (e.key === 'Enter') {
                                saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), new Date(inputFecha.val()).toISOString().split('T')[0], inputFecha.val(), $(this).closest('tr'));


                            } else if (e.key === 'Escape') {
                                cancelEdit();
                            }
                        });

                    var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                        if (!$(this).prop('disabled')) {
                            saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), new Date(inputFecha.val()).toISOString().split('T')[0], inputFecha.val(), $(this).closest('tr'));


                        }
                    });

                    var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                    $(this).empty().append(inputFecha).append(saveButton).append(cancelButton);

                    inputFecha.focus();
                

            } else if (colIndex === 4 || colIndex === 6) {
                var valueToDisplay = originalData ? originalData.toString().replace(/[^\d.-]/g, '') : '';


                var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .val(formatoMoneda.format(valueToDisplay))
                    .on('input', function () {
                        var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                        if ($(this).val().trim() === "") {
                            $(this).css('border-bottom', '2px solid red'); // Borde rojo
                            saveBtn.css('opacity', '0.5'); // Desactivar botón de guardar visualmente
                            saveBtn.prop('disabled', true); // Desactivar funcionalidad del botón
                        } else {
                            $(this).css('border-bottom', '2px solid green'); // Borde rojo
                            saveBtn.css('opacity', '1'); // Desactivar botón de guardar visualmente
                            saveBtn.prop('disabled', false); // Desactivar funcionalidad del botón
                        }
                    })
                input.on('blur', function () {
                    // Solo limpiar el campo si no se ha presionado "Aceptar"
                    var rawValue = $(this).val().replace(/[^0-9,-]/g, ''); // Limpiar caracteres no numéricos
                    $(this).val(formatoMoneda.format(parseDecimal(rawValue))); // Mantener el valor limpio
                })
                    .on('keydown', function (e) {
                        if (e.key === 'Enter') {
                            saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Reemplazar el contenido de la celda
                $(this).empty().append(input).append(saveButton).append(cancelButton);

                input.focus();
            } else { // Para las demás columnas, como Dirección
                var valueToDisplay = (originalData && originalData.toString().trim() !== "")
                    ? originalData.toString().replace(/<[^>]+>/g, "")
                    : originalData || "";

                // Verificar si el valor es un número y formatearlo a dos decimales
                if (!isNaN(valueToDisplay) && valueToDisplay !== "") {
                    valueToDisplay = parseDecimal(valueToDisplay); // Convertir a decimal con 2 decimales
                }



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
                            saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, gridGastos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Reemplazar el contenido de la celda
                $(this).empty().append(input).append(saveButton).append(cancelButton);

                input.focus();
            }

            // Función para guardar los cambios
            function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                // Obtener el nodo de la celda desde el índice
                // Convertir el índice de columna (data index) al índice visible
                var visibleIndex = gridGastos.column(colIndex).index('visible');

                // Obtener la celda visible y aplicar la clase blinking
                var celda = $(trElement).find('td').eq(visibleIndex);

                // Obtener el valor original de la celda
                var originalText = gridGastos.cell(trElement, celda).data();


                // Verificar si el texto realmente ha cambiado
                if (colIndex === 4 || colIndex === 6) { // Si es la columna PrecioCosto o PrecioVenta
                    // Convertir ambos valores a números flotantes
                    var originalValue = parseFloat(originalText).toFixed(2);
                    var newValueFloat = parseFloat(convertirMonedaAFloat(newText)).toFixed(2);

                    if (originalValue === newValueFloat) {
                        cancelEdit();
                        return; // Si no ha cambiado, no hacer nada
                    }
                } else {
                    // Para otras columnas, la comparación sigue siendo en texto
                    if (originalText.toString() === newText) {
                        cancelEdit();
                        return; // Si no ha cambiado, no hacer nada
                    }
                }



                // Actualizar el valor de la fila según la columna editada
                if (colIndex === 2) { // Si es la columna de la dirección
                    rowData.IdCategoria = newValue;
                    rowData.Categoria = newText;
                } else if (colIndex === 3) { // Si es la columna de forma de pago
                    rowData.IdFormadePago = newValue;
                    rowData.FormaPago = newText;
                } else if (colIndex === 7) { // Si es la columna de importe abonado
                    rowData.ImporteAbonado = parseFloat(convertirMonedaAFloat(newText));
                    rowData.Saldo = rowData.SubtotalNeto - rowData.ImporteAbonado;

                    // Obtener el índice visible para las columnas correspondientes
                    var visibleIndex7 = gridGastos.column(8).index('visible');

                    // Aplicar el efecto de parpadeo a las celdas de PrecioCosto y PrecioVenta
                    $(trElement).find('td').eq(visibleIndex7).addClass('blinking');

                } else if (colIndex === 5) { // Si es la columna de Iva

                    var precioSubtotal = (parseFloat(rowData.ImporteTotal) + (parseFloat(rowData.ImporteTotal) * (parseFloat(newValue) / 100)));
                    precioSubtotal = parseFloat(precioSubtotal.toFixed(2));

                    rowData.SubtotalNeto = precioSubtotal;


                    // Obtener el índice visible para las columnas correspondientes
                    var visibleIndex7 = gridGastos.column(6).index('visible');

                    // Aplicar el efecto de parpadeo a las celdas de PrecioCosto y PrecioVenta
                    $(trElement).find('td').eq(visibleIndex7).addClass('blinking');

                    rowData.Iva = newText;
                } else if (colIndex === 4) { // PrecioCosto
                    rowData.ImporteTotal = parseFloat(convertirMonedaAFloat(newValue)); // Actualizar PrecioCosto

                    var precioSubtotal = (parseFloat(rowData.ImporteTotal) + (parseFloat(rowData.ImporteTotal) * (rowData.Iva / 100)));
                    precioSubtotal = parseFloat(precioSubtotal.toFixed(2));

                    rowData.SubtotalNeto = precioSubtotal;


                    // Obtener el índice visible para las columnas correspondientes
                    var visibleIndex7 = gridGastos.column(6).index('visible');

                    // Aplicar el efecto de parpadeo a las celdas de PrecioCosto y PrecioVenta
                    $(trElement).find('td').eq(visibleIndex7).addClass('blinking');

                } else {
                    rowData[gridGastos.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                }

                // Actualizar la fila en la tabla con los nuevos datos
                gridGastos.row(trElement).data(rowData).draw();

                // Aplicar el parpadeo solo si el texto cambió
                if (originalText !== newText) {
                    celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                }

                // Enviar los datos al servidor
                guardarCambiosFila(rowData);

                // Desactivar el modo de edición
                isEditing = false;

                setTimeout(function () {
                    $(trElement).find('td').removeClass('blinking');
                }, 3000);
            }


            // Función para cancelar la edición
            function cancelEdit() {
                // Restaurar el valor original
                gridGastos.cell(cell.index()).data(originalData).draw();
                isEditing = false;
            }
        });


    } else {
        gridGastos.clear().rows.add(data).draw();
    }
}

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Gastos/Actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (response.ok) {
        } else {
            errorModal('Ha ocurrido un error al guardar los datos...')
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
    const grid = $('#grd_Gastos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Gastos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
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

async function listaGastos(fechaDesde, fechaHasta, categoria, formadepago) {
    const url = `/Gastos/Lista?FechaDesde=${fechaDesde}&FechaHasta=${fechaHasta}&Categoria=${categoria}&FormadePago=${formadepago}`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}




async function listaCategoriasFilter() {
    const url = `/GastosCategorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}



async function listaFormasdepagoFilter() {
    const url = `/FormasdePago/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}



async function listaFormasdepagoModal() {
    const data = await listaFormasdepagoFilter();

    $('#FormasdePago option').remove();

    select = document.getElementById("FormasdePago");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }

}


async function listaCategoriasModal() {
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

async function cargarCategoriasFiltro() {
    const data = await listaCategoriasFilter();

    $('#CategoriasFiltro option').remove();

    select = document.getElementById("CategoriasFiltro");

    option = document.createElement("option");
    option.value = "-1";
    option.text = "Todos";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }

}

async function cargarFormasdePagoFiltro() {
    const data = await listaFormasdepagoFilter();

    $('#FormasdePagoFiltro option').remove();

    select = document.getElementById("FormasdePagoFiltro");

            option = document.createElement("option");
            option.value = "-1";
            option.text = "Todos";
            select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }

}

async function aplicarFiltros() {
    listaGastos(document.getElementById("txtFechaDesde").value, document.getElementById("txtFechaHasta").value, document.getElementById("CategoriasFiltro").value, document.getElementById("FormasdePagoFiltro").value);
}

importeTotalInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

    calcularGasto();

});

importeAbonadoInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

    calcularGasto();

});

IvaInput.addEventListener('blur', function () {
    calcularGasto();

});


function calcularGasto() {
    var ImporteTotal = parseFloat(convertirMonedaAFloat(importeTotalInput.value)) || 0;
    var importeAbonado = parseFloat(convertirMonedaAFloat(importeAbonadoInput.value)) || 0;
    var Iva = parseFloat(IvaInput.value) || 0; // Cambiado a parseFloat para evitar truncamiento
    var SubTotalInput = document.getElementById("txtSubtotalNeto");
    var SaldoInput = document.getElementById("txtSaldo");


    SubTotalInput.value = formatNumber(ImporteTotal + (ImporteTotal * Iva / 100));
    SaldoInput.value = formatNumber(parseFloat(convertirMonedaAFloat(SubTotalInput.value)) - importeAbonado);
}