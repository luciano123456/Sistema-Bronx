let gridPedidos;
let isEditing = false;


const columnConfig = [
    { index: 1, name: 'Nro', filterType: 'text' },
    { index: 2, name: 'Fecha', filterType: 'text' },
    { index: 3, name: 'Cliente', filterType: 'text' },
    { index: 4, name: 'Importe Total', filterType: 'text' },
    { index: 5, name: 'Porc. Descuento', filterType: 'text' },
    { index: 6, name: 'SubTotal', filterType: 'text' },
    { index: 7, name: 'Importe Abonado', filterType: 'text' },
    { index: 8, name: 'Saldo', filterType: 'text' },
    { index: 9, name: 'Forma de pago', filterType: 'text' },
    { index: 10, name: 'Estado', filterType: 'text' },
    { index: 11, name: 'Comentarios', filterType: 'text' }
];


$(document).ready(() => {

    listaClientesFiltro();

    $("#ClientesFiltro").select2({
        placeholder: "Selecciona una opción",
        allowClear: false
    });


    document.getElementById("FechaDesde").value = moment().add(-7, 'days').format('YYYY-MM-DD');
    document.getElementById("FechaHasta").value = moment().format('YYYY-MM-DD');


    listaPedidos(-1, "TODOS", 0, -1, -1);

    $('#txtNombre, #txtCodigo').on('input', function () {
        validarCampos()
    });


})





function validarCampos() {
    const Nombre = $("#txtNombre").val();
    const campoValidoNombre = Nombre !== "";
    const campoValidoCodigo = codigo !== "";

    $("#lblNombre").css("color", campoValidoNombre ? "" : "red");
    $("#txtNombre").css("border-color", campoValidoNombre ? "" : "red");

    return campoValidoNombre;
}

function nuevoPedido() {
    window.location.href = '/Pedidos/NuevoModif/0';
}


async function aplicarFiltros() {
    listaPedidos(document.getElementById("ClientesFiltro").value, document.getElementById("EstadosFiltro").value, document.getElementById("FinalizadosFiltro").value, document.getElementById("FechaDesde").value, document.getElementById("FechaHasta").value)
}


async function listaPedidos(IdCliente, Estado, Finalizado, FechaDesde = null, FechaHasta = null) {
    let url = `/Pedidos/Lista?IdCliente=${IdCliente}&Estado=${Estado}&Finalizado=${Finalizado}`;

    if (FechaDesde) url += `&FechaDesde=${FechaDesde}`;
    if (FechaHasta) url += `&FechaHasta=${FechaHasta}`;

    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}


function editarPedido(id) {
    // Redirige a la vista 'PedidoNuevoModif' con el parámetro id
    guardarFiltrosPantalla('#grd_Pedidos', 'estadoPedidos', false);
    window.location.href = '/Pedidos/NuevoModif/' + id;
}

