﻿let gridInsumos;
let grdProveedores;
let isEditing = false;


const precioCostoInput = document.getElementById('txtPrecioCosto');
const precioVentaInput = document.getElementById('txtPrecioVenta');



const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'select', fetchDataFunc: listaTiposFilter }, // Columna con un filtro de selección
    { index: 6, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Columna con un filtro de selección
    { index: 7, filterType: 'select', fetchDataFunc: listaUnidadesDeMedidasFilter }, // Columna con un filtro de selección
    { index: 8, filterType: 'select', fetchDataFunc: listaProveedoresFilter },
    { index: 9, filterType: 'text' },

];


$(document).ready(() => {


    listaInsumos();



    $("#Categorias, #UnidadesDeMedidas, #Tipos, #Proveedores").select2({
        dropdownParent: $("#modalEdicion"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });


    $('#txtDescripcion, #txtPrecioCosto, #txtPorcGanancia, #txtPrecioVenta').on('input', function () {
        validarCampos();
    });



    $('#txtPrecioCosto').on('input', function () {
        validarCampos()
        sumarPorcentaje()

    });
    $('#txtPorcGanancia').on('input', function () {
        sumarPorcentaje()
    });

    $('#txtPrecioVenta').on('input', function () {
        validarCampos()
        calcularPorcentaje()
    });
})



function guardarCambios() {
    if (validarCampos()) {
        const idInsumo = $("#txtId").val();
        const idProveedor = $("#txtIdProveedor").val();
        const nuevoModelo = {
            "Id": (idInsumo && idInsumo !== "") ? idInsumo : 0,
            "Descripcion": $("#txtDescripcion").val(),
            "IdTipo": $("#Tipos").val(),
            "IdUnidadMedida": $("#UnidadesDeMedidas").val(),
            "IdCategoria": $("#Categorias").val(),
            "IdProveedor": $("#Proveedores").val(),
            "Especificacion": $("#txtEspecificacion").val(),
            "PrecioCosto": formatoNumero($("#txtPrecioCosto").val()),
            "PorcGanancia": $("#txtPorcGanancia").val(),
            "PrecioVenta": formatoNumero($("#txtPrecioVenta").val()),

        };

        const url = (idInsumo == null || idInsumo === "") ? "Insumos/Insertar" : "Insumos/Actualizar";
        const method = (idInsumo == null || idInsumo === "") ? "POST" : "PUT";

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
                guardarFiltrosPantalla("#grd_Insumos", 'filtrosInsumos', true);
                const mensaje = (idInsumo == null || idInsumo === "") ? "Insumo registrado correctamente" : "Insumo modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaInsumos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCampos() {
    const descripcion = $("#txtDescripcion").val();
    const precioCosto = $("#txtPrecioCosto").val();
    const precioVenta = $("#txtPrecioCosto").val();
    const porcGanancia = $("#txtPorcGanancia").val();
    const idProveedor = $("#txtIdProveedor").val();

    // Validar descripción
    const descripcionValida = descripcion !== "";
    $("#lblDescripcion").css("color", descripcionValida ? "" : "red");
    $("#txtDescripcion").css("border-color", descripcionValida ? "" : "red");

    // Validar precio costo
    const precioCostoValido = precioCosto !== "";
    $("#lblPrecioCosto").css("color", precioCostoValido ? "" : "red");
    $("#txtPrecioCosto").css("border-color", precioCostoValido ? "" : "red");

    // Validar precio costo
    const precioVentaValido = precioVenta !== "";
    $("#lblPrecioVenta").css("color", precioVentaValido ? "" : "red");
    $("#txtPrecioVenta").css("border-color", precioVentaValido ? "" : "red");

    // Validar porcentaje ganancia
    const porcGananciaValida = porcGanancia !== "";
    $("#lblPorcGanancia").css("color", porcGananciaValida ? "" : "red");
    $("#txtPorcGanancia").css("border-color", porcGananciaValida ? "" : "red");


    // Retorna true solo si todos los campos son válidos
    return descripcionValida && precioCostoValido && porcGananciaValida && precioVentaValido;
}

function nuevoInsumo() {
    limpiarModal();
    listaCategorias();
    listaUnidadesDeMedidas();
    listaProveedores();
    listaTipos();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Insumo");
    $('#lblDescripcion').css('color', 'red');
    $('#txtDescripcion').css('border-color', 'red');
    $('#lblPrecioCosto').css('color', 'red');
    $('#txtPrecioCosto').css('border-color', 'red');
    $('#lblPrecioVenta').css('color', 'red');
    $('#txtPrecioVenta').css('border-color', 'red');
    $('#lblPorcGanancia').css('color', 'red');
    $('#txtPorcGanancia').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Descripcion", "IdTipo", "IdCategoria", "IdUnidadMedida", "IdProveedor", "Especificacion", "PrecioCosto", "PorcGanancia", "PrecioVenta"];
    campos.forEach(campo => {
        if (campo == "PrecioCosto" || campo == "PrecioVenta") {
            $(`#txt${campo}`).val(formatNumber(modelo[campo]));
        } else {
            $(`#txt${campo}`).val(modelo[campo]);
        }
    });

    await listaCategorias();
    await listaProveedores();
    await listaUnidadesDeMedidas();
    await listaTipos();

    document.getElementById("Tipos").value = modelo.IdTipo;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadMedida;
    document.getElementById("Proveedores").value = modelo.IdProveedor;


    $("#Categorias, #UnidadesDeMedidas, #Tipos, #Proveedores").select2({
        dropdownParent: $("#modalEdicion"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: true
    });


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Insumo");

    $('#lblDescripcion').css('color', '');
    $('#txtDescripcion').css('border-color', '');
    $('#lblPrecioCosto').css('color', '');
    $('#txtPrecioCosto').css('border-color', '');
    $('#lblPrecioVenta').css('color', '');
    $('#txtPrecioVenta').css('border-color', '');
    $('#lblPorcGanancia').css('color', '');
    $('#txtPorcGanancia').css('border-color', '');

}


async function mostrarModalDuplicado(modelo) {

    $(`#txtId`).val("");

    const campos = ["Descripcion", "IdTipo", "IdCategoria", "IdUnidadMedida", "IdProveedor", "Especificacion", "PrecioCosto", "PorcGanancia", "PrecioVenta"];
    campos.forEach(campo => {
        if (campo == "PrecioCosto" || campo == "PrecioVenta") {
            $(`#txt${campo}`).val(formatNumber(modelo[campo]));
        } else {
            $(`#txt${campo}`).val(modelo[campo]);
        }
    });

    await listaCategorias();
    await listaProveedores();
    await listaUnidadesDeMedidas();
    await listaTipos();

    document.getElementById("Tipos").value = modelo.IdTipo;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadMedida;
    document.getElementById("Proveedores").value = modelo.IdProveedor;


    $("#Categorias, #UnidadesDeMedidas, #Tipos, #Proveedores").select2({
        dropdownParent: $("#modalEdicion"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: true
    });

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Insumo");

    $('#lblDescripcion').css('color', '');
    $('#txtDescripcion').css('border-color', '');
    $('#lblPrecioCosto').css('color', '');
    $('#txtPrecioCosto').css('border-color', '');
    $('#lblPrecioVenta').css('color', '');
    $('#txtPrecioVenta').css('border-color', '');
    $('#lblPorcGanancia').css('color', '');
    $('#txtPorcGanancia').css('border-color', '');

}


function limpiarModal() {
    const campos = ["Id", "Descripcion", "IdTipo", "IdCategoria", "IdUnidadMedida", "IdProveedor", "Especificacion", "PrecioCosto", "PorcGanancia", "PrecioVenta", "Proveedor"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $('#lblDescripcion').css('color', '');
    $('#txtDescripcion').css('border-color', '');
    $('#lblPrecioCosto').css('color', '');
    $('#txtPrecioCosto').css('border-color', '');
    $('#lblPrecioVenta').css('color', '');
    $('#txtPrecioVenta').css('border-color', '');
    $('#lblPorcGanancia').css('color', '');
    $('#txtPorcGanancia').css('border-color', '');
}



async function listaInsumos() {
    const url = `/Insumos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
    await aplicarFiltrosRestaurados(gridInsumos, "#grd_Insumos", "filtrosInsumos", true)
}

async function listaProveedores() {
    const data = await obtenerProveedores();

    $('#Proveedores option').remove();

    select = document.getElementById("Proveedores");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


async function listaCategorias() {
    const url = `/InsumosCategorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Categorias option').remove();

    select = document.getElementById("Categorias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaUnidadesDeMedidas() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#UnidadesDeMedidas option').remove();

    select = document.getElementById("UnidadesDeMedidas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaTipos() {
    const url = `/InsumosTipos/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Tipos option').remove();

    select = document.getElementById("Tipos");

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

async function listaCategoriasFilter() {
    const url = `/InsumosCategorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}


async function listaUnidadesDeMedidasFilter() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}

async function listaTiposFilter() {
    const url = `/InsumosTipos/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(dto => ({
        Id: dto.Id,
        Nombre: dto.Nombre
    }));

}

const editarInsumo = id => {
    fetch("Insumos/EditarInfo?id=" + id)
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

const duplicarInsumo = id => {
    fetch("Insumos/EditarInfo?id=" + id)
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {
                mostrarModalDuplicado(dataJson);
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}

async function eliminarInsumo(id) {
    let resultado = window.confirm("¿Desea eliminar el Insumo?");

    if (resultado) {
        try {
            const response = await fetch("Insumos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Insumo.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaInsumos();
                exitoModal("Insumo eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridInsumos) {
        $('#grd_Insumos thead tr').clone(true).addClass('filters').appendTo('#grd_Insumos thead');
        gridInsumos = $('#grd_Insumos').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            pageLength: 50,
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarInsumo(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarInsumo(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                         <button class='btn btn-sm btneliminar' type='button' onclick='duplicarInsumo(${data})' title='Duplicar'>
                            <i class='fa fa-clone fa-lg text-warning' aria-hidden='true'></i> Duplicar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,

                },
                { data: 'Descripcion' },
                { data: 'PrecioCosto' },
                { data: 'PorcGanancia' },
                { data: 'PrecioVenta' },
                { data: 'Tipo' },
                { data: 'Categoria' },
                { data: 'UnidaddeMedida' },
                { data: 'Proveedor' },
                { data: 'Especificacion' },
               
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Insumos',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6,7,8,9]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Insumos',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [2, 4] // Columna Precio
                }
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

                configurarOpcionesColumnas();

                setTimeout(function () {
                    gridInsumos.columns.adjust();
                }, 300);
            },
        });

        $('#grd_Insumos tbody').on('dblclick', 'td', async function () {
            var cell = gridInsumos.cell(this);
            var originalData = cell.data();
            var colIndex = cell.index().column;
            var rowData = gridInsumos.row($(this).closest('tr')).data();


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
            if (colIndex === 5 || colIndex === 6 || colIndex ===7 || colIndex === 8) {
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

                if (colIndex == 5) {
                    result = await obtenerTipos();
                } else if (colIndex == 6) {
                    result = await obtenerCategorias();
                } else if (colIndex == 7) {
                    result = await obtenerUnidadesDeMedidas();
                } else if (colIndex == 8) {
                    result = await obtenerProveedores();
                }

                result.forEach(function (res) {
                    select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                });

                if (colIndex == 5) {
                    select.val(rowData.IdTipo);
                } else if (colIndex == 6) {
                    select.val(rowData.IdCategoria);
                } else if (colIndex == 7) {
                    select.val(rowData.IdUnidadMedida);
                } else if (colIndex == 8) {
                    select.val(rowData.IdProveedor);
                }

                // Crear los botones de guardar y cancelar
                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    var selectedValue = select.val();
                    var selectedText = select.find('option:selected').text();
                    saveEdit(colIndex, gridInsumos.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Agregar los botones de guardar y cancelar en la celda
                $(this).append(saveButton).append(cancelButton);

                // Enfocar el select
                select.focus();

            } else if (colIndex === 2 || colIndex === 4) {
                var valueToDisplay = originalData ? originalData.toString().replace(/[^\d.-]/g, '') : '';

                var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .val(formatoMoneda.format(valueToDisplay))
                    .on('input', function () {
                        var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                        if ($(this).val().trim() === "") {
                            $(this).css('border-bottom', '2px solid red'); // Borde rojo
                            saveBtn.css('opacity', '0.5'); // Desactivar botón de guardar visualmente
                            saveBtn.prop('disabled', true); // Desactivar funcionalidad del botón
                        }
                    })
                input.on('blur', function () {
                    // Solo limpiar el campo si no se ha presionado "Aceptar"
                    var rawValue = $(this).val().replace(/[^0-9,-]/g, ''); // Limpiar caracteres no numéricos
                    $(this).val(formatoMoneda.format(parseDecimal(rawValue))); // Mantener el valor limpio
                })
                    .on('keydown', function (e) {
                        if (e.key === 'Enter') {
                            saveEdit(colIndex, gridInsumos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, gridInsumos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
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
                            saveEdit(colIndex, gridInsumos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, gridInsumos.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Reemplazar el contenido de la celda
                $(this).empty().append(input).append(saveButton).append(cancelButton);

                input.focus();
            }

            // Función para guardar los cambios
            async function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                // Convertir el índice de columna (dato) al índice visible
                var visibleIndex = gridInsumos.column(colIndex).index('visible');

                // Obtener el nodo de la celda usando el índice visible
                var celda = $(trElement).find('td').eq(visibleIndex);
                // Obtener el valor original de la celda
                var originalText = gridInsumos.cell(trElement, colIndex).data();

                guardarFiltrosPantalla("#grd_Insumos", 'filtrosInsumos', true);

                if (colIndex === 7) {
                    var tempDiv = document.createElement('div'); // Crear un div temporal
                    tempDiv.innerHTML = originalText; // Establecer el HTML de la celda
                    originalText = tempDiv.textContent.trim(); // Extraer solo el texto
                    newText = newText.trim();
                }

                // Verificar si el texto realmente ha cambiado
                if (colIndex === 2 || colIndex === 4) { // Si es la columna PrecioCosto o PrecioVenta
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

                // Limpiar las clases 'blinking' de todas las celdas de la fila antes de aplicar el parpadeo
                $(trElement).find('td').removeClass('blinking');

                // Actualizar el valor de la fila según la columna editada
                if (colIndex === 5) { // Columna de la provincia
                    rowData.IdTipo = newValue;
                    rowData.Tipo = newText;
                } else if (colIndex === 6) {
                    rowData.IdCategoria = newValue;
                    rowData.Categoria = newText;
                } else if (colIndex === 7) {
                    rowData.IdUnidadMedida = newValue;
                    rowData.UnidaddeMedida = newText;
                } else if (colIndex === 8) {
                    rowData.IdProveedor = newValue;
                    rowData.Proveedor = newText;
                } else if (colIndex === 2) { // PrecioCosto
                    rowData.PrecioCosto = parseFloat(convertirMonedaAFloat(newValue)); // Actualizar PrecioCosto

                    var precioVentaCalculado = (parseFloat(rowData.PrecioCosto) + (parseFloat(rowData.PrecioCosto) * (rowData.PorcGanancia / 100)));
                    precioVentaCalculado = parseFloat(precioVentaCalculado.toFixed(2));

                    rowData.PrecioVenta = precioVentaCalculado;

                    // Actualizar el porcentaje de ganancia basado en el PrecioCosto
                    rowData.PorcGanancia = parseFloat(((rowData.PrecioVenta - rowData.PrecioCosto) / rowData.PrecioCosto) * 100).toFixed(2);

                    // Obtener el índice visible para las columnas correspondientes
                    var visibleIndex7 = gridInsumos.column(2).index('visible');
                    var visibleIndex9 = gridInsumos.column(4).index('visible');

                    // Aplicar el efecto de parpadeo a las celdas de PrecioCosto y PrecioVenta
                    $(trElement).find('td').eq(visibleIndex7).addClass('blinking');
                    $(trElement).find('td').eq(visibleIndex9).addClass('blinking');
                } else if (colIndex === 3) { // PorcentajeGanancia
                    rowData.PorcGanancia = parseDecimal(newValue); // Actualizar PorcentajeGanancia

                    // Calcular PrecioVenta basado en PrecioCosto y PorcentajeGanancia
                    rowData.PrecioVenta = rowData.PrecioCosto + (rowData.PrecioCosto * (rowData.PorcGanancia / 100));

                    // Obtener el índice visible para las columnas correspondientes
                    var visibleIndex8 = gridInsumos.column(3).index('visible');
                    var visibleIndex9 = gridInsumos.column(4).index('visible');

                    // Aplicar el efecto de parpadeo a las celdas de PorcentajeGanancia y PrecioVenta
                    $(trElement).find('td').eq(visibleIndex8).addClass('blinking');
                    $(trElement).find('td').eq(visibleIndex9).addClass('blinking');
                } else if (colIndex === 4) { // PrecioVenta
                    rowData.PrecioVenta = parseFloat(convertirMonedaAFloat(newValue))
                    rowData.PorcGanancia = parseFloat(((convertirMonedaAFloat(newValue) - rowData.PrecioCosto) / rowData.PrecioCosto) * 100).toFixed(2);

                    // Obtener el índice visible para la columna 7 (PrecioCosto) o la correspondiente
                    var visibleIndex8 = gridInsumos.column(8).index('visible');
                    $(trElement).find('td').eq(visibleIndex8).addClass('blinking');
                } else {
                    // Actualizar usando el nombre de la propiedad
                    rowData[gridInsumos.column(colIndex).header().textContent] = newText;
                }


               
                
                // Actualizar la fila en la tabla con los nuevos datos
                gridInsumos.row(trElement).data(rowData).draw();

                // Si el texto cambió, aplicar el parpadeo a la celda editada (usando el índice visible ya obtenido)
                if (originalText !== newText) {
                    celda.addClass('blinking');
                }

                // Enviar los datos actualizados al servidor
                guardarCambiosFila(rowData);

                await aplicarFiltrosRestaurados(gridInsumos, "#grd_Insumos", "filtrosInsumos", true)

                // Desactivar el modo de edición
                isEditing = false;

                // Remover la clase 'blinking' de todas las celdas después de 3 segundos
                setTimeout(function () {
                    $(trElement).find('td').removeClass('blinking');
                }, 3000);
            }





            // Función para cancelar la edición
            async function cancelEdit() {
                // Restaurar el valor original
                gridInsumos.cell(cell.index()).data(originalData).draw();
                await aplicarFiltrosRestaurados(gridInsumos, "#grd_Insumos", "filtrosInsumos", true)
                isEditing = false;
            }
        });
    } else {
        gridInsumos.clear().rows.add(data).draw();
    }
}


async function obtenerTipos() {
    const response = await fetch('/InsumosTipos/Lista');
    const result = await response.json();
    return result;
}

async function obtenerCategorias() {
    const response = await fetch('/InsumosCategorias/Lista');
    const result = await response.json();
    return result;
}

async function obtenerUnidadesDeMedidas() {
    const response = await fetch('/UnidadesDeMedidas/Lista');
    const result = await response.json();
    return result;
}

async function obtenerProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const result = await response.json();
    return result;
}

async function guardarCambiosFila(rowData) {
    try {
        const response = await fetch('/Insumos/Actualizar', {
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



function cargarDatosProveedor(data) {
    $('#txtIdProveedor').val(data.Id);
    $('#txtProveedor').val(data.Nombre);
    validarCampos();
}

async function obtenerProveedores() {
    const response = await fetch('/Proveedores/Lista');
    const data = await response.json();
    return data;
}




async function cargarDataTableProveedores(data) {


    if (grdProveedores) {
        $('#tablaProveedores').DataTable().columns.adjust().draw();
        grdProveedores.destroy();
        grdProveedores = null; // Opcional: Limpiar la variable

    }

    grdProveedores = $('#tablaProveedores').DataTable({
        data: data,
        language: {
            sLengthMenu: "Mostrar _MENU_ registros",
            url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
        },
        scrollX: true,
        autoWidth: false,
        columns: [
            { data: 'Id', width: "20%", visible: false },
            { data: 'Nombre', width: "20%" },
            { data: 'Apodo', width: "20%" },
            { data: 'Ubicacion', width: "20%" },
            { data: 'Telefono', width: "20%" },

        ],
        orderCellsTop: true,
        fixedHeader: false,

        initComplete: async function () {
            setTimeout(function () {
                $('#tablaProveedores').DataTable().columns.adjust().draw();
            }, 200);
        }
    });

}

function sumarPorcentaje() {
    // Obtener valores y convertir a números
    let precioCosto = formatoNumero($("#txtPrecioCosto").val());
    let porcentajeGanancia = parseFloat($("#txtPorcGanancia").val());

    // Validar que los valores no sean NaN
    if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
        // Calcular el precio de venta
        let precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));

        precioVenta = precioVenta.toFixed(2);

        // Formatear el resultado para que se muestre correctamente
        $("#txtPrecioVenta").val(formatMoneda(precioVenta));
    } else {
        // Si los valores son inválidos, limpiar el campo de precio de venta
        $("#txtPrecioVenta").val('');
    }
}




function calcularPorcentaje() {
    let precioCosto = formatoNumero($("#txtPrecioCosto").val());
    let precioVenta = formatoNumero($("#txtPrecioVenta").val());

    if (!isNaN(precioCosto) && !isNaN(precioVenta) && precioCosto !== 0) {
        let porcentajeGanancia = ((precioVenta - precioCosto) / precioCosto) * 100;
        // Limitar el porcentaje de ganancia a 2 decimales
        porcentajeGanancia = porcentajeGanancia.toFixed(2);
        $("#txtPorcGanancia").val(porcentajeGanancia);
    }
}



precioCostoInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

});

precioVentaInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

});



$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

function configurarOpcionesColumnas() {
    const grid = $('#grd_Insumos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Insumos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index != 4 ? col.data : "U. de Medida";

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
