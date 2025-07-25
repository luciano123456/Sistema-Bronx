let gridProductos;
let isEditing = false;


const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaProductosCategoriaFilter },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
];

$(document).ready(() => {

    listaProductos(-1);

    $('#txtNombre, #txtCodigo').on('input', function () {
        validarCampos()
    });


})



function guardarCambios() {
    if (validarCampos()) {
        const idProducto = $("#txtId").val();
        const nuevoModelo = {
            "Id": idProducto !== "" ? idProducto : 0,
            "Nombre": $("#txtNombre").val(),
            "IdUnidadMedida": $("#UnidadesMedida").val(),
            "IdUnidadNegocio": $("#UnidadesNegocio").val(),
            "IdCategoria": $("#Categorias").val(),
            "Sku": $("#txtSku").val(),
            "CostoUnitario": $("#txtCostoUnitario").val(),
        };

        const url = idProducto === "" ? "Productos/Insertar" : "Productos/Actualizar";
        const method = idProducto === "" ? "POST" : "PUT";

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
                const mensaje = idProducto === "" ? "Producto registrado correctamente" : "Producto modificado correctamente";
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
    const Nombre = $("#txtNombre").val();
    const campoValidoNombre = Nombre !== "";
    const campoValidoCodigo = codigo !== "";

    $("#lblNombre").css("color", campoValidoNombre ? "" : "red");
    $("#txtNombre").css("border-color", campoValidoNombre ? "" : "red");

    return campoValidoNombre;
}

function nuevoProducto() {
    window.location.href = '/Productos/NuevoModif';
}

async function mostrarModal(modelo) {
    const campos = ["Id", "Sku", "CostoUnitario", "Nombre"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    listaUnidadesNegocio();
    listaUnidadesMedida();
    listaProductosCategoria();

    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Producto");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
    $('#lblSku, #txtSku').css('color', '').css('border-color', '');
    $('#lblCostoUnitario, #txtCostoUnitario').css('color', '').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Sku", "CostoUnitario", "Nombre"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
    $('#lblSku, #txtSku').css('color', '').css('border-color', '');
    $('#lblCostoUnitario, #txtCostoUnitario').css('color', '').css('border-color', '');
}


async function aplicarFiltros() {
    listaProductos()
}


async function listaProductos() {
    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}

function editarProducto(id) {
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    window.location.href = '/Productos/NuevoModif/' + id;
    localStorage.removeItem("DuplicarProducto");
}

function duplicarProducto(id) {
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    window.location.href = '/Productos/NuevoModif/' + id;
    localStorage.setItem("DuplicarProducto", true);
}


async function eliminarProducto(id) {
    let resultado = window.confirm("¿Desea eliminar el Producto?");

    if (resultado) {
        try {
            const response = await fetch("Productos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Producto.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                aplicarFiltros();
                exitoModal("Producto eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridProductos) {
        $('#grd_Productos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');
        gridProductos = $('#grd_Productos').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            pageLength: 50,
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarProducto(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProducto(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='duplicarProducto(${data})' title='Duplicar'>
                            <i class='fa fa-clone fa-lg text-warning' aria-hidden='true'></i> Duplicar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'PorcIva' },
                { data: 'PorcGanancia' },
                { data: 'CostoUnitario' },
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Productos_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4,5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Productos_${moment().format('YYYY-MM-DD')}`,
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
            fixedHeader: false,

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(redondearCien(data)); // Formatear números
                    },
                    "targets": [5] // Índices de las columnas de números
                },
                
            ],

            initComplete: async function () {
                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
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
                                    // Buscar coincidencia exacta para cada valor seleccionado
                                    var regex = '^(' + selectedValues.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                    await api.column(config.index).search(regex, true, false).draw();

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
                    gridProductos.columns.adjust();
                }, 10);

                // Cambiar el cursor a 'pointer' cuando pase sobre cualquier fila o columna
                $('#grd_Productos tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

                // Doble clic para ejecutar la función editarPedido(id)
                $('#grd_Productos tbody').on('dblclick', 'tr', function () {
                    var id = gridProductos.row(this).data().Id; // Obtener el ID de la fila seleccionada
                    editarProducto(id); // Llamar a la función de editar
                });

                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_Productos tbody').on('click', 'tr', function () {
                    // Remover la clase de la fila anteriormente seleccionada
                    if (filaSeleccionada) {
                        $(filaSeleccionada).removeClass('seleccionada');
                        $('td', filaSeleccionada).removeClass('seleccionada');

                    }

                    // Obtener la fila actual
                    filaSeleccionada = $(this);

                    // Agregar la clase a la fila actual
                    $(filaSeleccionada).addClass('seleccionada');
                    $('td', filaSeleccionada).addClass('seleccionada');

                });



              
            },
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Productos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Productos_Columnas`; // Clave única para esta pantalla

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

$(document).on('click', function (e) {
    // Verificar si el clic está fuera de cualquier dropdown
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide(); // Cerrar todos los dropdowns
    }
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



async function listaProductosCategoriaFilter() {
    const url = `/Productos/ListaCategorias`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}


async function listaUnidadesNegocio() {
    const data = await listaUnidadesNegocioFilter();

    $('#UnidadesNegocio option').remove();

    select = document.getElementById("UnidadesNegocio");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaUnidadesMedida() {
    const data = await listaUnidadesMedidaFilter();

    $('#UnidadesMedida option').remove();

    select = document.getElementById("UnidadesMedida");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

async function listaProductosCategoria() {
    const data = await listaProductosCategoriaFilter();

    $('#Categorias option').remove();

    select = document.getElementById("Categorias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}





async function listaUnidadesNegocioFiltro() {
    const data = await listaUnidadesNegocioFilter();

    $('#UnidadNegocioFiltro option').remove();

    select = document.getElementById("UnidadNegocioFiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

function redondearCien(value) {
    if (value == null) return '';
    return Math.ceil(value / 100) * 100;
}