async function eliminarPedido(id) {
    let resultado = window.confirm("¿Desea eliminar el Pedido?");

    if (resultado) {
        try {
            const response = await fetch("Pedidos/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                errorModal("Error al eliminar el Pedido.")
            }

            const dataJson = await response.json();

            if (dataJson) {
                aplicarFiltros();
                exitoModal("Pedido eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridPedidos) {
        $('#grd_Pedidos thead tr').clone(true).addClass('filters').appendTo('#grd_Pedidos thead');
        gridPedidos = $('#grd_Pedidos').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarPedido(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarPedido(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Id' },
                { data: 'Fecha' },
                { data: 'Cliente' },
                { data: 'ImporteTotal' },
                { data: 'PorcDescuento' },
                { data: 'SubTotal' },
                { data: 'ImporteAbonado' },
                { data: 'Saldo' },
                { data: 'FormaPago' },
                { data: 'Estado' },
                { data: 'Comentarios' },
                {
                    data: 'Finalizado',
                    title: 'Finalizado',
                    render: function (data, type) {
                        if (type !== 'display') return String(data ?? '');
                        return data === 1
                            ? `<i class="fa fa-check-circle text-success" title="Finalizado"></i>`
                            : `<i class="fa fa-times-circle text-danger" title="No Finalizado"></i>`;
                    },
                    orderable: false, searchable: true
                },
                {
                    data: 'Facturado',
                    title: 'Facturado',
                    render: function (data, type) {
                        if (type !== 'display') return String(data ?? '');
                        return data === 1
                            ? `<i class="fa fa-check-circle text-success" title="Facturado"></i>`
                            : `<i class="fa fa-times-circle text-danger" title="No Facturado"></i>`;
                    },
                    orderable: false, searchable: true
                }

               
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Pedidos_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4,5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Pedidos_${moment().format('YYYY-MM-DD')}`,
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
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [4,6,7,8] // Índices de las columnas de números
                },
                {
                    "render": function (data, type, row) {
                        if (data) {
                            const date = new Date(data); // Convierte la cadena en un objeto Date
                            return date.toLocaleDateString('es-ES'); // Formato: 'DD/MM/YYYY'
                        }
                    },
                    "targets": [2] // Índices de las columnas de fechas
                },
                
            ],

            initComplete: async function () {
                const api = this.api();
                const idTabla = '#grd_Pedidos';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoPedidos')) || {};

                const visibilidadActual = api.columns().visible().toArray();

                for (const config of columnConfig) {
                    const index = config.index;
                    const name = config.name;
                    const cell = $('.filters th').eq(index);
                    const valorGuardado = estadoGuardado.filtrosPorNombre?.[name];

                    if (!api.column(index).visible()) continue;

                    cell.attr('data-colname', name);
                    cell.empty();

                    if (config.filterType === 'select') {
                        const select = $('<select id="filter' + index + '" multiple="multiple"><option value="">Seleccionar...</option></select>')
                            .attr('data-index', index)
                            .appendTo(cell)
                            .on('change', async function () {
                                const selectedValues = $(this).val();
                                if (selectedValues && selectedValues.length > 0) {
                                    const regex = '^(' + selectedValues.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                    await api.column(index).search(regex, true, false).draw();
                                } else {
                                    await api.column(index).search('').draw();
                                }
                            });

                        const data = await config.fetchDataFunc();
                        data.forEach(item => {
                            select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
                        });

                        select.select2({ placeholder: 'Seleccionar...', width: '100%' });

                        // Aplicar filtro guardado
                        if (valorGuardado) {
                            const valores = Array.isArray(valorGuardado) ? valorGuardado : [valorGuardado];
                            const opcionesActuales = data.map(x => x.Nombre);
                            const valoresValidos = valores.filter(v => opcionesActuales.includes(v));
                            if (valoresValidos.length > 0) {
                                select.val(valoresValidos).trigger('change.select2');

                                // Aplicar búsqueda al DataTable
                                const regex = '^(' + valoresValidos.map(val => $.fn.dataTable.util.escapeRegex(val)).join('|') + ')$';
                                await api.column(index).search(regex, true, false).draw();
                            }

                        }

                    } else if (config.filterType === 'text') {
                        const input = $('<input type="text" />')
                            .attr('data-index', index)
                            .val(valorGuardado || '')
                            .attr('placeholder', valorGuardado ? '' : 'Buscar...')
                            .appendTo(cell)
                            .on('keyup change', function () {
                                const regexr = '(((' + this.value + ')))';
                                const cursorPosition = this.selectionStart;
                                api.column(index)
                                    .search(this.value !== '' ? regexr : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });

                        // Aplicar búsqueda al inicializar
                        if (valorGuardado) {
                            const regexr = '(((' + valorGuardado + ')))';
                            api.column(index).search(regexr, true, false);
                        }
                    }
                }
                $('.filters th').eq(12).html(''); // Limpiar la última columna si es necesario

                const addTriStateFilter = (api, colIndex) => {
                    const $cell = $('.filters th').eq(colIndex);
                    $cell.empty().addClass('tri-filter');

                    // wrapper custom para poder estilizar lindo
                    const $wrap = $('<button type="button" class="tri-switch" data-state="all" title="Todos → Sí → No"></button>');
                    const $cb = $('<input type="checkbox" class="tri-switch-input" />'); // oculto, solo para indeterminate
                    const $ui = $('<span class="tri-switch-ui"></span>');
                    $wrap.append($cb, $ui);
                    $cell.append($wrap);

                    let state = 'all';
                    $cb.prop('indeterminate', true);

                    const apply = () => {
                        if (state === '1') api.column(colIndex).search('^1$', true, false).draw();
                        else if (state === '0') api.column(colIndex).search('^$', true, false).draw();
                        else api.column(colIndex).search('').draw();
                    };

                    // prevenir que el header ordene la columna
                    $wrap.on('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if ($cb.prop('indeterminate')) {
                            $cb.prop('indeterminate', false).prop('checked', true);
                            state = '1'; $wrap.attr('data-state', 'on');
                        } else if ($cb.prop('checked')) {
                            $cb.prop('checked', false);
                            state = '0'; $wrap.attr('data-state', 'off');
                        } else {
                            $cb.prop('indeterminate', true);
                            state = 'all'; $wrap.attr('data-state', 'all');
                        }
                        apply();
                    });
                };

                // crear los dos filtros
                addTriStateFilter(api, 12); // Finalizado
                addTriStateFilter(api, 13); // Facturado



                await configurarOpcionesColumnas();

                await aplicarFiltrosRestaurados(api, idTabla, 'estadoPedidos', true);
                localStorage.removeItem('estadoPedidos');

                setTimeout(function () {
                    gridPedidos.columns.adjust();
                }, 10);

                // Cambiar el cursor a 'pointer' cuando pase sobre cualquier fila o columna
                $('#grd_Pedidos tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

                // Doble clic para ejecutar la función editarPedido(id)
                $('#grd_Pedidos tbody').on('dblclick', 'tr', function () {
                    var id = gridPedidos.row(this).data().Id; // Obtener el ID de la fila seleccionada
                    editarPedido(id); // Llamar a la función de editar
                });

                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_Pedidos tbody').on('click', 'tr', function () {
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
        gridPedidos.clear().rows.add(data).draw();
    }
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Pedidos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Pedidos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data != "Id" || index == 1) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index == 1 ? "NroPedido" : col.data;

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



async function listaPedidosCategoriaFilter() {
    const url = `/Pedidos/ListaCategorias`;
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

async function listaPedidosCategoria() {
    const data = await listaPedidosCategoriaFilter();

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

async function listaClientesFiltro() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#ClientesFiltro option').remove();



    select = document.getElementById("ClientesFiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Todos";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}


