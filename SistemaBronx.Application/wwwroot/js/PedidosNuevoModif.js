let gridProductos = null;
let gridProductosModal = null;
let gridInsumosModal = null;

$(document).ready(async function () {

    document.getElementById("Fecha").value = moment().format('YYYY-MM-DD');

    configurarDataTableProductos(null);

    await listaClientes();

    $("#Clientes").select2({
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });




    $("#busqueda").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#grd_Productos_Modal tbody tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });



});



async function listaCategoriasFilter() {
    const url = `/Productos/ListaCategorias`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}


async function listaCategorias() {
    const data = await listaCategoriasFilter();

    $('#Categorias option').remove();

    select = document.getElementById("Categorias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }

    $("#Categorias").select2({
        dropdownParent: $("#productoModal"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });
}


async function configurarDataTableProductosModal(data) {
    if (gridProductosModal == null) {
        gridProductosModal = $('#grd_Productos_Modal').DataTable({
            data: data != null ? data : null,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "200px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'CostoUnitario' },
                { data: 'Id', visible: false },
               
            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [2] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {

                var api = this.api();

                setTimeout(function () {
                    gridProductosModal.columns.adjust();
                }, 150);


                let filaSeleccionada = null; // Variable para almacenar la fila seleccionada
                $('#grd_Productos_Modal tbody').on('click', 'tr', async function () {
                    // Remover la clase de la fila anteriormente seleccionada
                    if (filaSeleccionada) {
                        $(filaSeleccionada).removeClass('selected');
                        $('td', filaSeleccionada).removeClass('selected');

                    }

                    var data = gridProductosModal.row(this).data();

                    cargarInformacionProducto(data.Id);
                  

                   

                    // Obtener la fila actual
                    filaSeleccionada = $(this);

                    // Agregar la clase a la fila actual
                    $(filaSeleccionada).addClass('selected');
                    $('td', filaSeleccionada).addClass('selected');

                });

                $('body').on('mouseenter', '#grd_Productos_Modal', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {



        gridProductosModal.clear().rows.add(data).draw();

        setTimeout(function () {
            gridProductosModal.columns.adjust();
        }, 250);
    }
}

async function configurarDataTableInsumosModal(data) {
    if (gridInsumosModal == null) {
        gridInsumosModal = $('#grd_Insumos_Modal').DataTable({
            data: data != null ? data.$values : null,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "200px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Cantidad' },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'Color' },
                { data: 'Id', visible: false },
            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [],
            initComplete: async function () {
                var api = this.api();

                setTimeout(function () {
                    gridInsumosModal.columns.adjust();
                }, 150);

                let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas

                // Evento para seleccionar o deseleccionar filas
                $('#grd_Insumos_Modal tbody').on('click', 'tr', function () {
                    var fila = $(this);

                    // Verificar si la fila ya está seleccionada
                    var index = filasSeleccionadas.indexOf(fila[0]);

                    if (index === -1) {
                        // Si no está seleccionada, agregarla
                        filasSeleccionadas.push(fila[0]);
                        fila.addClass('selected');
                        $('td', fila).addClass('selected');
                    } else {
                        // Si ya está seleccionada, quitarla
                        filasSeleccionadas.splice(index, 1);
                        fila.removeClass('selected');
                        $('td', fila).removeClass('selected');
                    }
                });

                // Cambiar el cursor cuando el mouse esté sobre la tabla
                $('body').on('mouseenter', '#grd_Insumos_Modal', function () {
                    $(this).css('cursor', 'pointer');
                });
            },
        });
    } else {
        gridInsumosModal.clear().rows.add(data.$values).draw();

        setTimeout(function () {
            gridInsumosModal.columns.adjust();
        }, 250);
    }
}



async function configurarDataTableProductos(data) {
    if (gridProductos == null) {
        gridProductos = $('#grd_Productos').DataTable({
            data: data != null ? data.$values : data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Nombre' },
                { data: 'CostoUnitario' },
                { data: 'Cantidad' },
                { data: 'SubTotal' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarInsumo(${row.IdInsumo})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(${row.IdInsumo})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: true,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [1, 3] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();


                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                setTimeout(function () {
                    gridProductos.columns.adjust();
                }, 200);

                $('body').on('mouseenter', '#grd_Pedidos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}


async function cargarDatosProductoModal() {
    const datosProducto = await ObtenerDatosProductoModal();
    listaCategorias();
    configurarDataTableProductosModal(datosProducto);
}


async function ObtenerDatosProductoModal() {
    const url = `/Productos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}


async function ObtenerInsumosProducto(id) {
    const url = `/Productos/EditarInfo?Id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function cargarInformacionProducto(id) {
    const insumosProducto = await ObtenerInsumosProducto(id);
    configurarDataTableInsumosModal(insumosProducto.Insumos);
}


async function anadirProducto() {
    await cargarDatosProductoModal();
    await configurarDataTableInsumosModal(null);
    $("#productoModal").modal('show');
  
}


async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    select = document.getElementById("Clientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}
