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


    $("#Categorias").select2({
        dropdownParent: $("#productoModal"), // Asegura que el dropdown se muestre dentro del modal
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


async function listaColoresFilter() {
    const url = `/Colores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}


async function listaColores() {
    const data = await listaColoresFilter();

    $('#Colores option').remove();

    select = document.getElementById("Colores");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }

   
}

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
            paging: false,  // Desactiva la paginación
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
            paging: false,  // Desactiva la paginación
            scrollX: "200px",
            scrollCollapse: true,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'Cantidad' },
                { data: 'Nombre' },
                { data: 'Categoria' },
                { data: 'Color', name: 'Color' },
                { data: 'IdColor', visible: false, name: 'IdColor' },
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

                // Variable para almacenar la última fila seleccionada
                var ultimaFilaSeleccionada = null;

                // Evento para seleccionar o deseleccionar filas
                $('#grd_Insumos_Modal tbody').on('click', 'tr', function (event) {
                    var fila = $(this);

                    // Verificar si se está presionando Ctrl (o Cmd en Mac)
                    var ctrlPresionado = event.ctrlKey || event.metaKey; // Ctrl en Windows/Linux, Cmd en Mac
                    // Verificar si se está presionando Shift
                    var shiftPresionado = event.shiftKey;

                    if (ctrlPresionado) {
                        // Si se presiona Ctrl/Cmd, agregar o quitar la fila de la selección
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
                    } else if (shiftPresionado && ultimaFilaSeleccionada) {
                        // Si se presiona Shift, seleccionar todas las filas entre la última fila seleccionada y la fila actual
                        var filas = $('#grd_Insumos_Modal tbody tr');
                        var indexActual = filas.index(fila);
                        var indexUltima = filas.index(ultimaFilaSeleccionada);

                        // Determinar el rango de filas a seleccionar
                        var inicio = Math.min(indexActual, indexUltima);
                        var fin = Math.max(indexActual, indexUltima);

                        // Seleccionar todas las filas en el rango
                        filas.slice(inicio, fin + 1).each(function () {
                            if (!filasSeleccionadas.includes(this)) {
                                filasSeleccionadas.push(this);
                                $(this).addClass('selected');
                                $('td', this).addClass('selected');
                            }
                        });
                    } else {
                        // Si no se presiona Ctrl/Cmd ni Shift, selecciona solo esta fila
                        filasSeleccionadas = [fila[0]]; // Reemplazamos la selección con la nueva fila
                        $('#grd_Insumos_Modal tbody tr').removeClass('selected');
                        $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
                        fila.addClass('selected');
                        $('td', fila).addClass('selected');
                    }

                    // Actualizar la última fila seleccionada
                    ultimaFilaSeleccionada = fila[0];
                });

                // Para asegurarnos de que las filas seleccionadas se mantengan consistentes con los eventos de Ctrl y Shift
                $('#grd_Insumos_Modal tbody').on('click', 'tr', function (event) {
                    var fila = $(this);
                    // Si se hace clic sin Shift ni Ctrl, actualizar la última fila seleccionada.
                    if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
                        ultimaFilaSeleccionada = fila[0];
                    }
                });

                // Cambiar el cursor cuando el mouse esté sobre la tabla
                $('body').on('mouseenter', '#grd_Insumos_Modal', function () {
                    $(this).css('cursor', 'pointer');
                });
            },
        });
    } else {
        if (data != null) {
            gridInsumosModal.clear().rows.add(data.$values).draw();
        }

        setTimeout(function () {
            gridInsumosModal.columns.adjust();
        }, 250);
    }
}


$('#ProductoModalCantidad').on('keyup', function () {
    // Obtener el color seleccionado
    var cantidad = $(this).val(); // El valor es el ID del color
   

    // Actualizar las celdas correspondientes en la tabla
    $('#grd_Insumos_Modal tbody tr').each(function () {
        var tr = $(this); // Referencia al <tr> actual

        // Obtener las celdas de "IdColor" (columna oculta) y "Color" (columna visible)
        var celdaCantidad = tr.find('td').eq(0); // Columna "IdColor" (índice 3, columna oculta)


        // Establecer el nuevo valor y el nuevo texto en las celdas
        celdaCantidad.text(cantidad); // Poner el ID del color en "IdColor"
        
    });
});

$('#Colores').on('change', function () {
    // Obtener el color seleccionado
    var idColorSeleccionado = $(this).val(); // El valor es el ID del color
    var colorSeleccionadoTexto = $('#Colores option:selected').text(); // El texto es el nombre del color

    // Actualizar las celdas correspondientes en la tabla
    $('#grd_Insumos_Modal tbody tr').each(function () {
        var tr = $(this); // Referencia al <tr> actual

        // Obtener las celdas de "IdColor" (columna oculta) y "Color" (columna visible)
        var celdaIdColor = tr.find('td').eq(4); // Columna "IdColor" (índice 3, columna oculta)
        var celdaColor = tr.find('td').eq(3); // Columna "Color" (índice 4, columna visible)

        // Establecer el nuevo valor y el nuevo texto en las celdas
        celdaIdColor.text(idColorSeleccionado); // Poner el ID del color en "IdColor"
        celdaColor.text(colorSeleccionadoTexto); // Poner el nombre del color en "Color"
    });
});




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
    listaColores();
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

    let totalInsumos = 0;

    insumosProducto.Insumos.$values.forEach(function (insumo) {
        totalInsumos += insumo.SubTotal;
    });

    var Producto = insumosProducto.Producto;


    var totalGanancia = totalInsumos * (Producto.PorcGanancia / 100);


    var totalConGanancia = totalInsumos + totalGanancia;
    var totalIva = totalConGanancia * (Producto.PorcIva / 100);

    

    document.getElementById("ProductoModalNombre").value = Producto.Nombre;
    document.getElementById("ProductoModalCategoria").value = Producto.Categoria;
    document.getElementById("ProductoModalCostoUnitario").value = formatNumber(totalInsumos);
    document.getElementById("ProductoModalPorcIva").value = Producto.PorcIva;
    document.getElementById("ProductoModalPorcGanancia").value = Producto.PorcGanancia;
    document.getElementById("ProductoModalIva").value = formatNumber(totalIva);
    document.getElementById("ProductoModalGanancia").value = formatNumber(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatNumber(Producto.CostoUnitario);






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
