let gridUsuarios;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'select', fetchDataFunc: listaRolesFilter },
    { index: 7, filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 8, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    Direccion: "",
}

$(document).ready(() => {

    listaUsuarios();

    $('#txtNombre, #txtUsuario, #txtApellido, #txtContrasena').on('input', function () {
        validarCampos();
    });

})

function guardarCambios() {
    if (validarCampos()) {
        const idUsuario = $("#txtId").val();
        const nuevoModelo = {
            "Id": idUsuario !== "" ? idUsuario : 0,
            "Usuario": $("#txtUsuario").val(),
            "Nombre": $("#txtNombre").val(),
            "Apellido": $("#txtApellido").val(),
            "DNI": $("#txtDni").val(),
            "Telefono": $("#txtTelefono").val(),
            "Direccion": $("#txtDireccion").val(),
            "IdRol": $("#Roles").val(),
            "IdEstado": $("#Estados").val(),
            "Contrasena": idUsuario === "" ? $("#txtContrasena").val() : "",
            "ContrasenaNueva": $("#txtContrasenaNueva").val(),
            "CambioAdmin": 1
        };

        const url = idUsuario === "" ? "Usuarios/Insertar" : "Usuarios/Actualizar";
        const method = idUsuario === "" ? "POST" : "PUT";

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
                let mensaje = idUsuario === "" ? "Usuario registrado correctamente" : "Usuario modificado correctamente";
                if (dataJson.valor === 'Contrasena') {
                    mensaje = "Contrasena incorrecta";
                    errorModal(mensaje);
                    return false;
                } else {
                    $('#modalEdicion').modal('hide');
                    exitoModal(mensaje);
                }
                listaUsuarios();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}
function validarCampos() {
    const idUsuario = $("#txtId").val();
    const nombre = $("#txtNombre").val();
    const usuario = $("#txtUsuario").val();
    const apellido = $("#txtApellido").val();
    const contrasena = $("#txtContrasena").val();
    

    // Validación independiente para cada campo
    const nombreValido = nombre !== "";
    const usuarioValido = usuario !== "";
    const apellidoValido = apellido !== "";
    const contrasenaValido = contrasena !== "" || idUsuario !== "";

    // Cambiar el color de texto y borde según la validez de los campos
    $("#lblNombre").css("color", nombreValido ? "" : "red");
    $("#txtNombre").css("border-color", nombreValido ? "" : "red");

    $("#lblUsuario").css("color", usuarioValido ? "" : "red");
    $("#txtUsuario").css("border-color", usuarioValido ? "" : "red");

    $("#lblApellido").css("color", apellidoValido ? "" : "red");
    $("#txtApellido").css("border-color", apellidoValido ? "" : "red");


    $("#lblContrasena").css("color", contrasenaValido ? "" : "red");
    $("#txtContrasena").css("border-color", contrasenaValido ? "" : "red");

   

    // La función retorna 'true' si todos los campos son válidos, de lo contrario 'false'
    return nombreValido && usuarioValido && apellidoValido && contrasenaValido;
}


function nuevoUsuario() {
    limpiarModal();
    listaEstados();
    listaRoles();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Usuario");

    $('#lblUsuario').css('color', 'red');
    $('#txtUsuario').css('border-color', 'red');

    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');

    $('#lblApellido').css('color', 'red');
    $('#txtApellido').css('border-color', 'red');

    $('#lblContrasena').css('color', 'red');
    $('#txtContrasena').css('border-color', 'red');

    document.getElementById("lblContrasena").hidden = false;
    document.getElementById("txtContrasena").hidden = false;

}
async function mostrarModal(modelo) {
    const campos = ["Id", "Usuario", "Nombre", "Apellido", "Dni", "Telefono", "Direccion", "Contrasena", "ContrasenaNueva"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    await listaEstados();
    await listaRoles();

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Usuario");

    document.getElementById("lblContrasena").hidden = true;
    document.getElementById("txtContrasena").hidden = true;

    $('#lblUsuario, #txtUsuario').css('color', '').css('border-color', '');
    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
    $('#lblApellido, #txtApellido').css('color', '').css('border-color', '');
    

    
}
function limpiarModal() {
    const campos = ["Id", "Usuario", "Nombre", "Apellido", "Dni", "Telefono", "Direccion", "Contrasena", "ContrasenaNueva"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblUsuario, #txtUsuario").css("color", "").css("border-color", "");
    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
    $("#lblApellido, #txtApellido").css("color", "").css("border-color", "");
    $('#lblContrasena, #txtContrasena').css('color', '').css('border-color', "");
}
async function listaUsuarios() {
    const url = `/Usuarios/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

const editarUsuario = id => {
    fetch("Usuarios/EditarInfo?id=" + id)
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
async function eliminarUsuario(id) {
    let resultado = window.confirm("¿Desea eliminar el Usuario?");

    if (resultado) {
        try {
            const response = await fetch("Usuarios/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Usuario.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaUsuarios();
                exitoModal("Usuario eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridUsuarios) {
        $('#grd_Usuarios thead tr').clone(true).addClass('filters').appendTo('#grd_Usuarios thead');
        gridUsuarios = $('#grd_Usuarios').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                { data: 'Usuario' },
                { data: 'Nombre' },
                { data: 'Apellido' },
                { data: 'Dni' },
                { data: 'Telefono' },
                { data: 'Direccion' },
                { data: 'Rol' },
                {
                    data: 'Estado',
                    render: function (data, type, row) {
                        // Verificar si el estado es "Bloqueado" y aplicar el color rojo
                        return data === "Bloqueado" ? `<span style="color: red">${data}</span>` : data;
                    }
                },
                {
                    data: "Id",
                    render: function (data) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarUsuario(${data})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarUsuario(${data})' title='Eliminar'>
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
                    filename: 'Reporte Usuarios',
                    title: '',
                    exportOptions: {
                        columns: [0, 1, 2]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Usuarios',
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
                    gridUsuarios.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_Usuarios .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });



                $('body').on('click', '#grd_Usuarios .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });

            },
});
    } else {
    gridUsuarios.clear().rows.add(data).draw();
}
}


async function listaRoles() {
    const url = `/Roles/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Roles option').remove();

    select = document.getElementById("Roles");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaEstados() {
    const url = `/EstadosUsuarios/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Estados option').remove();

    select = document.getElementById("Estados");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaEstadosFilter() {
    const url = `/EstadosUsuarios/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(estado => ({
        Id: estado.Id,
        Nombre: estado.Nombre
    }));

}

async function listaRolesFilter() {
    const url = `/Roles/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(rol => ({
        Id: rol.Id,
        Nombre: rol.Nombre
    }));

}