let gridUsuarios;
let isEditing = false;

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'select', fetchDataFunc: listaRolesFilter },
    { index: 8, filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 9, filterType: 'text' },
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
                } else if (dataJson.valor === 'Usuario') {
                        mensaje = "El usuario ya existe en el sistema";
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarUsuario(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarUsuario(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
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

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                configurarOpcionesColumnas();

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

        $('#grd_Usuarios tbody').on('dblclick', 'td', async function () {
            var cell = gridUsuarios.cell(this);
            var originalData = cell.data();
            var colIndex = cell.index().column;
            var rowData = gridUsuarios.row($(this).closest('tr')).data();

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
            if (colIndex === 7 || colIndex === 8) {
                var select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .appendTo($(this).empty())
                    .on('change', function () {
                        // No hacer nada en el change, lo controlamos con el botón de aceptar
                    });

                // Estilo para las opciones del select
                select.find('option').css('color', 'white'); // Cambiar el color del texto de las opciones a blanco
                select.find('option').css('background-color', 'black'); // Cambiar el fondo de las opciones a negro

                // Obtener las provincias disponibles
                var selectResult = colIndex === 7 ? await obtenerRoles() : await obtenerEstados();
                selectResult.forEach(function (result) {
                    select.append('<option value="' + result.Id + '">' + result.Nombre + '</option>');
                });

                colIndex === 7 ? select.val(rowData.IdRol) : select.val(rowData.IdEstado);

                // Crear los botones de guardar y cancelar
                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    var selectedValue = select.val();
                    var selectedText = select.find('option:selected').text();
                    saveEdit(colIndex, gridUsuarios.row($(this).closest('tr')).data(), selectedText, selectedValue, $(this).closest('tr'));
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Agregar los botones de guardar y cancelar en la celda
                $(this).append(saveButton).append(cancelButton);

                // Enfocar el select
                select.focus();

            } else { // Para las demás columnas, como Dirección
                var valueToDisplay = originalData && originalData.trim() !== "" ? originalData.replace(/<[^>]+>/g, "") : originalData || "";

                var input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                    .val(valueToDisplay)
                    .on('input', function () {
                        var saveBtn = $(this).siblings('.fa-check'); // Botón de guardar

                        if (colIndex === 1) { // Validar solo si es la columna 1
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
                            saveEdit(colIndex, gridUsuarios.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                        } else if (e.key === 'Escape') {
                            cancelEdit();
                        }
                    });

                var saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                    if (!$(this).prop('disabled')) { // Solo guardar si el botón no está deshabilitado
                        saveEdit(colIndex, gridUsuarios.row($(this).closest('tr')).data(), input.val(), input.val(), $(this).closest('tr'));
                    }
                });

                var cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                // Reemplazar el contenido de la celda
                $(this).empty().append(input).append(saveButton).append(cancelButton);

                input.focus();
            }

            // Función para guardar los cambios
            async function saveEdit(colIndex, rowData, newText, newValue, trElement) {
                // Obtener el nodo de la celda desde el índice
                var celda = $(trElement).find('td').eq(colIndex); // Obtener la celda correspondiente dentro de la fila
                // Obtener el valor original de la celda
                var originalText = gridUsuarios.cell(trElement, colIndex).data();

                // Verificar si el texto realmente ha cambiado
                if (originalText === newText) {
                    cancelEdit();
                    return; // Si no ha cambiado, no hacer nada
                }

                if (colIndex === 7) { // Si es la columna de la provincia
                    rowData.IdRol = newValue;
                    rowData.Rol = newText;
                } else if(colIndex === 8) { // Si es la columna de la provincia
                        rowData.IdEstado = newValue;
                        rowData.Estado = newText;
                } else {
                    rowData[gridUsuarios.column(colIndex).header().textContent] = newText; // Usamos el nombre de la columna para guardarlo
                }

               

               

                // Enviar los datos al servidor
                var resp = await guardarCambiosFila(rowData);

                if (resp) {
                    // Aplicar el parpadeo solo si el texto cambió
                    if (originalText !== newText) {
                        // Actualizar la fila en la tabla con los nuevos datos
                        gridUsuarios.row(trElement).data(rowData).draw();
                        celda.addClass('blinking'); // Aplicar la clase 'blinking' a la celda que fue editada
                    }
                } else {
                    cancelEdit();
                }

                // Desactivar el modo de edición
                isEditing = false;

                // Eliminar la clase 'blinking' después de 3 segundos (para hacer el efecto de parpadeo)
                setTimeout(function () {
                    celda.removeClass('blinking');
                }, 3000); // Duración de la animación de parpadeo (3 segundos)
            }


            // Función para cancelar la edición
            function cancelEdit() {
                // Restaurar el valor original
                gridUsuarios.cell(cell.index()).data(originalData).draw();
                isEditing = false;
            }
        });
    } else {
        gridUsuarios.clear().rows.add(data).draw();
    }
}

async function obtenerRoles() {
    const response = await fetch(`/Roles/Lista`);
    const result = await response.json();
    return result;
}

async function obtenerEstados() {
    const response = await fetch(`/EstadosUsuarios/Lista`);
    const result = await response.json();
    return result;
}

async function guardarCambiosFila(rowData) {
    try {
        rowData.cambioAdmin = 1;  // Puedes modificar este valor según necesites.

        // Realizando la solicitud PUT con fetch.
        const response = await fetch('/Usuarios/Actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rowData)
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        // Parsear la respuesta JSON.
        const dataJson = await response.json();

        // Verificar los valores en la respuesta y mostrar los mensajes correspondientes.
        let mensaje = "";

        if (dataJson.valor === 'Contrasena') {
            mensaje = "Contrasena incorrecta";
            errorModal(mensaje);
            return false;
        } else if (dataJson.valor === 'Usuario') {
            mensaje = "El usuario ya existe en el sistema";
            errorModal(mensaje);
            return false;
        } else {
            return true;
        }

    } catch (error) {
        // Si hubo un error en la red o en el servidor.
        console.error('Error de red:', error);
        errorModal('Ha ocurrido un error al guardar los datos...');
    }
}

async function listaRoles() {
    const data = await obtenerRoles();

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
  
    const data = await obtenerEstados();

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
  
    const data = await obtenerEstados();

    return data.map(estado => ({
        Id: estado.Id,
        Nombre: estado.Nombre
    }));

}

async function listaRolesFilter() {
    const data = await obtenerRoles();

    return data.map(rol => ({
        Id: rol.Id,
        Nombre: rol.Nombre
    }));

}

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
});

function configurarOpcionesColumnas() {
    const grid = $('#grd_Usuarios').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas

    const storageKey = `Usuarios_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data !== "Id") { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index != 6 ? col.data : "Direccion";

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
