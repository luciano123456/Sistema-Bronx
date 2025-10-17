let gridCotizaciones;
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


    listaCotizaciones(-1, "TODOS", 0, -1, -1);

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

function nuevoCotizacion() {
    window.location.href = '/Cotizaciones/NuevoModif/0';
}


async function aplicarFiltros() {
    listaCotizaciones(document.getElementById("ClientesFiltro").value, document.getElementById("EstadosFiltro").value, document.getElementById("FinalizadosFiltro").value, document.getElementById("FechaDesde").value, document.getElementById("FechaHasta").value)
}


async function listaCotizaciones(IdCliente, Estado, Finalizado, FechaDesde = null, FechaHasta = null) {
    let url = `/Cotizaciones/Lista?IdCliente=${IdCliente}&Estado=${Estado}&Finalizado=${Finalizado}`;

    if (FechaDesde) url += `&FechaDesde=${FechaDesde}`;
    if (FechaHasta) url += `&FechaHasta=${FechaHasta}`;

    const response = await fetch(url);
    const data = await response.json();
    await configurarDataTable(data);
}


function editarCotizacion(id) {
    // Redirige a la vista 'CotizacionNuevoModif' con el parámetro id
    guardarFiltrosPantalla('#grd_Cotizaciones', 'estadoCotizaciones', false);
    window.location.href = '/Cotizaciones/NuevoModif/' + id;
}

async function eliminarCotizacion(id) {
    let resultado = window.confirm("¿Desea eliminar la cotizacion?");

    if (resultado) {
        try {
            const response = await fetch("Cotizaciones/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                errorModal("Error al eliminar la cotizacion.")
            }

            const dataJson = await response.json();

            if (dataJson) {
                aplicarFiltros();
                exitoModal("Cotizacion eliminado correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}

async function configurarDataTable(data) {
    if (!gridCotizaciones) {
        $('#grd_Cotizaciones thead tr').clone(true).addClass('filters').appendTo('#grd_Cotizaciones thead');
        gridCotizaciones = $('#grd_Cotizaciones').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarCotizacion(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCotizacion(${data})' title='Eliminar'>
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
                    render: function (data) {
                        if (data === 1) {
                            return `<i class="fa fa-check-circle text-success" title="Finalizado"></i>`; // Green check
                        } else if (data === 0) {
                            return `<i class="fa fa-times-circle text-danger" title="No Finalizado"></i>`; // Red cross
                        }
                        return ''; // In case the data is null or doesn't match 0 or 1
                    },
                    orderable: false,
                    searchable: false,
                },
               
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: `Reporte Cotizaciones_${moment().format('YYYY-MM-DD')}`,
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4,5]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: `Reporte Cotizaciones_${moment().format('YYYY-MM-DD')}`,
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
                const idTabla = '#grd_Cotizaciones';
                const estadoGuardado = JSON.parse(localStorage.getItem('estadoCotizaciones')) || {};

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

                await configurarOpcionesColumnas();

                await aplicarFiltrosRestaurados(api, idTabla, 'estadoCotizaciones', true);
                localStorage.removeItem('estadoCotizaciones');

                setTimeout(function () {
                    gridCotizaciones.columns.adjust();
                }, 10);

                // Cambiar el cursor a 'pointer' cuando pase sobre cualquier fila o columna
                $('#grd_Cotizaciones tbody').on('mouseenter', 'tr', function () {
                    $(this).css('cursor', 'pointer');
                });

                // Doble clic para ejecutar la función editarCotizacion(id)
                $('#grd_Cotizaciones tbody').on('dblclick', 'tr', function () {
                    var id = gridCotizaciones.row(this).data().Id; // Obtener el ID de la fila seleccionada
                    editarCotizacion(id); // Llamar a la función de editar
                });

                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_Cotizaciones tbody').on('click', 'tr', function () {
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
        gridCotizaciones.clear().rows.add(data).draw();
    }
}


function configurarOpcionesColumnas() {
    const grid = $('#grd_Cotizaciones').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenu'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Cotizaciones_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && col.data != "Id" || index == 1) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = index == 1 ? "NroCotizacion" : col.data;

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



async function listaCotizacionesCategoriaFilter() {
    const url = `/Cotizaciones/ListaCategorias`;
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

async function listaCotizacionesCategoria() {
    const data = await listaCotizacionesCategoriaFilter();

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
