let gridInsumos;
let grdProveedores;
let isEditing = false;


const precioCostoInput = document.getElementById('txtPrecioCosto');
const precioVentaInput = document.getElementById('txtPrecioVenta');



const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'select', fetchDataFunc: listaTiposFilter }, // Columna con un filtro de selección
    { index: 2, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Columna con un filtro de selección
    { index: 3, filterType: 'select', fetchDataFunc: listaUnidadesDeMedidasFilter }, // Columna con un filtro de selección
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },

];

const Modelo_base = {
    Id: 0,
    Descripcion: "",
    IdTipo: 1,
    IdCategoria: 1,
    IdUnidadMedida: 1,
    IdProveedor: 0,
    Especificacion: "",
    PrecioCosto: "",
    PorcGanancia: "",
    PrecioVenta: "",
}

$(document).ready(() => {

    listaInsumos();

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
            "IdProveedor": (idProveedor && idProveedor !== "") ? idProveedor : 0,
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

    // Validar porcentaje ganancia
    const idProveedorValido = idProveedor !== "";
    $("#lblIdProveedor").css("color", idProveedor ? "" : "red");
    $("#txtProveedor").css("border-color", idProveedor ? "" : "red");

    // Retorna true solo si todos los campos son válidos
    return descripcionValida && precioCostoValido && porcGananciaValida && precioVentaValido && idProveedorValido;
}

function nuevoInsumo() {
    limpiarModal();
    listaCategorias();
    listaUnidadesDeMedidas();
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
    $('#lblIdProveedor').css('color', 'red');
    $('#txtProveedor').css('border-color', 'red');
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
    await listaUnidadesDeMedidas();
    await listaTipos();

    document.getElementById("Tipos").value = modelo.IdTipo;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadMedida;
    document.getElementById("txtIdProveedor").value = modelo.IdProveedor;
    document.getElementById("txtProveedor").value = modelo.Proveedor;



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
    $('#lblIdProveedor').css('color', '');
    $('#txtProveedor').css('border-color', '');

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
    await listaUnidadesDeMedidas();
    await listaTipos();

    document.getElementById("Tipos").value = modelo.IdTipo;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadMedida;
    document.getElementById("txtIdProveedor").value = modelo.IdProveedor;
    document.getElementById("txtProveedor").value = modelo.Proveedor;



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
    $('#lblIdProveedor').css('color', '');
    $('#txtProveedor').css('border-color', '');

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
    $('#lblIdProveedor').css('color', '');
    $('#txtProveedor').css('border-color', '');
}



async function listaInsumos() {
    const url = `/Insumos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
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
            columns: [
                { data: 'Descripcion' },
                { data: 'Tipo' },
                { data: 'Categoria' },
                { data: 'UnidaddeMedida' },
                { data: 'Proveedor' },
                { data: 'Especificacion' },
                { data: 'PrecioCosto' },
                { data: 'PorcGanancia' },
                { data: 'PrecioVenta' },
                {
                    data: "Id",
                    render: function (data) {
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='duplicarInsumo(" + data + ")' title='Duplicar'><i class='fa fa-clone fa-lg text-warning' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarInsumo(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Insumos',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Insumos',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
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
                    "targets": [6, 8] // Columna Precio
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,

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

                var lastColIdx = api.columns().indexes().length - 1;
                $('.filters th').eq(lastColIdx).html(''); // Limpiar la última columna si es necesario

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

            // Verificar si la columna es la de acciones (última columna)
            if (colIndex === gridInsumos.columns().indexes().length - 1) {
                return; // No permitir editar en la columna de acciones
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
            if (colIndex === 1 || colIndex === 2 || colIndex === 3 || colIndex === 4) {
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

                if (colIndex == 1) {
                    result = await obtenerTipos();
                } else if (colIndex == 2) {
                    result = await obtenerCategorias();
                } else if (colIndex == 3) {
                    result = await obtenerUnidadesDeMedidas();
                } else if (colIndex == 4) {
                    result = await obtenerProveedores();
                }

                result.forEach(function (res) {
                    select.append('<option value="' + res.Id + '">' + res.Nombre + '</option>');
                });

                if (colIndex == 1) {
                    select.val(rowData.IdTipo);
                } else if (colIndex == 2) {
                    select.val(rowData.IdCategoria);
                } else if (colIndex == 3) {
                    select.val(rowData.IdUnidadMedida);
                } else if (colIndex == 4) {
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

            } else if (colIndex === 6 || colIndex === 8) {
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
            function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                // Obtener el nodo de la celda desde el índice
                var celda = $(trElement).find('td').eq(colIndex); // Obtener la celda correspondiente dentro de la fila
                // Obtener el valor original de la celda
                var originalText = gridInsumos.cell(trElement, colIndex).data();

                if (colIndex === 2) {
                    var tempDiv = document.createElement('div'); // Crear un div temporal
                    tempDiv.innerHTML = originalText; // Establecer el HTML de la celda
                    originalText = tempDiv.textContent.trim(); // Extraer solo el texto
                    newText = newText.trim();
                }

                // Verificar si el texto realmente ha cambiado
                if (colIndex === 6 || colIndex === 8) { // Si es la columna PrecioCosto o PrecioVenta
                    // Convertir ambos valores (originalText y newText) a números flotantes
                    var originalValue = parseFloat(originalText).toFixed(2);
                    var newValueFloat = parseFloat(convertirMonedaAfloat(newText)).toFixed(2);

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

                // Limpiar las clases 'blinking' de las celdas relevantes antes de aplicar el parpadeo
                $(trElement).find('td').removeClass('blinking');

                // Actualizar el valor de la fila según la columna editada
                if (colIndex === 1) { // Si es la columna de la provincia
                    rowData.IdTipo = newValue;
                    rowData.Tipo = newText;
                } else if (colIndex === 2) { // Si es la columna de la provincia
                    rowData.IdCategoria = newValue;
                    rowData.Categoria = newText;
                } else if (colIndex === 3) { // Si es la columna de la provincia
                    rowData.IdUnidadMedida = newValue;
                    rowData.UnidaddeMedida = newText;
                } else if (colIndex === 4) { // Si es la columna de la provincia
                    rowData.IdProveedor = newValue;
                    rowData.Proveedor = newText;
                } else if (colIndex === 6) { // Si es la columna de PrecioCosto
                    rowData.PrecioCosto = convertirMonedaAfloat(newValue); // Actualizar PrecioCosto

                    // Calcular PrecioVenta basado en PrecioCosto y PorcentajeGanancia
                    var precioVentaCalculado = rowData.PrecioCosto + (rowData.PrecioCosto * (rowData.PorcGanancia / 100));
                    rowData.PrecioVenta = precioVentaCalculado;

                    // Actualizar el porcentaje de ganancia basado en el PrecioCosto
                    rowData.PorcGanancia = parseFloat(((rowData.PrecioVenta - rowData.PrecioCosto) / rowData.PrecioCosto) * 100).toFixed(2);

                    // Aplicar el efecto de parpadeo a las celdas 6 y 8 (PrecioCosto y PrecioVenta)
                    var celda6 = $(trElement).find('td').eq(6); // Obtener la celda de PrecioCosto
                    var celda8 = $(trElement).find('td').eq(8); // Obtener la celda de PrecioVenta

                    celda6.addClass('blinking'); // Aplicar la clase 'blinking' a la celda 6
                    celda8.addClass('blinking'); // Aplicar la clase 'blinking' a la celda 8
                } else if (colIndex === 7) { // Si es la columna de PorcentajeGanancia
                    rowData.PorcGanancia = parseDecimal(newValue); // Actualizar PorcentajeGanancia

                    // Calcular PrecioVenta basado en PrecioCosto y PorcentajeGanancia
                    rowData.PrecioVenta = rowData.PrecioCosto + (rowData.PrecioCosto * (rowData.PorcGanancia / 100));

                    // Aplicar el efecto de parpadeo a las celdas 7 y 8 (PorcentajeGanancia y PrecioVenta)
                    var celda7 = $(trElement).find('td').eq(7); // Obtener la celda de PorcentajeGanancia
                    var celda8 = $(trElement).find('td').eq(8); // Obtener la celda de PrecioVenta

                    celda7.addClass('blinking'); // Aplicar la clase 'blinking' a la celda 7
                    celda8.addClass('blinking'); // Aplicar la clase 'blinking' a la celda 8
                } else if (colIndex === 8) { // Si es la columna de PrecioVenta
                    rowData.PrecioVenta = convertirMonedaAfloat(newValue);
                    rowData.PorcGanancia = parseFloat(((convertirMonedaAfloat(newValue) - rowData.PrecioCosto) / rowData.PrecioCosto) * 100).toFixed(2);

                    // Aplicar el efecto de parpadeo también en la celda 7
                    var celda7 = $(trElement).find('td').eq(7); // Obtener la celda de la columna 7
                    celda7.addClass('blinking'); // Aplicar la clase 'blinking' a la celda 7
                } else {
                    rowData[gridInsumos.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                }

                // Actualizar la fila en la tabla con los nuevos datos
                gridInsumos.row(trElement).data(rowData).draw();

                // Aplicar el parpadeo solo si el texto cambió
                if (originalText !== newText) {
                    celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                }

                // Enviar los datos al servidor
                guardarCambiosFila(rowData);

                // Desactivar el modo de edición
                isEditing = false;

                // Eliminar la clase 'blinking' después de 3 segundos (para hacer el efecto de parpadeo)
                setTimeout(function () {
                    $(trElement).find('td').removeClass('blinking'); // Eliminar 'blinking' de todas las celdas
                }, 3000); // Duración de la animación de parpadeo (3 segundos)
            }




            // Función para cancelar la edición
            function cancelEdit() {
                // Restaurar el valor original
                gridInsumos.cell(cell.index()).data(originalData).draw();
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


async function abrirProveedor() {
    const Proveedores = await obtenerProveedores();
    await cargarDataTableProveedores(Proveedores);

    // Configura eventos de selección
    $('#tablaProveedores tbody').on('dblclick', 'tr', function () {
        var data = $('#tablaProveedores').DataTable().row(this).data();
        cargarDatosProveedor(data);
        $('#ProveedorModal').modal('hide');
    });

    $('#btnSeleccionarProveedor').on('click', function () {
        var data = $('#tablaProveedores').DataTable().row('.selected').data();
        if (data) {
            cargarDatosProveedor(data);
            $('#ProveedorModal').modal('hide');
        } else {
            errorModal('Seleccione una Proveedor');
        }
    });

    let filaSeleccionada = null; // Variable para almacenar la fila seleccionada

    $('#tablaProveedores tbody').on('click', 'tr', function () {
        // Remover la clase de la fila anteriormente seleccionada
        if (filaSeleccionada) {
            $(filaSeleccionada).removeClass('selected');
            $('td', filaSeleccionada).removeClass('selected');

        }

        // Obtener la fila actual
        filaSeleccionada = $(this);

        // Agregar la clase a la fila actual
        $(filaSeleccionada).addClass('selected');
        $('td', filaSeleccionada).addClass('selected');
    });

    // Abre el modal
    $('#ProveedorModal').modal('show');

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
        fixedHeader: true,

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

