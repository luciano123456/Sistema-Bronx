let gridZonas;
const precioInput = document.getElementById('txtPrecio');


const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    Direccion: "",
}

$(document).ready(() => {

    listaZonas();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });
})

function guardarCambios() {
    if (validarCampos()) {
        const idZona = $("#txtId").val();
        const nuevoModelo = {
            "Id": idZona !== "" ? idZona : 0,
            "Nombre": $("#txtNombre").val(),
            "Precio": formatoNumero($("#txtPrecio").val()),
        };

        const url = idZona === "" ? "Zonas/Insertar" : "Zonas/Actualizar";
        const method = idZona === "" ? "POST" : "PUT";

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
                const mensaje = idZona === "" ? "Zona registrada correctamente" : "Zona modificada correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaZonas();
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
function nuevaZona() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nueva Zona");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
    document.getElementById(`txtPrecio`).value = "$0.00";
}
async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Precio"];
    campos.forEach(campo => {
        if (campo == "Precio") {
            $(`#txt${campo}`).val(formatNumber(modelo[campo]));
        } else {
            $(`#txt${campo}`).val(modelo[campo]);
        }
    });


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Zona");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}
function limpiarModal() {
    const campos = ["Id", "Nombre", "Precio"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}
async function listaZonas() {
    const url = `/Zonas/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

const editarZona = id => {
    fetch("Zonas/EditarInfo?id=" + id)
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
async function eliminarZona(id) {
    let resultado = window.confirm("¿Desea eliminar la Zona?");

    if (resultado) {
        try {
            const response = await fetch("Zonas/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la Zona.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaZonas();
                exitoModal("Zona eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridZonas) {
        $('#grd_Zonas thead tr').clone(true).addClass('filters').appendTo('#grd_Zonas thead');
        gridZonas = $('#grd_Zonas').DataTable({
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
                {
                    data: 'Precio',
                    render: function (data) {
                        return formatNumber(data); // Formatear el número antes de mostrarlo
                    }
                },
                {
                    data: "Id",
                    render: function (data) {
                        return `
                            <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarZona(${data})' title='Editar'>
                                <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                            </button>
                            <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarZona(${data})' title='Eliminar'>
                                <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                            </button>`;
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
                    filename: 'Reporte Zonas',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Zonas',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
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
                    "targets": [1] // Columna Precio
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
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var val = $(this).val();
                                var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                                await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre
                            });

                        var data = await config.fetchDataFunc(); // Llamada a la función para obtener los datos
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>');
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
                    gridZonas.columns.adjust();
                }, 10);

                // Agregar eventos al marcador
                $('body').on('mouseenter', '#grd_Zonas .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });
                $('body').on('click', '#grd_Zonas .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });
    } else {
        gridZonas.clear().rows.add(data).draw();
    }
}


precioInput.addEventListener('blur', function () {
    const rawValue = this.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsedValue = parseFloat(rawValue) || 0;

    // Formatear el número al finalizar la edición
    this.value = formatNumber(parsedValue);

});

function formatNumber(number) {
    return '$' + number.toLocaleString('es-AR');
}