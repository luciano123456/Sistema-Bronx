let gridClientes;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'select', fetchDataFunc: listaProvinciasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    Direccion: "",
    IdProvincia: 1,
    Localidad: "",
    DNI: "",
}

$(document).ready(() => {

    listaClientes();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });
})



function guardarCambios() {
    if (validarCampos()) {
        const idCliente = $("#txtId").val();
        const nuevoModelo = {
            "Id": idCliente !== "" ? idCliente : 0,
            "Nombre": $("#txtNombre").val(),
            "Telefono": $("#txtTelefono").val(),
            "Direccion": $("#txtDireccion").val(),
            "IdProvincia": $("#Provincias").val(),
            "Localidad": $("#txtLocalidad").val(),
            "DNI": $("#txtDNI").val()
        };

        const url = idCliente === "" ? "Clientes/Insertar" : "Clientes/Actualizar";
        const method = idCliente === "" ? "POST" : "PUT";

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
                const mensaje = idCliente === "" ? "Cliente registrado correctamente" : "Cliente modificado correctamente";
                $('#modalEdicion').modal('hide');
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


function validarCampos() {
    const nombre = $("#txtNombre").val();
    const camposValidos = nombre !== "";

    $("#lblNombre").css("color", camposValidos ? "" : "red");
    $("#txtNombre").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
function nuevoCliente() {
    limpiarModal();
    listaProvincias();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Cliente");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Telefono", "Direccion", "IdProvincia", "Localidad", "Dni"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    await listaProvincias();

    document.getElementById("Provincias").value = modelo.IdProvincia;



    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Cliente");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Nombre", "Telefono", "Direccion", "IdProvincia", "Localidad", "DNI"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}



async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

async function listaProvincias() {
    const url = `/Clientes/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Provincias option').remove();

    selectProvincias = document.getElementById("Provincias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaProvinciasFilter() {
    const url = `/Clientes/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(provincia => ({
        Id: provincia.Id,
        Nombre: provincia.Nombre
    }));

}

const editarCliente = id => {
    fetch("Clientes/EditarInfo?id=" + id)
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
async function eliminarCliente(id) {
    let resultado = window.confirm("¿Desea eliminar el Cliente?");

    if (resultado) {
        try {
            const response = await fetch("Clientes/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el cliente.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaClientes();
                exitoModal("Cliente eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridClientes) {
        $('#grd_clientes thead tr').clone(true).addClass('filters').appendTo('#grd_clientes thead');
        gridClientes = $('#grd_clientes').DataTable({
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
                { data: 'Telefono' },
                {
                    data: function (row) {
                        return row.Direccion && row.Direccion.trim() !== "" ? '<div class="location-cell"><i title="Ir a Google Maps" class="fa fa-map-marker fa-2x text-warning"></i> ' + row.Direccion + '</div>' : row.Direccion;
                    }
                },
                { data: 'Provincia' },
                { data: 'Localidad' },
                { data: 'Dni' },
                {
                    data: "Id",
                    render: function (data) {
                        return "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarCliente(" + data + ")' title='Editar'><i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i></button>" +
                            "<button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarCliente(" + data + ")' title='Eliminar'><i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i></button>";
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
                    filename: 'Reporte Clientes',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Clientes',
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
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar Provincia</option></select>')
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
                    gridClientes.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_clientes .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });



                $('body').on('click', '#grd_clientes .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
});
    } else {
    gridClientes.clear().rows.add(data).draw();
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