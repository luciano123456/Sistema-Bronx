let gridProveedores;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Apodo: "",
    Ubicacion: "",
    Telefono: "",
}

$(document).ready(() => {

    listaProveedores();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });

  
})



function guardarCambios() {
    if (validarCampos()) {
        const idProveedor = $("#txtId").val();
        const nuevoModelo = {
            "Id": idProveedor !== "" ? idProveedor : 0,
            "Nombre": $("#txtNombre").val(),
            "Apodo": $("#txtApodo").val(),
            "Ubicacion": $("#txtUbicacion").val(),
            "Telefono": $("#txtTelefono").val(),
        };

        const url = idProveedor === "" ? "Proveedores/Insertar" : "Proveedores/Actualizar";
        const method = idProveedor === "" ? "POST" : "PUT";

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
                const mensaje = idProveedor === "" ? "Proveedor registrado correctamente" : "Proveedor modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaProveedores();
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
function nuevoProveedor() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Proveedor");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Apodo", "Ubicacion", "Telefono"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Proveedor");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Nombre", "Apodo", "Ubicacion", "Telefono"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}



async function listaProveedores() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

const editarProveedor = id => {
    fetch("Proveedores/EditarInfo?id=" + id)
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
async function eliminarProveedor(id) {
    let resultado = window.confirm("¿Desea eliminar el Proveedor?");

    if (resultado) {
        try {
            const response = await fetch("Proveedores/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Proveedor.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaProveedores();
                exitoModal("Proveedor eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridProveedores) {
        $('#grd_Proveedores thead tr').clone(true).addClass('filters').appendTo('#grd_Proveedores thead');
        gridProveedores = $('#grd_Proveedores').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                { data: 'Nombre' },
                { data: 'Apodo' },
                {
                    data: function (row) {
                        return row.Ubicacion && row.Ubicacion.trim() !== "" ? '<div class="location-cell"><i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning"></i> ' + row.Ubicacion + '</div>' : row.Ubicacion;
                    }
                },

                { data: 'Telefono' },
                {
                    data: "Id",
                    render: function (data) {
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProveedor(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProveedor(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
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
                    filename: 'Reporte Proveedores',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Proveedores',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var val = $(this).val();
                                var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                                await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre
                            });

                        var data = await config.fetchDataFunc(); // Llamada a la función para obtener los datos
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>')
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
                    gridProveedores.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_Proveedores .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });

        

                $('body').on('click', '#grd_Proveedores .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
});
    } else {
    gridProveedores.clear().rows.add(data).draw();
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