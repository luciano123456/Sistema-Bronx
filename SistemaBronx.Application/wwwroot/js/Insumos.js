let gridInsumos;
let grdProveedores;

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
    } else {
        gridInsumos.clear().rows.add(data).draw();
    }
}



function agregarFiltroDesplegable(column, obtenerOpciones, opcionPredeterminada = "Seleccionar") {
    var select = $('<select><option value="">' + opcionPredeterminada + '</option></select>')
        .appendTo($(column.header()).empty())
        .on('change', function () {
            var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
            );

            column
                .search(val ? '^' + val + '$' : '', true, false)
                .draw();
        });

    obtenerOpciones(function (opciones) {
        opciones.forEach(function (opcion) {
            select.append('<option value="' + opcion.valor + '">' + opcion.texto + '</option>');
        });
    });
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

