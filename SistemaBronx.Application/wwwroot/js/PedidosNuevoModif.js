let gridProductos = null;
let gridInsumos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;
let isEditingProducto = false;
let filasSeleccionadas = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaInsumos = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaProductos = null; // Variable para almacenar la fila seleccionada
let facturaCliente = null;
const IdPedido = document.getElementById('IdPedido').value;

let cacheInsumosProducto = {};
let promesasInsumos = {};
let tokenCargaProducto = 0;
let timeoutSeleccionProducto = null;
let lastCantidadAFabricar = null;

$(document).ready(async function () {


    $('#txtNombreClienteModal').on('input', function () {
        validarCamposCliente()
    });

    $('#exitoModal, #ErrorModal, #AdvertenciaModal').on('shown.bs.modal', function () {
        $('.modal').css('z-index', 1057); // Baja el z-index de todos los modales
        $(this).css('z-index', 1058); // Sube el z-index solo del modal actual
    });

    $('#exitoModal, #ErrorModal, #AdvertenciaModal').on('hidden.bs.modal', function () {
        $(this).css('z-index', 1050); // Restaurar el z-index cuando se cierre
    });


    $("#Categorias, #Colores").select2({
        dropdownParent: $("#productoModal"), // Asegura que el dropdown se muestre dentro del modal
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });



    await listaColores();
    await listaClientes();
    await listaFormasdepago();




    if (parseInt(pedidoData) > 0) {
        await cargarDatosPedido(pedidoData);
    } else {
        document.getElementById("Fecha").value = moment().format('YYYY-MM-DD');
        configurarDataTableProductos(null);
        configurarDataTableInsumos(null);
        calcularDatosPedido();
    }

    $("#Clientes, #Formasdepago").select2({
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });





    $("#Categorias").on("change", function () {
        var textoSeleccionado = $(this).find("option:selected").text().toLowerCase().trim(); // Obtener el texto seleccionado de la lista de categorías

        // Si se selecciona "Todos", mostrar todas las filas
        if (textoSeleccionado === "todos") {
            $("#grd_Productos_Modal tbody tr").show(); // Muestra todas las filas
            // Eliminar mensaje de "No se encontraron resultados" si está presente
            $("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").remove();
        } else {
            // Filtrar las filas de la tabla
            var foundAny = false; // Variable para saber si encontramos al menos una coincidencia

            $("#grd_Productos_Modal tbody tr").each(function () {
                var categoriaTexto = $(this).find('td').eq(1).text().toLowerCase().trim(); // Ajusta el índice de la columna si es necesario
                if (categoriaTexto.indexOf(textoSeleccionado) > -1) {
                    $(this).show(); // Mostrar la fila si hay coincidencia
                    foundAny = true; // Marcamos que encontramos una coincidencia
                } else {
                    $(this).hide(); // Ocultar la fila si no hay coincidencia
                }
            });

            // Si no se encontró ninguna coincidencia, mostrar un mensaje o hacer algo
            if (!foundAny) {
                // Verificar si ya existe la fila de "No se encontraron resultados"
                if ($("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").length === 0) {
                    $("#grd_Productos_Modal tbody").append('<tr><td colspan="5" class="text-center">No hay datos disponibles en la tabla</td></tr>');
                }
            } else {
                // Si hay coincidencias, asegurarse de que cualquier mensaje previo sea eliminado
                $("#grd_Productos_Modal tbody tr:contains('No hay datos disponibles en la tabla')").remove();
            }
        }
    });



    $("#busqueda").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#grd_Productos_Modal tbody tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });





});

async function cargarDatosPedido(id) {
    $("#tituloPedido").text(`Editar Pedido ${id}`);
    const datosPedido = await ObtenerDatosPedido(id);
    await configurarDataTableProductos(datosPedido.PedidoDetalle);
    await configurarDataTableInsumos(datosPedido.PedidoDetalleProceso);
    await insertarDatosPedido(datosPedido);
   


}





async function insertarDatosPedido(datosPedido) {

    const pedido = datosPedido.pedido;
    if (!pedido) return;

    document.getElementById("IdPedido").value = pedido.Id;
    document.getElementById("Clientes").value = parseInt(pedido.IdCliente);
    document.getElementById("Telefono").value = pedido.Telefono;
    document.getElementById("Fecha").value = moment(pedido.Fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
    document.getElementById("Formasdepago").value = parseInt(pedido.IdFormaPago);
    document.getElementById("ImporteTotal").value = pedido.ImporteTotal;
    document.getElementById("PorcDesc").value = pedido.PorcDescuento;
    document.getElementById("SubTotal").value = pedido.SubTotal;
    document.getElementById("ImporteAbonado").value = pedido.ImporteAbonado;
    document.getElementById("Saldo").value = pedido.Saldo;
    document.getElementById("Comentarios").value = pedido.Comentarios ?? "";
    document.getElementById("Finalizado").checked = pedido.Finalizado === 1;

    // === NUEVO: facturado + nro de factura ===
    const fueFacturado = Number(pedido.Facturado) === 1;
    document.getElementById("Facturado").checked = fueFacturado;
    document.getElementById("NroFactura").value = pedido.NroFactura ?? "";
    if (typeof toggleFacturaGroup === "function") toggleFacturaGroup();

    // === NUEVO: costo financiero ===
    const cfPorc = parseFloat(pedido.CostoFinancieroPorc || 0);
    const cfTotal = parseFloat(pedido.CostoFinanciero || 0);

    const grpCFPorc = document.getElementById("grpCFPorc");
    const grpCFTotal = document.getElementById("grpCFTotal");
    const inputCFPorc = document.getElementById("CostoFinancieroPorc");
    const inputCFTotal = document.getElementById("CostoFinancieroTotal");

    // Limpio primero
    inputCFPorc.value = "";
    inputCFTotal.value = "";

    if (cfPorc > 0 || cfTotal > 0) {
        inputCFPorc.value = cfPorc.toString().replace('.', ',');
        inputCFTotal.value = formatNumber(cfTotal);

        grpCFPorc.classList.remove("d-none");
        grpCFTotal.classList.remove("d-none");
    } else {
        grpCFPorc.classList.add("d-none");
        grpCFTotal.classList.add("d-none");
    }

    // === Actualizo texto de botón ===
    document.getElementById("btnNuevoModificar").textContent = "Guardar";

    // === Recalculo ===
    await calcularDatosPedido();
}

async function listaEstadosFilter() {
    const url = `/PedidosEstados/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(x => ({
        Id: x.Id,
        Nombre: x.Nombre
    }));

}

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

    $('#Colores option').remove(); // Eliminar opciones existentes

    let select = document.getElementById("Colores");

    // Agregar opción "Seleccionar"
    let option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    select.appendChild(option);

    // Agregar opciones de colores
    for (let i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }

    // 🔹 Asegurar que el valor por defecto sea "-1"
    select.value = "-1";
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

    option = document.createElement("option");
    option.value = "-1"
    option.text = "Todos"
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }

}

function normalizarArrayDataTable(data) {
    if (data == null) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.$values)) return data.$values;
    return [];
}

function obtenerFilaProductoModalSeleccionadaData() {
    if (!filaSeleccionadaProductos || !gridProductosModal) return null;
    return gridProductosModal.row(filaSeleccionadaProductos).data();
}

function obtenerControlesStockProductoFilaSeleccionada() {
    if (!filaSeleccionadaProductos || !gridProductosModal) return null;

    const rowIndex = gridProductosModal.row(filaSeleccionadaProductos).index();
    if (rowIndex === undefined || rowIndex === null) return null;

    return {
        rowIndex: rowIndex,
        chk: $(`.chk-usa-stock-producto[data-row="${rowIndex}"]`),
        txt: $(`.txt-cantidad-stock-producto[data-row="${rowIndex}"]`)
    };
}

function sincronizarStockProductoSeleccionadoConCantidad() {
    const producto = obtenerFilaProductoModalSeleccionadaData();
    const controles = obtenerControlesStockProductoFilaSeleccionada();

    if (!producto || !controles) return;

    const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
    const stockDisponible = parseFloat(producto.Stock) || 0;

    controles.txt.attr('max', Math.min(stockDisponible, cantidadPedido));

    let valorActual = parseFloat(controles.txt.val()) || 0;

    if (valorActual > stockDisponible) valorActual = stockDisponible;
    if (valorActual > cantidadPedido) valorActual = cantidadPedido;
    if (valorActual < 0) valorActual = 0;

    controles.txt.val(valorActual);

    if (!controles.chk.is(':checked')) {
        controles.txt.prop('disabled', true);
        controles.txt.val(0);
    } else {
        controles.txt.prop('disabled', false);
    }
}

function recalcularInsumosPorCantidadProducto() {

    let cantidad = parseFloat($('#ProductoModalCantidad').val()) || 1;

    if (!gridInsumosModal) return;

    const rows = gridInsumosModal.rows();

    if (rows.data().length === 0) return;

    rows.every(function () {

        let rowData = this.data();

        rowData.Cantidad = Math.round((parseFloat(rowData.CantidadInicial || 0) * cantidad) * 100) / 100;
        rowData.SubTotal = Math.round((parseFloat(rowData.CostoUnitario || 0) * rowData.Cantidad) * 100) / 100;

        if (rowData.CantidadStock != null) {
            if (parseFloat(rowData.CantidadStock) > rowData.Cantidad) {
                rowData.CantidadStock = rowData.Cantidad;
            }
        }

        this.data(rowData); // ❌ SIN draw
    });

    gridInsumosModal.draw(false); // ✅ SOLO UNA VEZ

    calcularIVAyGanancia();
}
async function configurarDataTableProductosModal(data) {
    const dataFinal = normalizarArrayDataTable(data);

    if (gridProductosModal == null) {
        gridProductosModal = $('#grd_Productos_Modal').DataTable({
            data: dataFinal,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            paging: false,
            scrollX: true,
            scrollY: "400px",
            scrollCollapse: true,
            searching: false,
            ordering: false,
            columns: [
                { data: 'Nombre' },
                { data: 'Categoria' },
                {
                    data: 'Stock',
                    render: function (data, type, row) {
                        const stock = parseFloat(data) || 0;

                        if (stock <= 0) {
                            return `<span style="color:#dc3545;font-weight:bold">SIN STOCK</span>`;
                        }
                        if (stock < 5) {
                            return `<span style="color:#ffc107;font-weight:bold">${formatNumber(stock)}</span>`;
                        }

                        return `<span style="color:#28a745;font-weight:bold">${formatNumber(stock)}</span>`;
                    }
                },
                {
                    data: null,
                    render: function (data, type, row, meta) {
                        return `
                            <div class="form-check d-flex justify-content-center align-items-center m-0">
                                <input class="form-check-input chk-usa-stock-producto"
                                       type="checkbox"
                                       data-row="${meta.row}">
                            </div>
                        `;
                    }
                },
                {
                    data: null,
                    render: function (data, type, row, meta) {
                        return `
                            <input type="number"
                                   class="form-control form-control-sm txt-cantidad-stock-producto"
                                   data-row="${meta.row}"
                                   min="0"
                                   step="0.01"
                                   value="0"
                                   disabled>
                        `;
                    }
                },
                {
                    data: 'CostoUnitario',
                    render: function (data) {
                        const v = Math.ceil((Number(data) || 0) / 100) * 100;
                        return formatNumber(v);
                    }
                },
                { data: 'Id', visible: false }
            ],
            initComplete: function () {
                setTimeout(() => {
                    gridProductosModal.columns.adjust();
                }, 250);

                $('#grd_Productos_Modal tbody')
                    .off('click', 'input, .form-check-input')
                    .on('click', 'input, .form-check-input', function (e) {
                        e.stopPropagation();
                    });

                $('#grd_Productos_Modal tbody')
                    .off('click', 'tr')
                    .on('click', 'tr', function (e) {

                        if ($(e.target).closest('input, .form-check, .form-check-input').length) return;

                        clearTimeout(timeoutSeleccionProducto);

                        timeoutSeleccionProducto = setTimeout(async () => {

                            if (filaSeleccionadaProductos) {
                                $(filaSeleccionadaProductos).removeClass('selected');
                                $('td', filaSeleccionadaProductos).removeClass('selected');
                            }

                            const data = gridProductosModal.row(this).data();
                            if (!data) return;

                            // 🔥 SI ES EL MISMO PRODUCTO → NO HACER NADA
                            if (filaSeleccionadaProductos) {
                                const dataActual = gridProductosModal.row(filaSeleccionadaProductos).data();

                                if (dataActual && dataActual.Id === data.Id) {
                                    return;
                                }
                            }

                            filaSeleccionadaProductos = this;

                            $(this).addClass('selected');
                            $('td', this).addClass('selected');

                            if (!isEditingProducto) {
                                await cargarInformacionProducto(data.Id);
                            }

                        }, 120); // 🔥 ultra rápido pero evita spam
                    });

                $('#grd_Productos_Modal tbody')
                    .off('change', '.chk-usa-stock-producto')
                    .on('change', '.chk-usa-stock-producto', function () {

                        const rowIndex = parseInt($(this).attr('data-row'));
                        const rowData = gridProductosModal.row(rowIndex).data();
                        const input = $(`.txt-cantidad-stock-producto[data-row="${rowIndex}"]`);

                        const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
                        const stockDisponible = parseFloat(rowData.Stock) || 0;
                        const maximo = Math.min(stockDisponible, cantidadPedido > 0 ? cantidadPedido : stockDisponible);

                        if ($(this).is(':checked')) {
                            input.prop('disabled', false);
                            input.attr('max', maximo);
                        } else {
                            input.prop('disabled', true);
                            input.val(0);
                        }

                        controlarUsoStockInsumos();
                    });

                $('#grd_Productos_Modal tbody')
                    .off('input', '.txt-cantidad-stock-producto')
                    .on('input', '.txt-cantidad-stock-producto', function () {

                        const rowIndex = parseInt($(this).attr('data-row'));
                        const rowData = gridProductosModal.row(rowIndex).data();

                        if (!rowData) return;

                        const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
                        const stockDisponible = parseFloat(rowData.Stock) || 0;

                        let valor = parseFloat($(this).val()) || 0;

                        const maximo = Math.min(stockDisponible, cantidadPedido);

                        // 🔥 ACA ESTA LA MAGIA
                        if (valor < 0) valor = 0;
                        if (valor > maximo) valor = maximo;

                        $(this).val(valor);

                        const chk = $(`.chk-usa-stock-producto[data-row="${rowIndex}"]`);

                        // sincroniza check con el valor
                        if (valor > 0) {
                            chk.prop('checked', true);
                            $(this).prop('disabled', false);
                        } else {
                            chk.prop('checked', false);
                            $(this).prop('disabled', true);
                        }

                        controlarUsoStockInsumos();
                    });


                
               
            }
        });
    } else {
        gridProductosModal.clear().rows.add(dataFinal).draw();
        setTimeout(() => gridProductosModal.columns.adjust(), 250);
    }
}

async function configurarDataTableInsumosModal(data, editando) {
    const dataFinal = editando ? normalizarArrayDataTable(data) : normalizarArrayDataTable(data);

    if (gridInsumosModal == null) {
        gridInsumosModal = $('#grd_Insumos_Modal').DataTable({
            data: dataFinal,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            paging: false,
            scrollX: true,
            scrollY: "200px",
            scrollCollapse: true,
            searching: false,
            ordering: false,
            columns: [
                { data: 'Nombre' },
                { data: 'Cantidad' },
                {
                    data: 'Stock',
                    render: function (data, type, row) {
                      
                        const stock = parseFloat(row.Stock) || 0;
                        const usa = Number(row.UsaStock) === 1;
                        const cantidad = parseFloat(row.CantidadStock || 0);

                        if (usa && cantidad > 0) {
                            return `<span class="badge bg-success">USA STOCK</span>`;
                        }

                        if (stock <= 0) {
                            return `<span class="badge bg-danger">SIN STOCK</span>`;
                        }

                        

                        return `<span class="badge bg-secondary">NO USA</span>`;

                        
                    }
                },
                {
                    data: 'UsaStock',
                    render: function (data, type, row, meta) {

                        const stockReal = parseFloat(row.Stock ?? 0) || 0;

                        // 🔥 SOLO depende del stock real
                        const disabled = stockReal <= 0 ? 'disabled' : '';

                        // 🔥 checked correcto
                        const checked = Number(row.UsaStock) === 1 ? 'checked' : '';

                        return `
            <div class="form-check d-flex justify-content-center align-items-center m-0">
                <input class="form-check-input chk-usa-stock-insumo"
                       type="checkbox"
                       data-row="${meta.row}"
                       ${checked}
                       ${disabled}>
            </div>
        `;
                    }
                },
                {
                    data: 'CantidadStock',
                    render: function (data, type, row, meta) {
                        const stockDisponible = parseFloat(row.Stock ?? row.StockDisponible ?? 0) || 0;
                        const cantidad = parseFloat(row.Cantidad || 0) || 0;
                        const maximo = Math.min(stockDisponible, cantidad);
                        const disabled = Number(row.UsaStock) === 1 ? '' : 'disabled';

                        return `
                            <input type="number"
                                   class="form-control form-control-sm txt-cant-stock-insumo"
                                   data-row="${meta.row}"
                                   min="0"
                                   step="0.01"
                                   max="${maximo}"
                                   value="${parseFloat(data || 0) || 0}"
                                   ${disabled}>
                        `;
                    }
                },
                { data: 'CostoUnitario' },
                { data: 'SubTotal' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                { data: 'IdEstado', visible: false },
                { data: 'Estado' },
                { data: 'IdTipo', visible: false },
                { data: 'Tipo' },
                { data: 'Especificacion' },
                { data: 'Proveedor' },
                { data: 'Comentarios' },
                { data: 'IdUnidadMedida', visible: false },
                { data: 'IdProveedor', visible: false },
                { data: 'IdProducto', visible: false },
                { data: 'IdInsumo', visible: false },
                { data: 'Id', visible: false },
                { data: 'CantidadInicial', visible: false }
            ],
            columnDefs: [
                {
                    render: function (data) {
                        return formatNumber(data);
                    },
                    targets: [1, 5, 6]
                }
            ],
            initComplete: function () {
                setTimeout(function () {
                    gridInsumosModal.columns.adjust();
                }, 250);

                var ultimaFilaSeleccionada = null;

                $('#grd_Insumos_Modal tbody').off('click', 'tr').on('click', 'tr', function (event) {
                    if ($(event.target).is('input')) return;

                    var fila = $(this);
                    var ctrlPresionado = event.ctrlKey || event.metaKey;
                    var shiftPresionado = event.shiftKey;

                    if (ctrlPresionado) {
                        var index = filasSeleccionadas.indexOf(fila[0]);

                        if (index === -1) {
                            filasSeleccionadas.push(fila[0]);
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        } else {
                            filasSeleccionadas.splice(index, 1);
                            fila.removeClass('selected');
                            $('td', fila).removeClass('selected');
                        }
                    } else if (shiftPresionado && ultimaFilaSeleccionada) {
                        var filas = $('#grd_Insumos_Modal tbody tr');
                        var indexActual = filas.index(fila);
                        var indexUltima = filas.index(ultimaFilaSeleccionada);

                        var inicio = Math.min(indexActual, indexUltima);
                        var fin = Math.max(indexActual, indexUltima);

                        filas.slice(inicio, fin + 1).each(function () {
                            if (!filasSeleccionadas.includes(this)) {
                                filasSeleccionadas.push(this);
                                $(this).addClass('selected');
                                $('td', this).addClass('selected');
                            }
                        });
                    } else {
                        filasSeleccionadas = [fila[0]];
                        $('#grd_Insumos_Modal tbody tr').removeClass('selected');
                        $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
                        fila.addClass('selected');
                        $('td', fila).addClass('selected');
                    }

                    ultimaFilaSeleccionada = fila[0];
                });

                $('#grd_Insumos_Modal tbody')
                    .off('change', '.chk-usa-stock-insumo')
                    .on('change', '.chk-usa-stock-insumo', function () {

                        const rowIndex = parseInt($(this).attr('data-row'));
                        const rowData = gridInsumosModal.row(rowIndex).data();
                        const input = $(`.txt-cant-stock-insumo[data-row="${rowIndex}"]`);

                        const stockDisponible = parseFloat(rowData.Stock ?? rowData.StockDisponible ?? 0) || 0;

                        // 🔥 NUEVO
                        const cantidadAFabricar = obtenerCantidadAFabricar();
                        const cantidadPorUnidad = parseFloat(rowData.CantidadInicial || 0);

                        // 👉 CUÁNTO NECESITO REALMENTE
                        const cantidadNecesaria = cantidadPorUnidad * cantidadAFabricar;

                        const maximo = Math.min(stockDisponible, cantidadNecesaria);

                        // 🔴 SI NO HAY STOCK → BLOQUEAR TODO
                        if (stockDisponible <= 0) {
                            $(this).prop('checked', false);
                            $(this).prop('disabled', true);

                            input.val(0);
                            input.prop('disabled', true);

                            rowData.UsaStock = 0;
                            rowData.CantidadStock = 0;

                            gridInsumosModal.row(rowIndex).data(rowData).draw(false);
                            return;
                        }

                        rowData.UsaStock = $(this).is(':checked') ? 1 : 0;

                        if (rowData.UsaStock === 1) {
                            input.prop('disabled', false);
                            input.attr('max', maximo);
                        } else {
                            rowData.CantidadStock = 0;
                            input.prop('disabled', true);
                            input.val(0);
                        }

                        gridInsumosModal.row(rowIndex).data(rowData).draw(false);
                    });

                $('#grd_Insumos_Modal tbody')
                    .off('input', '.txt-cant-stock-insumo')
                    .on('input', '.txt-cant-stock-insumo', function () {

                        const rowIndex = parseInt($(this).attr('data-row'));
                        const rowData = gridInsumosModal.row(rowIndex).data();

                        const stockDisponible = parseFloat(rowData.Stock ?? rowData.StockDisponible ?? 0) || 0;

                        const cantidadAFabricar = obtenerCantidadAFabricar();
                        const cantidadPorUnidad = parseFloat(rowData.CantidadInicial || 0);

                        const cantidadNecesaria = cantidadPorUnidad * cantidadAFabricar;

                        const maximo = Math.min(stockDisponible, cantidadNecesaria);

                        let valor = parseFloat($(this).val()) || 0;

                        if (valor < 0) valor = 0;
                        if (valor > maximo) valor = maximo;

                        rowData.CantidadStock = valor;
                        rowData.UsaStock = valor > 0 ? 1 : 0;

                        $(this).val(valor);

                        gridInsumosModal.row(rowIndex).data(rowData).draw(false);
                    });

                $('#grd_Insumos_Modal tbody')
                    .off('dblclick', 'td')
                    .on('dblclick', 'td', async function () {
                        const cell = gridInsumosModal.cell(this);
                        if (!cell || cell.index() == null) return;

                        const colIndex = cell.index().column;
                        const dataSrc = getColumnDataSrc(gridInsumosModal, colIndex);
                        const originalData = cell.data();

                        // Solo permitimos editar estos campos
                        const editablesTexto = ['Cantidad', 'Especificacion', 'Comentarios'];
                        const editablesSelect = ['Color', 'Estado'];

                        if (![...editablesTexto, ...editablesSelect].includes(dataSrc)) {
                            return;
                        }

                        if (isEditing) return;
                        isEditing = true;

                        const $td = $(this);

                        if ($td.find('input').length > 0 || $td.find('select').length > 0) {
                            isEditing = false;
                            return;
                        }

                        const rowData = gridInsumosModal.row($td.closest('tr')).data();

                        async function saveEdit(newText, newValue) {
                            const filas = filasSeleccionadas.length > 0 ? filasSeleccionadas : [$td.closest('tr')[0]];

                            for (let i = 0; i < filas.length; i++) {
                                const rowElement = filas[i];
                                const row = gridInsumosModal.row($(rowElement));
                                const d = row.data();

                                if (dataSrc === 'Color') {
                                    d.IdColor = parseInt(newValue) || 0;
                                    d.Color = newText;
                                } else if (dataSrc === 'Estado') {
                                    d.IdEstado = parseInt(newValue) || 0;
                                    d.Estado = newText;
                                } else if (dataSrc === 'Cantidad') {
                                    const cantidad = parseFloat(newValue) || 0;
                                    d.Cantidad = cantidad;
                                    if (parseFloat(d.CantidadStock || 0) > cantidad) {
                                        d.CantidadStock = cantidad;
                                        d.UsaStock = cantidad > 0 ? d.UsaStock : 0;
                                    }
                                } else {
                                    d[dataSrc] = newText;
                                }

                                row.data(d);
                            }

                            gridInsumosModal.draw(false);

                            $(filas).removeClass('selected');
                            $(filas).find('td').removeClass('selected');
                            filasSeleccionadas = [];
                            isEditing = false;

                            controlarUsoStockInsumos();
                            calcularIVAyGanancia();
                        }

                        function cancelEdit() {
                            gridInsumosModal.cell(cell.index()).data(originalData).draw(false);
                            isEditing = false;
                        }

                        if (editablesSelect.includes(dataSrc)) {
                            const select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />');
                            $td.empty().append(select);

                            let result = [];
                            if (dataSrc === 'Color') {
                                result = await listaColoresFilter();
                                select.val(rowData.IdColor);
                            } else if (dataSrc === 'Estado') {
                                result = await listaEstadosFilter();
                                select.val(rowData.IdEstado);
                            }

                            result.forEach(r => {
                                select.append(`<option value="${r.Id}">${r.Nombre}</option>`);
                            });

                            if (dataSrc === 'Color') select.val(rowData.IdColor);
                            if (dataSrc === 'Estado') select.val(rowData.IdEstado);

                            const saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                                const selectedValue = select.val();
                                const selectedText = select.find('option:selected').text();
                                saveEdit(selectedText, selectedValue);
                            });

                            const cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);
                            $td.append(saveButton).append(cancelButton);
                            select.focus();
                        } else {
                            const input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                                .val(originalData)
                                .on('keydown', function (e) {
                                    if (e.key === 'Enter') {
                                        saveEdit(input.val(), input.val());
                                    } else if (e.key === 'Escape') {
                                        cancelEdit();
                                    }
                                });

                            const saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                                saveEdit(input.val(), input.val());
                            });

                            const cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                            $td.empty().append(input).append(saveButton).append(cancelButton);
                            input.focus();
                        }
                    });
            }
        });
    } else {
        gridInsumosModal.clear().rows.add(dataFinal).draw();
        setTimeout(function () {
            gridInsumosModal.columns.adjust();
        }, 350);
    }
}

let timeoutCantidadProducto = null;

$('#ProductoModalCantidad').off('keyup input').on('keyup input', function () {

    clearTimeout(timeoutCantidadProducto);

    timeoutCantidadProducto = setTimeout(() => {

        let cantidad = parseFloat($(this).val()) || 1;

        if (cantidad <= 0) {
            cantidad = 1;
            $(this).val(1);
        }

        // 🔥 1. RECALCULAR INSUMOS
        recalcularInsumosPorCantidadProducto();

        // 🔥 2. SINCRONIZAR STOCK PRODUCTO
        sincronizarStockProductoSeleccionadoConCantidad();

        // 🔥 3. CONTROLAR STOCK INSUMOS
        controlarUsoStockInsumosOptimizado();

    }, 150);
});
$('#Clientes').on('change', async function () {
    var IdCliente = document.getElementById("Clientes").value;
    await cargarDatosCliente(IdCliente);
});

async function cargarDatosCliente(idCliente) {
    const datosCliente = await ObtenerDatosCliente(idCliente);

    document.getElementById("Telefono").value = datosCliente.Telefono;
}

async function cargarDatosClienteRegistrado(idCliente) {
    const datosCliente = await ObtenerDatosCliente(idCliente);

    document.getElementById("Telefono").value = datosCliente.Telefono;
    $('#Clientes').val(datosCliente.Id).trigger('change');

}

$('#Colores').on('change', function () {
    // Obtener el color seleccionado

    // Verificar si hay filas en gridInsumosModal
    var filasEnGrid = gridInsumosModal.rows().data().length;

    // Si no hay filas en el grid, no hacer nada
    if (filasEnGrid === 0) {
        return; // Detener la ejecución si no hay filas
    }

    var idColorSeleccionado = $(this).val(); // El valor es el ID del color
    var colorSeleccionadoTexto = $('#Colores option:selected').text(); // El texto es el nombre del color

    // Verificar si hay filas seleccionadas
    if (filasSeleccionadas.length > 0) {
        // Si hay filas seleccionadas, actualizar solo esas
        filasSeleccionadas.forEach(function (fila) {
            var tr = $(fila); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Actualizar el objeto rowData
            rowData.Color = colorSeleccionadoTexto;  // Actualiza el color en rowData
            rowData.IdColor = idColorSeleccionado;  // Actualiza el ID del color

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    } else {
        // Si no hay filas seleccionadas, actualizar todas las filas
        $('#grd_Insumos_Modal tbody tr').each(function () {
            var tr = $(this); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Actualizar el objeto rowData
            rowData.Color = colorSeleccionadoTexto;  // Actualiza el color en rowData
            rowData.IdColor = idColorSeleccionado;  // Actualiza el ID del color

            // Actualizar la tabla con el nuevo rowData
            gridInsumosModal.row(tr).data(rowData).draw();
        });
    }
});

$('#btnEliminarInsumo').on('click', function () {
    // Verificar si hay filas seleccionadas
    if (filasSeleccionadas.length === 0) {
        alert("No tienes ninguna fila seleccionada.");
        return;
    }

    // Verificar cuántas filas están en la tabla
    var cantidadFilasTotales = gridInsumosModal.data().length;
    var cantidadFilasSeleccionadas = filasSeleccionadas.length;

    // Verificar si al eliminar las filas seleccionadas se quedaría con menos de una fila
    if (cantidadFilasTotales - cantidadFilasSeleccionadas < 1) {
        alert("No puedes eliminar todas las filas. Debe quedar al menos un insumo.");
        return;
    }

    // Confirmar eliminación
    var confirmacion = confirm("¿Deseas eliminar " + cantidadFilasSeleccionadas + " registro(s)?");

    if (confirmacion) {
        // Eliminar las filas seleccionadas
        filasSeleccionadas.forEach(function (fila) {
            var tr = $(fila); // Referencia al <tr> actual
            var rowData = gridInsumosModal.row(tr).data(); // Obtener los datos de la fila

            // Eliminar la fila de la tabla
            gridInsumosModal.row(tr).remove().draw();
        });

        // Limpiar el array de filas seleccionadas
        filasSeleccionadas = [];
    }
});

async function configurarDataTableProductos(data) {

    const dataFinal = normalizarArrayDataTable(data);

    if (gridProductos == null) {
        gridProductos = $('#grd_Productos').DataTable({
            data: dataFinal != null ? dataFinal : dataFinal,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            pageLength: 100,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'IdProducto', visible: false },
                { data: 'Nombre' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'Cantidad' },

                {
                    data: 'UsaStockProducto',
                    render: function (data, type, row) {

                        const stock = parseFloat(row.Stock) || 0;
                        const usa = Number(data) === 1;
                        const cantidad = parseFloat(row.CantidadStockProducto || 0);

                        if (stock <= 0) {
                            return `<span class="badge bg-danger">SIN STOCK</span>`;
                        }

                        if (usa && cantidad > 0) {
                            return `<span class="badge bg-success">USA STOCK</span>`;
                        }

                        return `<span class="badge bg-secondary">NO USA</span>`;
                    }
                },

                {
                    data: 'CantidadStockProducto',
                    render: function (data, type, row) {

                        const stock = parseFloat(row.Stock) || 0;

                        if (stock <= 0) {
                            return `<span style="color:#dc3545">0</span>`;
                        }

                        return `<span style="font-weight:bold">
                    ${data || 0}
                </span>`;
                    }
                },

                { data: 'PorcGanancia' },
                { data: 'Ganancia' },
                { data: 'PorcIva' },
                { data: 'IVA' },
                { data: 'PrecioVentaUnitario' },
                { data: 'PrecioVenta' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
                  <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(${JSON.stringify(row)})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${row.Id})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: false,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [8, 10, 11, 12] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();

                configurarOpcionesColumnasProductos();

                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                $('body').on('mouseenter', '#grd_Pedidos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {
        gridProductos.clear().rows.add(dataFinal).draw();
    }
}

async function configurarDataTableInsumos(data) {

    const dataFinal = normalizarArrayDataTable(data);

    if (gridInsumos == null) {
        gridInsumos = $('#grd_Insumos').DataTable({
            data: dataFinal != null ? dataFinal : dataFinal,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            pageLength: 100,
            searching: false, // 🔹 Esto oculta el campo de búsqueda
            columns: [
                { data: 'IdDetalle'},
                { data: 'IdProducto', visible: false },
                { data: 'Producto' },
                { data: 'Cantidad' },

                {
                    data: 'UsaStock',
                    render: function (data, type, row) {

                        const stock = parseFloat(row.CantidadStock ?? row.StockDisponible ?? 0) || 0;
                        const usa = Number(data) === 1;
                        const cantidadStock = parseFloat(row.CantidadStock || 0) || 0;

                        // 🔴 SIN STOCK REAL
                        if (stock <= 0) {
                            return `<span class="badge bg-danger">SIN STOCK</span>`;
                        }

                        // 🟢 USA STOCK REAL
                        if (usa && cantidadStock > 0) {
                            return `<span class="badge bg-success">USA STOCK</span>`;
                        }

                        // ⚪ NO USA STOCK
                        return `<span class="badge bg-secondary">NO USA</span>`;
                    }
                },
                {
                    data: 'CantidadStockInsumo',
                    render: function (data, type, row) {

                        const stock = parseFloat(row.CantidadStock ?? row.CantidadStock ?? 0) || 0;

                        // 🔴 SIN STOCK → BLOQUEADO
                        if (stock <= 0) {
                            return `<span style="color:#dc3545">0</span>`;
                        }

                        return `<span style="font-weight:bold">${stock}</span>`;
                    }
                },

                { data: 'PrecioUnitario' },
                { data: 'SubTotal' },
                { data: 'IdInsumo', visible: false },
                { data: 'Insumo' },
                { data: 'IdTipo', visible: false },
                { data: 'Tipo' },
                { data: 'IdCategoria', visible: false },
                { data: 'Categoria' },
                { data: 'IdColor', visible: false },
                { data: 'Color' },
                { data: 'Especificacion' },

                
                { data: 'Comentarios' },
                { data: 'IdEstado', visible: false },
                { data: 'Estado' },
                { data: 'Proveedor' },
                {
                    data: 'FechaActualizacion',
                    render: function (data) {
                        if (!data) return '-';
                        return new Date(data).toLocaleString('es-AR'); 
                    }
                },
                {
                    data: "Id",
                    render: function (data, type, row) {
                        return `
  <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarInsumo(${data})' title='Eliminar'>
      <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
  </button>`;
                    },
                    orderable: true,
                    searchable: true,
                }
            ],
            orderCellsTop: true,
            fixedHeader: false,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [6, 7] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                var api = this.api();


                $('.filters th').eq(0).html(''); // Limpiar la última columna si es necesario

                configurarOpcionesColumnasInsumos();

                var ultimaFilaSeleccionada = null;

                $('#grd_Insumos tbody').on('click', 'tr', function (event) {
                    var fila = $(this);

                    // Verificar si se está presionando Ctrl (o Cmd en Mac)
                    var ctrlPresionado = event.ctrlKey || event.metaKey; // Ctrl en Windows/Linux, Cmd en Mac
                    // Verificar si se está presionando Shift
                    var shiftPresionado = event.shiftKey;

                    if (ctrlPresionado) {
                        // Si se presiona Ctrl/Cmd, agregar o quitar la fila de la selección
                        var index = filaSeleccionadaInsumos.indexOf(fila[0]);

                        if (index === -1) {
                            // Si no está seleccionada, agregarla
                            filaSeleccionadaInsumos.push(fila[0]);
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        } else {
                            // Si ya está seleccionada, quitarla
                            filaSeleccionadaInsumos.splice(index, 1);
                            fila.removeClass('selected');
                            $('td', fila).removeClass('selected');
                        }
                    } else if (shiftPresionado && ultimaFilaSeleccionada) {
                        // Si se presiona Shift, seleccionar todas las filas entre la última fila seleccionada y la fila actual
                        var filas = $('#grd_Insumos tbody tr');
                        var indexActual = filas.index(fila);
                        var indexUltima = filas.index(ultimaFilaSeleccionada);

                        // Determinar el rango de filas a seleccionar
                        var inicio = Math.min(indexActual, indexUltima);
                        var fin = Math.max(indexActual, indexUltima);

                        // Seleccionar todas las filas en el rango
                        filas.slice(inicio, fin + 1).each(function () {
                            if (!filaSeleccionadaInsumos.includes(this)) {
                                filaSeleccionadaInsumos.push(this);
                                $(this).addClass('selected');
                                $('td', this).addClass('selected');
                            }
                        });
                    } else {
                        // ✅ Si NO se presiona Ctrl ni Shift, limpiar todo y seleccionar solo la nueva fila
                        if (!fila.hasClass('selected') || filaSeleccionadaInsumos.length == 1) {
                            filaSeleccionadaInsumos = [fila[0]]; // Reiniciar selección
                            $('#grd_Insumos tbody tr').removeClass('selected');
                            $('#grd_Insumos tbody tr td').removeClass('selected');
                            fila.addClass('selected');
                            $('td', fila).addClass('selected');
                        }

                    }

                    // Actualizar la última fila seleccionada
                    ultimaFilaSeleccionada = fila[0];
                });

                $('#grd_Insumos tbody')
                    .off('dblclick', 'td')
                    .on('dblclick', 'td', async function () {
                        const cell = gridInsumos.cell(this);
                        if (!cell || cell.index() == null) return;

                        const colIndex = cell.index().column;
                        const dataSrc = getColumnDataSrc(gridInsumos, colIndex);
                        const originalData = cell.data();

                        const editablesTexto = ['Cantidad', 'Especificacion', 'Comentarios'];
                        const editablesSelect = ['Color', 'Estado'];

                        if (![...editablesTexto, ...editablesSelect].includes(dataSrc)) {
                            return;
                        }

                        if (isEditing) return;
                        isEditing = true;

                        const $td = $(this);

                        if ($td.find('input').length > 0 || $td.find('select').length > 0) {
                            isEditing = false;
                            return;
                        }

                        async function saveEdit(newText, newValue) {
                            const filas = filaSeleccionadaInsumos.length > 0 ? filaSeleccionadaInsumos : [$td.closest('tr')[0]];

                            for (let i = 0; i < filas.length; i++) {
                                const rowElement = filas[i];
                                const row = gridInsumos.row($(rowElement));
                                const d = row.data();

                                if (dataSrc === 'Color') {
                                    d.IdColor = parseInt(newValue) || 0;
                                    d.Color = newText;
                                } else if (dataSrc === 'Estado') {
                                    d.IdEstado = parseInt(newValue) || 0;
                                    d.Estado = newText;
                                } else if (dataSrc === 'Cantidad') {
                                    const cantidad = parseFloat(newValue) || 0;
                                    d.Cantidad = cantidad;
                                    if (parseFloat(d.CantidadStock || 0) > cantidad) {
                                        d.CantidadStock = cantidad;
                                        d.UsaStock = cantidad > 0 ? d.UsaStock : 0;
                                    }
                                } else {
                                    d[dataSrc] = newText;
                                }

                                row.data(d);
                            }

                            gridInsumos.draw(false);

                            $(filas).removeClass('selected');
                            $(filas).find('td').removeClass('selected');
                            filaSeleccionadaInsumos = [];
                            isEditing = false;

                            calcularDatosPedido();
                        }

                        function cancelEdit() {
                            gridInsumos.cell(cell.index()).data(originalData).draw(false);
                            isEditing = false;
                        }

                        if (editablesSelect.includes(dataSrc)) {
                            const select = $('<select class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />');
                            $td.empty().append(select);

                            let result = [];
                            const rowData = gridInsumos.row($td.closest('tr')).data();

                            if (dataSrc === 'Color') {
                                result = await listaColoresFilter();
                            } else if (dataSrc === 'Estado') {
                                result = await listaEstadosFilter();
                            }

                            result.forEach(r => {
                                select.append(`<option value="${r.Id}">${r.Nombre}</option>`);
                            });

                            if (dataSrc === 'Color') select.val(rowData.IdColor);
                            if (dataSrc === 'Estado') select.val(rowData.IdEstado);

                            const saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                                saveEdit(select.find('option:selected').text(), select.val());
                            });

                            const cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                            $td.append(saveButton).append(cancelButton);
                            select.focus();
                        } else {
                            const input = $('<input type="text" class="form-control" style="background-color: transparent; border: none; border-bottom: 2px solid green; color: green; text-align: center;" />')
                                .val(originalData)
                                .on('keydown', function (e) {
                                    if (e.key === 'Enter') {
                                        saveEdit(input.val(), input.val());
                                    } else if (e.key === 'Escape') {
                                        cancelEdit();
                                    }
                                });

                            const saveButton = $('<i class="fa fa-check text-success"></i>').on('click', function () {
                                saveEdit(input.val(), input.val());
                            });

                            const cancelButton = $('<i class="fa fa-times text-danger"></i>').on('click', cancelEdit);

                            $td.empty().append(input).append(saveButton).append(cancelButton);
                            input.focus();
                        }
                    });

            },
        });

    } else {
        gridInsumos.clear().rows.add(dataFinal).draw();
    }
}

async function guardarProducto() {
    const IdProducto = document.getElementById('ProductoModalId').value;
    const IdProductoEditando = document.getElementById('ProductoEditandoModalId').value;
    const NombreProducto = document.getElementById('ProductoModalNombre').value;
    const IdCategoria = document.getElementById('ProductoModalIdCategoria').value;
    const Categoria = document.getElementById('ProductoModalCategoria').value;
    const CostoUnitario = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalCostoUnitario').value)) || 0;
    const PorcGanancia = document.getElementById('ProductoModalPorcGanancia').value;
    const Ganancia = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalGanancia').value)) || 0;
    const PorcIva = document.getElementById('ProductoModalPorcIva').value;
    const TotalIva = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalIva').value)) || 0;
    const PrecioVenta = parseFloat(convertirMonedaAFloat(document.getElementById('ProductoModalPrecioVenta').value)) || 0;
    const Cantidad = parseFloat(document.getElementById('ProductoModalCantidad').value) || 0;
    const SelectColor = document.getElementById('Colores');
    const Color = SelectColor != null ? SelectColor.options[SelectColor.selectedIndex].text : "";
    const IdColor = SelectColor != null ? SelectColor.value : 0;

    const detalleId = (Date.now() % 1000000) * 100 + Math.floor(Math.random() * 100);
    const editando = IdProductoEditando != "";

    if (NombreProducto == "" || !filaSeleccionadaProductos && !editando) {
        errorModal("Debes seleccionar un producto");
        return false;
    }

    if (Cantidad === "" || isNaN(Cantidad) || Cantidad <= 0) {
        errorModal("Escriba una cantidad valida.");
        return false;
    }

    if (!IdColor || IdColor == 0 || IdColor == -1) {
        errorModal("Debes seleccionar un color.");
        return false;
    }

    let stockDisponibleProducto = 0;
    let usaStockProducto = 0;
    let cantidadStockProducto = 0;

    if (filaSeleccionadaProductos) {
        const rowIndex = gridProductosModal.row(filaSeleccionadaProductos).index();
        const rowProducto = gridProductosModal.row(rowIndex).data();

        if (rowProducto) {
            stockDisponibleProducto = parseFloat(rowProducto.Stock) || 0;

            const chk = $(`.chk-usa-stock-producto[data-row="${rowIndex}"]`);
            const txt = $(`.txt-cantidad-stock-producto[data-row="${rowIndex}"]`);

            usaStockProducto = chk.is(':checked') ? 1 : 0;
            cantidadStockProducto = usaStockProducto ? (parseFloat(txt.val()) || 0) : 0;

            if (cantidadStockProducto > stockDisponibleProducto) {
                errorModal(`La cantidad a usar de stock no puede superar el stock disponible (${stockDisponibleProducto}).`);
                return false;
            }

            if (cantidadStockProducto > Cantidad) {
                errorModal(`La cantidad a usar de stock no puede superar la cantidad del producto (${Cantidad}).`);
                return false;
            }
        }
    }

    let colorValido = true;

    if (gridInsumosModal) {
        gridInsumosModal.rows().every(function () {
            let insumoData = this.data();
            if (!insumoData.IdColor || insumoData.IdColor == 0) {
                colorValido = false;
            }
        });
    }

    if (!colorValido) {
        errorModal("Uno de los insumos no tiene color.");
        return false;
    }

    if (gridInsumosModal) {
        let errorStockInsumo = false;

        gridInsumosModal.rows().every(function () {

            const insumoData = this.data();

            const usaStock = Number(insumoData.UsaStock) === 1;
            if (!usaStock) return; // 🔥 SI NO USA STOCK → IGNORAR

            const stockInsumo = parseFloat(insumoData.Stock ?? insumoData.StockDisponible ?? 0) || 0;
            const cantInsumo = parseFloat(insumoData.Cantidad || 0) || 0;
            const cantStockInsumo = parseFloat(insumoData.CantidadStock || 0) || 0;

            // 🔥 SOLO VALIDAMOS CUANDO USA STOCK
            if (cantStockInsumo > stockInsumo || cantStockInsumo > cantInsumo) {
                errorStockInsumo = true;
            }
        });

        if (errorStockInsumo) {
            errorModal("Uno o más insumos tienen una cantidad de stock inválida.");
            return false;
        }
    }
    if (editando) {
        gridProductos.rows().every(function () {
            const data = this.data();

            if (parseInt(data.Id) == parseInt(IdProductoEditando)) {
                data.Nombre = NombreProducto;
                data.IdProducto = IdProducto;
                data.IdCategoria = IdCategoria;
                data.Categoria = Categoria;
                data.CostoUnitario = CostoUnitario;
                data.PorcGanancia = PorcGanancia;
                data.PrecioVentaUnitario = Math.ceil((PrecioVenta / Cantidad) / 100) * 100;
                data.Ganancia = Ganancia;
                data.PorcIva = PorcIva;
                data.IVA = TotalIva;
                data.PrecioVenta = PrecioVenta;
                data.Cantidad = Cantidad;
                data.IdColor = IdColor;
                data.Color = Color;
                data.Stock = stockDisponibleProducto;
                data.UsaStockProducto = usaStockProducto;
                data.CantidadStockProducto = cantidadStockProducto;

                this.data(data).draw();
            }
        });

        gridInsumosModal.rows().every(function () {
            let insumoData = this.data();

            gridInsumos.rows().every(function () {
                let insumoDataInsumos = this.data();

                if (insumoDataInsumos.IdDetalle == parseInt(IdProductoEditando) && insumoDataInsumos.IdInsumo == insumoData.IdInsumo) {
                    insumoDataInsumos.Cantidad = insumoData.Cantidad;
                    insumoDataInsumos.CantidadInicial = insumoData.CantidadInicial ?? insumoData.Cantidad;
                    insumoDataInsumos.Comentarios = insumoData.Comentarios;
                    insumoDataInsumos.Especificacion = insumoData.Especificacion;
                    insumoDataInsumos.IdEstado = insumoData.IdEstado;
                    insumoDataInsumos.Estado = insumoData.Estado;
                    insumoDataInsumos.Color = insumoData.Color;
                    insumoDataInsumos.IdColor = insumoData.IdColor;
                    insumoDataInsumos.PrecioUnitario = insumoData.CostoUnitario;
                    insumoDataInsumos.SubTotal = insumoData.SubTotal;
                    insumoDataInsumos.Stock = insumoData.Stock ?? insumoData.StockDisponible ?? 0;
                    insumoDataInsumos.StockDisponible = insumoData.Stock ?? insumoData.StockDisponible ?? 0;
                    insumoDataInsumos.UsaStock = insumoData.UsaStock ? 1 : 0;
                    insumoDataInsumos.CantidadStock = parseFloat(insumoData.CantidadStock || 0) || 0;

                    this.data(insumoDataInsumos).draw();
                }
            });
        });

    } else {
        gridProductos.row.add({
            Id: detalleId,
            IdProducto: IdProducto,
            PrecioVentaUnitario: Math.ceil((PrecioVenta / Cantidad) / 100) * 100,
            Nombre: NombreProducto,
            IdCategoria: IdCategoria,
            Categoria: Categoria,
            CostoUnitario: CostoUnitario,
            PorcGanancia: PorcGanancia,
            Ganancia: Ganancia,
            PorcIva: PorcIva,
            IVA: TotalIva,
            PrecioVenta: PrecioVenta,
            Cantidad: Cantidad,
            IdColor: IdColor,
            Color: Color,
            Stock: stockDisponibleProducto,
            UsaStockProducto: usaStockProducto,
            CantidadStockProducto: cantidadStockProducto
        }).draw();

        gridInsumosModal.rows().every(function () {
            let insumoData = this.data();

            gridInsumos.row.add({
                IdDetalle: detalleId,
                Id: (Date.now() % 1000000) * 100 + Math.floor(Math.random() * 100),
                IdProducto: IdProducto,
                Producto: NombreProducto,
                Cantidad: insumoData.Cantidad,
                CantidadInicial: insumoData.CantidadInicial ?? insumoData.Cantidad,
                IdInsumo: insumoData.IdInsumo,
                Insumo: insumoData.Nombre,
                PrecioVentaUnitario: Math.ceil(((insumoData.PrecioVenta || 0) / (insumoData.Cantidad || 1)) / 100) * 100,
                IdTipo: insumoData.IdTipo,
                Tipo: insumoData.Tipo,
                IdCategoria: insumoData.IdCategoria,
                Categoria: insumoData.Categoria,
                IdColor: insumoData.IdColor,
                Color: insumoData.Color,
                Especificacion: insumoData.Especificacion,
                PrecioUnitario: insumoData.CostoUnitario,
                SubTotal: insumoData.SubTotal,
                Comentarios: insumoData.Comentarios,
                IdEstado: insumoData.IdEstado,
                Estado: insumoData.Estado,
                IdProveedor: insumoData.IdProveedor,
                Proveedor: insumoData.Proveedor,
                IdUnidadMedida: insumoData.IdUnidadMedida,
                Stock: insumoData.Stock ?? insumoData.StockDisponible ?? 0,
                StockDisponible: insumoData.Stock ?? insumoData.StockDisponible ?? 0,
                UsaStock: insumoData.UsaStock ? 1 : 0,
                CantidadStock: parseFloat(insumoData.CantidadStock || 0) || 0
            }).draw();
        });
    }

    await limpiarInformacionProducto();
    $('#Colores').val('-1').trigger('change');
    $('#productoModal').modal('hide');
    calcularDatosPedido();

    return true;
}

async function cargarDatosProductoModal() {

    await limpiarInformacionProducto();
    await listaCategorias();


    const datosProducto = await ObtenerDatosProductoModal();

    // Ahora se cargan los datos filtrados (productos que no están en gridProductos)
    configurarDataTableProductosModal(datosProducto);
}


async function ObtenerDatosCliente(id) {
    const url = `/Clientes/EditarInfo?Id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
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

async function limpiarInformacionProducto() {
    filasSeleccionadas = [];
    filaSeleccionadaProductos = null;

    if (gridInsumosModal != null) {
        gridInsumosModal.clear().draw();
    }

    document.getElementById("ProductoModalId").value = "";
    document.getElementById("ProductoEditandoModalId").value = "";
    document.getElementById("ProductoModalNombre").value = "";
    document.getElementById("ProductoModalCantidad").value = "";
    document.getElementById("ProductoModalCategoria").value = "";
    document.getElementById("ProductoModalIdCategoria").value = "";
    document.getElementById("ProductoModalCostoUnitario").value = "";
    document.getElementById("ProductoModalPorcIva").value = "";
    document.getElementById("ProductoModalPorcGanancia").value = "";
    document.getElementById("ProductoModalIva").value = "";
    document.getElementById("ProductoModalGanancia").value = "";
    document.getElementById("ProductoModalPrecioVenta").value = "";

    $('#grd_Productos_Modal tbody tr').removeClass('selected');
    $('#grd_Productos_Modal tbody tr td').removeClass('selected');

    $('#grd_Productos_Modal .chk-usa-stock-producto').prop('checked', false);
    $('#grd_Productos_Modal .txt-cantidad-stock-producto').val(0).prop('disabled', true);

    filasSeleccionadas = [];
    ultimaFilaSeleccionada = null;
}

async function cargarInformacionProducto(id) {
    const miToken = ++tokenCargaProducto;

    try {
        let data = null;

        if (cacheInsumosProducto[id]) {
            data = cacheInsumosProducto[id];
        } else {
            if (!promesasInsumos[id]) {
                promesasInsumos[id] = ObtenerInsumosProducto(id);
            }

            data = await promesasInsumos[id];
            cacheInsumosProducto[id] = data;
            delete promesasInsumos[id];
        }

        // Si mientras esperaba se seleccionó otro producto, no pises el modal
        if (miToken !== tokenCargaProducto) return;

        procesarProducto(data);
    } catch (error) {
        delete promesasInsumos[id];
        console.error("Error cargando insumos del producto:", error);
        errorModal("No se pudieron cargar los insumos del producto.");
    }
}

function procesarProducto(insumosProducto) {
    if (!insumosProducto) return;

    const insumos = normalizarArrayDataTable(insumosProducto.Insumos).map(i => ({
        ...i,
        Stock: getStockDisponibleFila(i),
        StockDisponible: getStockDisponibleFila(i),
        Cantidad: parseFloat(i.Cantidad || 0) || 0,
        CantidadInicial: parseFloat(i.CantidadInicial ?? i.Cantidad ?? 0) || 0,
        CantidadStock: parseFloat(i.CantidadStock || 0) || 0,
        UsaStock: Number(i.UsaStock) === 1 ? 1 : 0
    }));

    if (gridInsumosModal == null) {
        configurarDataTableInsumosModal(insumos, false);
    } else {
        const dt = gridInsumosModal;

        // si cambia cantidad de filas → recién ahí rebuild
        if (dt.rows().count() !== insumos.length) {
            dt.clear().rows.add(insumos).draw(false);
        } else {
            dt.rows().every(function (i) {
                this.data(insumos[i]);
            });
            dt.draw(false);
        }
    }

    let totalInsumos = 0;
    insumos.forEach(i => {
        totalInsumos += parseFloat(i.SubTotal || 0) || 0;
    });

    const producto = insumosProducto.Producto || {};

    const porcGanancia = parseFloat(producto.PorcGanancia || 0) || 0;
    const porcIva = parseFloat(producto.PorcIva || 0) || 0;

    const totalGanancia = totalInsumos * (porcGanancia / 100);
    const totalConGanancia = totalInsumos + totalGanancia;
    const totalIva = totalConGanancia * (porcIva / 100);

    document.getElementById("ProductoModalId").value = producto.Id ?? "";
    document.getElementById("ProductoModalNombre").value = producto.Nombre ?? "";
    document.getElementById("ProductoModalIdCategoria").value = producto.IdCategoria ?? "";
    document.getElementById("ProductoModalCategoria").value = producto.Categoria ?? "";
    document.getElementById("ProductoModalCostoUnitario").value = formatNumber(totalInsumos);
    document.getElementById("ProductoModalPorcIva").value = porcIva;
    document.getElementById("ProductoModalPorcGanancia").value = porcGanancia;
    document.getElementById("ProductoModalIva").value = formatNumber(totalIva);
    document.getElementById("ProductoModalGanancia").value = formatNumber(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatNumber(
        Math.ceil((parseFloat(producto.CostoUnitario || 0)) / 100) * 100
    );

    controlarUsoStockInsumosOptimizado();
}

document.getElementById("ProductoModalPorcIva").addEventListener("input", calcularIVAyGanancia);
document.getElementById("ProductoModalPorcGanancia").addEventListener("input", calcularIVAyGanancia);

function calcularIVAyGanancia() {
    // Obtener valores y asegurarse de que sean números
    const totalInsumos = parseFloat(convertirMonedaAFloat(document.getElementById("ProductoModalCostoUnitario").value));
    const porcIVA = parseFloat(document.getElementById("ProductoModalPorcIva").value) || 0;
    const porcGanancia = parseFloat(document.getElementById("ProductoModalPorcGanancia").value) || 0;
    const cantidad = parseFloat(document.getElementById("ProductoModalCantidad").value) || 1;

    // Calcular la ganancia por producto
    const gananciaUnitario = totalInsumos * (porcGanancia / 100);

    // Calcular el total de ganancia para la cantidad
    const totalGanancia = gananciaUnitario * cantidad;

    // Calcular el precio con ganancia por unidad
    const totalConGananciaUnitario = totalInsumos + gananciaUnitario;

    // Calcular el IVA por unidad
    const totalIVAUnitario = totalConGananciaUnitario * (porcIVA / 100);

    // Calcular el total de IVA para la cantidad
    const totalIVA = totalIVAUnitario * cantidad;

    // Calcular costo total para la cantidad (incluyendo insumos, ganancia e IVA)
    const costoTotal = Math.ceil((totalInsumos + gananciaUnitario + totalIVAUnitario) / 100) * 100 * cantidad;


    // Mostrar resultados formateados
    document.getElementById("ProductoModalIva").value = formatoMoneda.format(totalIVA);
    document.getElementById("ProductoModalGanancia").value = formatoMoneda.format(totalGanancia);
    document.getElementById("ProductoModalPrecioVenta").value = formatoMoneda.format(Math.ceil(costoTotal / 100) * 100);

}


let productoSeleccionado = null;

function mostrarSoloProductoEnEdicion(producto) {

    if (!producto) return;

    // 🔥 importante: SIEMPRE array
    const data = [producto];

    if (gridProductos == null) {
        configurarDataTableProductos(data);
    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}

async function editarProducto(producto) {

    if (!producto) return;

    isEditing = true;
    isEditingProducto = true;

    // =========================================================
    // 1) CARGAS BASE
    // =========================================================
    await listaCategorias();
   

    // =========================================================
    // 2) TRAER PRODUCTO REAL DESDE BACKEND (🔥 FIX STOCK)
    // =========================================================
    const productos = await ObtenerDatosProductoModal();

    const productoReal = productos.find(p =>
        parseInt(p.Id) === parseInt(producto.IdProducto)
    );

    const stockReal = parseFloat(
        productoReal?.Stock ?? productoReal?.StockDisponible ?? 0
    ) || 0;

    // =========================================================
    // 3) ARMAR PRODUCTO PARA MODAL
    // =========================================================
    const productoSoloModal = {
        Id: parseInt(producto.IdProducto), // 👈 ID REAL
        Nombre: producto.Nombre,
        Categoria: producto.Categoria,
        IdCategoria: producto.IdCategoria,
        CostoUnitario: producto.CostoUnitario,

        // 🔥 STOCK REAL
        Stock: stockReal,

        IdProducto: parseInt(producto.IdProducto),
        IdColor: producto.IdColor,
        Color: producto.Color,
        PorcGanancia: producto.PorcGanancia,
        Ganancia: producto.Ganancia,
        PorcIva: producto.PorcIva,
        IVA: producto.IVA,
        PrecioVenta: producto.PrecioVenta,
        PrecioVentaUnitario: producto.PrecioVentaUnitario,
        Cantidad: producto.Cantidad,
        UsaStockProducto: producto.UsaStockProducto,
        CantidadStockProducto: parseFloat(producto.CantidadStockProducto || 0) || 0
    };

    // =========================================================
    // 4) CARGAR PRODUCTO EN MODAL
    // =========================================================
    await configurarDataTableProductosModal([productoSoloModal]);

    // =========================================================
    // 5) OBTENER INSUMOS DEL GRID PRINCIPAL
    // =========================================================
    let insumosData = [];

    if (gridInsumos) {
        insumosData = gridInsumos
            .rows()
            .data()
            .toArray()
            .filter(row =>
                parseInt(row.IdDetalle) === parseInt(producto.Id)
            );
    }

    // =========================================================
    // 6) TRANSFORMAR INSUMOS PARA MODAL
    // =========================================================
    const transformedData = insumosData.map(row => ({

        Nombre: row.Insumo,
        Cantidad: row.Cantidad,
        CantidadInicial: row.CantidadInicial ?? row.Cantidad,

        CostoUnitario: row.PrecioUnitario,
        SubTotal: row.SubTotal,

        IdCategoria: row.IdCategoria,
        Categoria: row.Categoria,

        IdColor: row.IdColor,
        Color: row.Color,

        IdEstado: row.IdEstado,
        Estado: row.Estado,

        IdTipo: row.IdTipo,
        Tipo: row.Tipo,

        Especificacion: row.Especificacion,
        Comentarios: row.Comentarios,

        IdUnidadMedida: row.IdUnidadMedida,
        IdProveedor: row.IdProveedor,
        Proveedor: row.Proveedor,

        Id: row.Id,
        IdProducto: row.IdProducto,
        IdInsumo: row.IdInsumo,

        // 🔥 STOCK CORRECTO
        Stock: parseFloat(row.Stock ?? row.StockDisponible ?? 0) || 0,
        StockDisponible: parseFloat(row.Stock ?? row.StockDisponible ?? 0) || 0,

        UsaStock: row.UsaStock === true || Number(row.UsaStock) === 1 ? 1 : 0,
        CantidadStock: parseFloat(row.CantidadStock || 0) || 0
    }));

    // =========================================================
    // 7) SETEAR FORMULARIO
    // =========================================================
    $('#ProductoEditandoModalId').val(producto.Id); // 👈 ID DETALLE
    $('#ProductoModalId').val(producto.IdProducto);

    $('#ProductoModalNombre').val(producto.Nombre);
    $('#ProductoModalIdCategoria').val(producto.IdCategoria);
    $('#ProductoModalCategoria').val(producto.Categoria);

    $('#ProductoModalCostoUnitario').val(formatNumber(producto.CostoUnitario));
    $('#ProductoModalPorcGanancia').val(producto.PorcGanancia);
    $('#ProductoModalGanancia').val(formatNumber(producto.Ganancia));

    $('#ProductoModalPorcIva').val(producto.PorcIva);
    $('#ProductoModalIva').val(formatNumber(producto.IVA));

    $('#ProductoModalPrecioVenta').val(formatNumber(producto.PrecioVenta));
    $('#ProductoModalCantidad').val(producto.Cantidad);

    // =========================================================
    // 8) CARGAR INSUMOS EN MODAL
    // =========================================================
    await configurarDataTableInsumosModal(transformedData, true);

    // =========================================================
    // 9) SETEAR COLOR
    // =========================================================
    $('#Colores')
        .val(parseInt(producto.IdColor) || -1)
        .trigger('change');

    // =========================================================
    // 10) LIMPIAR SELECCIÓN
    // =========================================================
    filaSeleccionadaProductos = null;

    if (gridProductosModal) {
        const filasModal = gridProductosModal.rows().nodes().to$();
        filasModal.removeClass('selected');
        filasModal.find('td').removeClass('selected');
    }

    // =========================================================
    // 11) SELECCIONAR PRODUCTO EN MODAL
    // =========================================================
    let filaEncontrada = null;

    if (gridProductosModal) {
        gridProductosModal.rows().every(function () {
            const d = this.data();

            if (parseInt(d.Id) === parseInt(producto.IdProducto)) {
                filaEncontrada = this.node();
            }
        });
    }

    // =========================================================
    // 12) APLICAR STOCK PRODUCTO
    // =========================================================
    if (filaEncontrada) {

        filaSeleccionadaProductos = filaEncontrada;

        $(filaEncontrada).addClass('selected');
        $('td', filaEncontrada).addClass('selected');

        const $fila = $(filaEncontrada);

        const chk = $fila.find('.chk-usa-stock-producto');
        const txt = $fila.find('.txt-cantidad-stock-producto');
        const usaStock =
            producto.UsaStockProducto === true ||
            Number(producto.UsaStockProducto) === 1 ||
            parseFloat(producto.CantidadStockProducto || 0) > 0;

        chk.prop('checked', usaStock);
        txt.prop('disabled', !usaStock);
        txt.val(parseFloat(producto.CantidadStockProducto || 0) || 0);

        sincronizarStockProductoSeleccionadoConCantidad();
    }

    // =========================================================
    // 13) UI MODAL
    // =========================================================
    $("#productoModal .modal-title").text("Editar Producto");
    $("#btnGuardarProducto").html(`<i class="fa fa-check me-1"></i> Guardar`);

    $('#productoModal .modal-dialog').css({
        'max-width': '100%',
        'width': '70%'
    });

    // =========================================================
    // 14) ABRIR MODAL
    // =========================================================
    $("#productoModal").modal('show');
}
async function anadirProducto() {
    isEditingProducto = false;
    $("#productoModal .modal-title").text("Añadir Producto");
    $("#btnGuardarProducto").html(`<i class="fa fa-check me-1"></i> Añadir`);

    $('#productoModal .modal-dialog').css({
        'max-width': '100%',
        'width': '70%'
    });

    document.getElementById('ProductoEditandoModalId').value = "";

    await cargarDatosProductoModal();
    await limpiarInformacionProducto();
    await configurarDataTableInsumosModal([], false);

    if (gridInsumosModal != null) {
        gridInsumosModal.clear().draw();
    }

    $("#productoModal").modal('show');
}
let formasPagoCache = {}; // { [id]: { Id, Nombre, CostoFinanciero } }

async function listaFormasdepago() {
    const url = `/Formasdepago/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    const $sel = $('#Formasdepago');
    $sel.empty();

    // placeholder
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.text = "Forma de pago";
    $sel.append(opt0);

    for (let i = 0; i < data.length; i++) {
        const fp = data[i]; // { Id, Nombre, CostoFinanciero? }
        formasPagoCache[fp.Id] = fp;

        const opt = document.createElement("option");
        opt.value = fp.Id;
        opt.text = fp.Nombre;
        // Guardamos el CF en dataset (por si se quiere leer directo del DOM)
        if (fp.CostoFinanciero != null) opt.dataset.cf = fp.CostoFinanciero;
        $sel.append(opt);
    }
}


async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    select = document.getElementById("Clientes");

    option = document.createElement("option");
    option.value = -1;
    option.text = "Seleccionar";
    select.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);

    }
}

function eliminarProducto(id) {
    let rowsProductos = gridProductos.rows().indexes().toArray().reverse();
    let rowsInsumos = gridInsumos.rows().indexes().toArray().reverse();

    rowsProductos.forEach(rowIdx => {
        let data = gridProductos.row(rowIdx).data();
        if (data != null && data.Id == id) {
            gridProductos.row(rowIdx).remove();
        }
    });
    gridProductos.draw();

    rowsInsumos.forEach(rowIdx => {
        let data = gridInsumos.row(rowIdx).data();
        if (data != null && data.IdDetalle == id) {
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw();

    calcularDatosPedido();
}


function eliminarInsumo(Id) {
    var idDetalle = 0;
    // Eliminar el insumo con el Id correspondiente
    gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {


        const data = this.data();
        if (data != null && data.Id == Id) {
            idDetalle = data.IdDetalle;
            gridInsumos.row(rowIdx).remove();
        }
    });
    gridInsumos.draw(); // Redibujar después de eliminar insumo

    // Verificar si quedan insumos para ese producto
    let tieneInsumos = false;

    gridInsumos.rows().every(function (rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data.IdDetalle == idDetalle) {
            tieneInsumos = true;
            return false; // Salimos del loop si encontramos al menos un insumo
        }
    });

    // Si el producto ya no tiene insumos, eliminarlo
    if (!tieneInsumos) {
        gridProductos.rows().every(function (rowIdx, tableLoop, rowLoop) {
            const data = this.data();
            if (data && data.Id == idDetalle) {
                gridProductos.row(rowIdx).remove();
            }
        });
        gridProductos.draw();
    }
}


$('a[data-bs-toggle="tab"]').on('shown.bs.tab', function () {
    if ($.fn.DataTable.isDataTable('#grd_Productos')) {
        $('#grd_Productos').DataTable().columns.adjust().draw();
    }
    if ($.fn.DataTable.isDataTable('#grd_Insumos')) {
        $('#grd_Insumos').DataTable().columns.adjust().draw();
    }
});

function configurarOpcionesColumnasProductos() {
    const grid = $('#grd_Productos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenuProductos'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Pedidos_Productos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && !col.data.includes("Id")) { // Solo agregar columnas que no sean "Id"
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

function configurarOpcionesColumnasInsumos() {
    const grid = $('#grd_Insumos').DataTable(); // Accede al objeto DataTable utilizando el id de la tabla
    const columnas = grid.settings().init().columns; // Obtiene la configuración de columnas
    const container = $('#configColumnasMenuInsumos'); // El contenedor del dropdown específico para configurar columnas


    const storageKey = `Pedidos_Insumos_Columnas`; // Clave única para esta pantalla

    const savedConfig = JSON.parse(localStorage.getItem(storageKey)) || {}; // Recupera configuración guardada o inicializa vacía

    container.empty(); // Limpia el contenedor

    columnas.forEach((col, index) => {
        if (col.data && (!col.data.includes("Id") || col.data == "IdDetalle")) { // Solo agregar columnas que no sean "Id"
            // Recupera el valor guardado en localStorage, si existe. Si no, inicializa en 'false' para no estar marcado.
            const isChecked = savedConfig && savedConfig[`col_${index}`] !== undefined ? savedConfig[`col_${index}`] : true;

            // Asegúrate de que la columna esté visible si el valor es 'true'
            grid.column(index).visible(isChecked);

            const columnName = col.data == "IdDetalle" ? "Detalle" : col.data;

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

function calcularDatosPedido() {
    let importeTotal = 0;
    let porcDesc = parseFloat(document.getElementById("PorcDesc").value) || 0;
    let importeAbonado = parseFloat(convertirMonedaAFloat(document.getElementById("ImporteAbonado").value)) || 0;
    let descuento = 0;
    let subTotal = 0;
    let saldo = 0;

    if (gridProductos && gridProductos.rows().count() > 0) {
        gridProductos.rows().every(function () {
            const data = this.data();
            if (data && data.PrecioVenta) {
                importeTotal += parseFloat(data.PrecioVenta) || 0;
            }
        });
    }

    descuento = (importeTotal * porcDesc) / 100;
    subTotal = importeTotal - descuento;
    saldo = subTotal - importeAbonado;

    document.getElementById("ImporteTotal").value = formatNumber(importeTotal);
    document.getElementById("ImporteAbonado").value = formatNumber(importeAbonado);
    document.getElementById("Descuento").value = formatNumber(descuento);
    document.getElementById("SubTotal").value = formatNumber(subTotal);
    document.getElementById("Saldo").value = formatNumber(saldo);

}


document.getElementById("PorcDesc").addEventListener("blur", calcularDatosPedido);

document.getElementById("ImporteAbonado").addEventListener("blur", function () {
    let rawValue = this.value.trim();

    // Verificamos si ya tiene el formato correcto (p. ej. $12.800,00)
    if (!rawValue.includes('$') && !rawValue.includes(',')) {
        // Si no tiene símbolo de moneda ni coma decimal, formateamos el valor
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(parsedValue);
    } else {
        // Si ya tiene formato, no tocamos el valor
        // Solo nos aseguramos de que sea un número válido para la operación
        rawValue = rawValue.replace(/[^\d,\.]/g, ''); // Eliminar caracteres no numéricos, excepto coma y punto
        let parsedValue = parseFloat(rawValue.replace('.', '').replace(',', '.')) || 0;
        this.value = formatNumber(formatearSinMiles(rawValue));
    }
    calcularDatosPedido(); // Recalcular los datos
});


async function ObtenerDatosPedido(id) {
    const url = `/Pedidos/ObtenerDatosPedido?idPedido=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}


async function guardarCambios(redirecciona = true) {
    const NAV_DEST_KEY = '__NAV_DEST_POST_SAVE__';

    try {
        const idPedido = $("#IdPedido").val();

        if (!isValidPedido()) return false;

        await calcularDatosPedido();

        // =========================================================
        // 🔥 PRODUCTOS (FIX STOCK REAL)
        // =========================================================
        function obtenerProductos() {
            const productos = [];

            gridProductos.rows().every(function () {
                const p = this.data();

                const cantidadStock = parseFloat(p.CantidadStockProducto || 0) || 0;

                productos.push({
                    "Id": p.Id,
                    "IdProducto": parseInt(p.IdProducto),
                    "IdCategoria": parseInt(p.IdCategoria),
                    "CostoUnitario": parseFloat(p.CostoUnitario),
                    "Cantidad": parseFloat(p.Cantidad),
                    "PorcGanancia": parseFloat(p.PorcGanancia),
                    "Ganancia": parseFloat(p.Ganancia),
                    "PorcIva": parseFloat(p.PorcIva),
                    "IVA": parseFloat(p.IVA),
                    "PrecioVenta": parseFloat(p.PrecioVenta),
                    "IdColor": parseInt(p.IdColor),
                    "Producto": p.Nombre,

                    // 🔥 CLAVE
                    "CantidadUsadaStock": cantidadStock,
                    "UsaStockProducto": cantidadStock > 0
                });
            });

            return productos;
        }

        // =========================================================
        // 🔥 INSUMOS (FIX STOCK REAL)
        // =========================================================
        function obtenerInsumos() {
            const insumos = [];
            let invalido = false;

            gridInsumos.rows().every(function () {
                const i = this.data();

                if (!i.IdColor || i.IdColor === 0) {
                    invalido = true;
                }

                const cantidad = parseFloat(i.Cantidad || 0) || 0;
                const stockDisponible = parseFloat(i.Stock ?? i.StockDisponible ?? 0) || 0;

                const cantidadStock = parseFloat(i.CantidadStock || 0) || 0;
                const usaStock = cantidadStock > 0;

                if (cantidadStock > stockDisponible || cantidadStock > cantidad) {
                    invalido = true;
                }

                insumos.push({
                    "Id": idPedido !== "" ? i.Id : 0,
                    "IdProducto": parseInt(i.IdProducto),
                    "IdInsumo": parseInt(i.IdInsumo),
                    "IdCategoria": parseInt(i.IdCategoria),
                    "PrecioUnitario": parseFloat(i.PrecioUnitario),
                    "Cantidad": cantidad,
                    "SubTotal": parseFloat(i.SubTotal),
                    "IdColor": parseInt(i.IdColor),
                    "IdTipo": parseInt(i.IdTipo),
                    "IdEstado": parseInt(i.IdEstado),
                    "IdDetalle": parseInt(i.IdDetalle),
                    "IdProveedor": parseInt(i.IdProveedor),
                    "IdUnidadMedida": parseInt(i.IdUnidadMedida),
                    "Especificacion": i.Especificacion,
                    "Comentarios": i.Comentarios,

                    // 🔥 CLAVE
                    "CantidadUsadaStock": cantidadStock,
                    "UsaStock": usaStock
                });
            });

            if (invalido) {
                if (typeof errorModal === 'function')
                    errorModal("Hay insumos con color faltante o stock inválido.");
                else
                    alert("Hay insumos con color faltante o stock inválido.");

                return null;
            }

            return insumos;
        }

        const productos = obtenerProductos();
        const insumos = obtenerInsumos();

        if (!insumos) return false;

        // =========================================================
        // 🔥 MODELO FINAL
        // =========================================================
        const nuevoModelo = {
            "Id": idPedido !== "" ? parseInt(idPedido) : 0,
            "Fecha": moment($("#Fecha").val(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
            "IdCliente": parseInt($("#Clientes").val()),
            "IdFormaPago": parseInt($("#Formasdepago").val()),
            "ImporteAbonado": parseFloat(convertirMonedaAFloat($("#ImporteAbonado").val())),
            "ImporteTotal": parseFloat(convertirMonedaAFloat($("#ImporteTotal").val())),
            "SubTotal": parseFloat(convertirMonedaAFloat($("#SubTotal").val())),
            "PorcDescuento": parseFloat($("#PorcDesc").val()),
            "Saldo": parseFloat(convertirMonedaAFloat($("#Saldo").val())),
            "Comentarios": $("#Comentarios").val(),
            "Finalizado": $("#Finalizado").prop('checked') ? 1 : 0,
            "Facturado": $("#Facturado").prop('checked') ? 1 : 0,
            "NroFactura": $("#NroFactura").val(),
            "CostoFinancieroPorc": parseFloat($("#CostoFinancieroPorc").val()) || 0,
            "CostoFinanciero": parseFloat(convertirMonedaAFloat($("#CostoFinancieroTotal").val()) || 0),

            // 🔥 CLAVE
            "PedidosDetalles": productos,
            "PedidosDetalleProcesos": insumos
        };

        // =========================================================
        // 🔥 REQUEST
        // =========================================================
        const url = idPedido === "" ? "/Pedidos/Insertar" : "/Pedidos/Actualizar";
        const method = idPedido === "" ? "POST" : "PUT";

        const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(nuevoModelo)
        });

        if (!resp.ok) {
            let raw = "";
            let payload = null;

            try {
                raw = await resp.text();
            } catch { }

            if (raw) {
                payload = intentarParsearJson(raw) || raw;
            }

            const msg = construirMensajeErrorServidor(
                payload,
                `Error ${resp.status} - ${resp.statusText}`
            );

            if (typeof errorModalHtml === 'function') errorModalHtml(msg);
            else alert(typeof payload === "string" ? payload : `Error ${resp.status} - ${resp.statusText}`);

            return false;
        }

        const dataJson = await resp.json();

        let ok = true;
        let serverMessage = null;

        if (typeof dataJson === 'object' && dataJson !== null) {
            if ('ok' in dataJson) ok = !!dataJson.ok;
            else if ('success' in dataJson) ok = !!dataJson.success;
            else if ('exito' in dataJson) ok = !!dataJson.exito;
            else if ('valor' in dataJson) ok = Number(dataJson.valor) > 0;
            else if ('error' in dataJson) ok = !dataJson.error;

            serverMessage = dataJson.mensaje || dataJson.message || dataJson.errorMessage || null;
        } else {
            ok = Boolean(dataJson);
        }

        if (!ok) {
            const msg = serverMessage || 'No se pudo guardar el pedido.';
            if (typeof errorModal === 'function') errorModal(msg);
            else alert(msg);
            return false;
        }

        const mensajeOk = serverMessage ||
            (idPedido === "" ? "Pedido registrado correctamente" : "Pedido modificado correctamente");

        if (typeof exitoModal === 'function') exitoModal(mensajeOk);

        const destinoGuard = sessionStorage.getItem(NAV_DEST_KEY);

        if (destinoGuard) {
            sessionStorage.removeItem(NAV_DEST_KEY);
            setTimeout(() => { window.location.assign(destinoGuard); }, 150);
            return true;
        }

        if (redirecciona) {
            if (localStorage.getItem("RedireccionFabricaciones") == 1) {
                window.location.href = "../../Fabricaciones";
                localStorage.removeItem("RedireccionFabricaciones");
            } else {
                window.location.href = "/Pedidos";
            }
        }

        return true;

    } catch (error) {
        console.error('Error en guardarCambios:', error);

        const msg = (error && error.message)
            ? error.message
            : 'Ocurrió un error al guardar el pedido.';

        if (typeof errorModal === 'function') errorModal(msg);
        else alert(msg);

        return false;
    }
}



function isValidPedido() {
    var cantidadFilas = $('#grd_Productos').DataTable().rows().count();
    var saldo = parseFloat(convertirMonedaAFloat($("#Saldo").val())) || 0;
    const IdCliente = document.getElementById('Clientes').value;

    if (IdCliente == -1) {
        errorModal("Para crear un pedido, debes seleccionar un cliente.");
        return false;
    }

    if (cantidadFilas <= 0) {
        errorModal('No puedes guardar un pedido sin productos.');
        return false;
    }

    if (saldo < 0) {
        errorModal('No puedes tener un saldo negativo');
        return false;
    }

    let errorStockProducto = false;

    gridProductos.rows().every(function () {
        const p = this.data();

        const cantidad = parseFloat(p.Cantidad || 0) || 0;
        const stockDisponible = parseFloat(p.Stock || 0) || 0;
        const usaStockProducto = Number(p.UsaStockProducto || 0) === 1;
        const cantidadStockProducto = usaStockProducto ? (parseFloat(p.CantidadStockProducto || 0) || 0) : 0;

        if (cantidadStockProducto > stockDisponible || cantidadStockProducto > cantidad) {
            errorStockProducto = true;
        }
    });

    if (errorStockProducto) {
        errorModal("Uno o más productos tienen una cantidad de stock inválida.");
        return false;
    }

    let errorStockInsumo = false;

    gridInsumos.rows().every(function () {
        const i = this.data();

        const cantidad = parseFloat(i.Cantidad || 0) || 0;
        const stockDisponible = parseFloat(i.Stock ?? i.StockDisponible ?? 0) || 0;
        const usaStock = Number(i.UsaStock || 0) === 1;
        const cantidadStock = usaStock ? (parseFloat(i.CantidadStock || 0) || 0) : 0;

        if (cantidadStock > stockDisponible || cantidadStock > cantidad) {
            errorStockInsumo = true;
        }

        if (!i.IdColor || i.IdColor == 0) {
            errorStockInsumo = true;
        }
    });

    if (errorStockInsumo) {
        errorModal("Uno o más insumos tienen color faltante o una cantidad de stock inválida.");
        return false;
    }

    return true;
}

function nuevoCliente() {
    limpiarModalCliente();
    listaProvincias();
    $('#modalEdicionCliente').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Cliente");
    $('#lblNombreClienteModal').css('color', 'red');
    $('#txtNombreClienteModal').css('border-color', 'red');
}

function limpiarModalCliente() {
    const campos = ["IdClienteModal", "NombreClienteModal", "TelefonoClienteModal", "DireccionClienteModal", "IdProvinciaClienteModal", "LocalidadClienteModal", "DniClienteModal"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}


async function listaProvincias() {
    const url = `/Clientes/ListaProvincias`;
    const response = await fetch(url);
    const data = await response.json();

    $('#ProvinciasClienteModal option').remove();

    selectProvincias = document.getElementById("ProvinciasClienteModal");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function guardarCambiosCliente() {
    if (validarCamposCliente()) {
        const idCliente = $("#txtIdClienteModal").val();
        const nuevoModelo = {
            "Id": idCliente !== "" ? idCliente : 0,
            "Nombre": $("#txtNombreClienteModal").val(),
            "Telefono": $("#txtTelefonoClienteModal").val(),
            "Direccion": $("#txtDireccionClienteModal").val(),
            "IdProvincia": $("#ProvinciasClienteModal").val(),
            "Localidad": $("#txtLocalidadClienteModal").val(),
            "DNI": $("#txtDniClienteModal").val()
        };

        const url = "/Clientes/Insertar";
        const method = "POST";

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
            .then(async dataJson => {
                if (dataJson.valor > 0) {
                    const mensaje = "Cliente registrado correctamente";
                    $('#modalEdicionCliente').modal('hide');
                    exitoModal(mensaje);
                    await listaClientes();
                    cargarDatosClienteRegistrado(dataJson.valor)
                } else {
                    errorModal("Ha ocurrido un error al registrar el cliente.")
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function validarCamposCliente() {
    const nombre = $("#txtNombreClienteModal").val();
    const camposValidos = nombre !== "";

    $("#lblNombreClienteModal").css("color", camposValidos ? "" : "red");
    $("#txtNombreClienteModal").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}



let tipoExportacionPDF = "minorista";

$(document).on("change", "input[name='tipoExportacion']", function () {
    tipoExportacionPDF = this.value;
});

function abrirModalExportarPedido() {

    tipoExportacionActual = "Pedido";

    const modal = new bootstrap.Modal(
        document.getElementById('modalExportarPedido')
    );

    modal.show();
}

function exportarPedidoTipo(tipo) {

    const modalEl = document.getElementById('modalExportarPedido');
    const modal = bootstrap.Modal.getInstance(modalEl);

    modal.hide();

    generarPedidoPDFSeleccionado(tipo);
}

function exportarPedidoTipo(tipo) {

    const modalEl = document.getElementById('modalExportarPedido');
    const modal = bootstrap.Modal.getInstance(modalEl);

    modal.hide();

    switch (tipoExportacionActual) {

        case "Pedido":
            generarPedidoPDFSeleccionado(tipo);
            break;

        case "remito":
            generarRemitoPDFSeleccionado(tipo);
            break;

        default:
            console.warn("Tipo de exportación no definido");
            generarPedidoPDFSeleccionado(tipo);
            break;
    }
}

function generarDatosPedidoPDF() {

    // Validaciones mínimas como tu flujo (para no abrir modal al pedo)
    const idCliente = $("#Clientes").val();
    const cantidadFilasTotales = gridProductos?.data()?.length ?? 0;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un Pedido debes seleccionar un cliente.");
        return;
    }

    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un Pedido sin al menos un producto.");
        return;

        const formaPago = ($("#Formasdepago").select2("data")[0]?.text || "").toLowerCase();

        if (formaPago.includes("transfer")) {
            abrirModalExportarPedido();
            return;
        }

        generarPedidoPDFSeleccionado("minorista");
    }
}

function generarPedidoPDFSeleccionado(tipoCliente) {

    let cliente = $("#Clientes").select2("data")[0].text
    let formaPago = $("#Formasdepago").select2("data")[0].text
    let idCliente = $("#Clientes").val();

    var cantidadFilasTotales = gridProductos.data().length;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un Pedido debes seleccionar un cliente.");
        return;
    }

    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un remito sin al menos un producto.");
        return;
    }

    var datosPedidoJson =
    {
        IdPedido: document.getElementById("IdPedido").value,
        Cliente: cliente,
        Fecha: document.getElementById("Fecha").value,
        ImporteTotal: document.getElementById("ImporteTotal").value,
        PorcDesc: document.getElementById("PorcDesc").value,
        Descuento: document.getElementById("Descuento").value,
        SubTotal: document.getElementById("SubTotal").value,
        ImporteAbonado: document.getElementById("ImporteAbonado").value,
        Telefono: document.getElementById("Telefono").value,
        Saldo: document.getElementById("Saldo").value,
        FormaPago: formaPago
    };

    var productos = [];
    gridProductos.rows().every(function () {
        productos.push(this.data());
    });

    var datos = {
        Pedido: datosPedidoJson,
        Productos: productos,
        TipoCliente: tipoCliente   // ✅ SOLO AGREGAMOS ESTO
    };

    factura = generarPedidoPDF(datos);
    facturaCliente = cliente;
    descargarPedidoPDF(datos, factura);
}

async function generarPedidoPDF(datos) {

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
    });

    /* =====================================================
       CONFIG CLIENTE / IVA
    ===================================================== */

    const tipoCliente = (datos.TipoCliente || "minorista").toLowerCase();
    const formaPago = (datos.Pedido.FormaPago || "").toLowerCase();

    let ivaPorcentaje = 0;

    if (formaPago.includes("transfer")) {
        ivaPorcentaje = (tipoCliente === "mayorista") ? 21 : 72;
    }

    const esMayorista = tipoCliente === "mayorista" && ivaPorcentaje > 0;
    const esEfectivo = formaPago.includes("efectivo");

    /* =====================================================
       LOGOS
    ===================================================== */

    const logo1El = document.getElementById('logoImpresion1');
    const logo2El = document.getElementById('logoImpresion2');

    const [logo1, logo2] = await Promise.all([
        imgToDataURL(logo1El, 'image/jpeg'),
        imgToDataURL(logo2El, 'image/jpeg')
    ]);

    doc.addImage(logo1, 'JPEG', 14, 8, 50, 20);
    doc.addImage(logo2, 'JPEG', 155, 2, 65, 35);

    doc.setFont('Helvetica', 'normal');

    /* =====================================================
       HEADER IZQUIERDA
    ===================================================== */

    doc.setFontSize(8);
    doc.text("SANTA ROSA 3755, VICENTE LÓPEZ,", 14, 37);
    doc.text("BUENOS AIRES, ARGENTINA.", 14, 41);
    doc.text("+541165075229", 14, 45);
    doc.text("HOLA@BRONXCONCEPT.COM.AR", 14, 49);

    /* =====================================================
       HEADER CENTRO
    ===================================================== */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NINCHICH SRL", 90, 37);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("CUIT: 30-71743646-2", 90, 41);
    doc.text("IIBB: 30-71743646-2", 90, 45);
    doc.text("Inicio Act: 09/03/2022", 90, 49);

    /* =====================================================
       HEADER DERECHA
    ===================================================== */

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("DOCUMENTO NO VÁLIDO COMO FACTURA", 120, 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Pedido", 155, 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text("N", 160, 27);
    doc.text(`${datos.Pedido.IdPedido}`, 165, 27);

    /* =====================================================
       DATOS CLIENTE
    ===================================================== */

    doc.setFontSize(8);
    doc.text(`Nombre: ${datos.Pedido.Cliente}`, 150, 37);
    doc.text(`Teléfono: ${datos.Pedido.Telefono}`, 150, 41);
    doc.text(`Fecha: ${moment(datos.Pedido.Fecha).format("DD/MM/YYYY")}`, 150, 45);


    const columns = ["C", "Producto", "Color", "Precio", "Subtotal"];

    const rows = datos.Productos.map(item => {

        let precioUnitario = item.PrecioVenta / item.Cantidad;
        let subtotal = item.PrecioVenta;

        if (esMayorista) {
            precioUnitario = precioUnitario / (1 + ivaPorcentaje / 100);
            subtotal = subtotal / (1 + ivaPorcentaje / 100);
        }

        return [
            item.Cantidad,
            item.Nombre,
            item.Color,
            formatNumber(precioUnitario),
            formatNumber(subtotal)
        ];
    });

    doc.autoTable({
        startY: 55,
        head: [columns],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 55 },
            2: { cellWidth: 55 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 }
        }
    });

    let y = doc.lastAutoTable.finalY + 10;
    const boxX = 14;
    const boxY = y - 5;
    const boxWidth = 180;
    const lineHeight = 7;

    let totalLineas = esMayorista ? 4 : 4;

    const boxHeight = (totalLineas * lineHeight) + 10;

    doc.rect(boxX, boxY, boxWidth, boxHeight);

    let subtotalSinIVA = 0;

    datos.Productos.forEach(p => {

        let valor = Number(p.PrecioVenta) || 0;

        if (esMayorista) {
            valor = valor / (1 + ivaPorcentaje / 100);
        }

        subtotalSinIVA += valor;
    });

    const ivaTotal = subtotalSinIVA * (ivaPorcentaje / 100);
    const totalConIVA = subtotalSinIVA + ivaTotal;

    doc.setFontSize(10);

    doc.setFontSize(10);

    if (esMayorista) {

        /* ===============================
           DESGLOSE MAYORISTA (SIN BOLD)
        =============================== */

        doc.text("Importe total (sin IVA):", boxX + 100, y);
        doc.text(formatNumber(subtotalSinIVA), boxX + 145, y, { align: "right" });

        doc.text(`IVA`, boxX + 100, y + 7);
        doc.text(formatNumber(ivaTotal), boxX + 145, y + 7, { align: "right" });

        doc.text("TOTAL (con IVA):", boxX + 100, y + 14);
        doc.text(formatNumber(totalConIVA), boxX + 145, y + 14, { align: "right" });

        /* ===============================
           BLOQUE ORIGINAL (DESDE ABAJO)
        =============================== */

        const labels = [
            "Importe abonado :",
            "Saldo:"
        ];

        const valores = [
            datos.Pedido.ImporteAbonado,
            datos.Pedido.Saldo
        ];

        labels.forEach((label, i) => {
            const yPos = y + 21 + (i * 7);
            doc.text(label, boxX + 100, yPos);
            doc.text(valores[i], boxX + 145, yPos, { align: "right" });
        });

    }
    else {

        const labels = [
            esEfectivo ? "Importe total:" : "Importe total  (Incluye IVA 21%):",
            "Descuento %:",
            "Importe total",
            "Importe abonado :",
            "Saldo:"
        ];

        const valores = [
            datos.Pedido.ImporteTotal,
            `${datos.Pedido.PorcDesc}%`,
            datos.Pedido.SubTotal,
            datos.Pedido.ImporteAbonado,
            datos.Pedido.Saldo
        ];

        labels.forEach((label, i) => {
            const yPos = y + i * 7;
            doc.text(label, boxX + 100, yPos);
            doc.text(valores[i], boxX + 153, yPos, { align: "right" });
        });
    }

    const pxsmayormenor = esMayorista ? 10 : 10;

    const pieY = boxY + boxHeight + pxsmayormenor;

    doc.setFontSize(9);
    doc.text(`WWW.BRONXCONCEPT.COM.AR`, 15, pieY);

    doc.setFontSize(11);
    doc.text(`BRONXCONCEPT®`, 160, pieY);
    doc.text(`2024`, 186, pieY + 5);

    return doc;
}

async function descargarPedidoPDF(datos) {
    const doc = await generarPedidoPDF(datos);

    let file = "";

    const nro = datos.Pedido.IdPedido ? `Nº ${datos.Pedido.IdPedido} ` : '';

    if (datos.Pedido.FormaPago.includes("Tarjeta")) {
        file = sanitizeFileName(`TJ - Pedido ${nro}Cliente ${datos.Pedido.Cliente} ${fmtMoneda(datos.Pedido.SubTotal)}.pdf`);
    } else {
        file = sanitizeFileName(`Pedido ${nro}Cliente ${datos.Pedido.Cliente} ${fmtMoneda(datos.Pedido.SubTotal)}.pdf`);
    }


    doc.save(file);
}

function generarDatosPedidoPDF() {

    // Validaciones mínimas como tu flujo (para no abrir modal al pedo)
    const idCliente = $("#Clientes").val();
    const cantidadFilasTotales = gridProductos?.data()?.length ?? 0;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un Pedido debes seleccionar un cliente.");
        return;
    }


    if (cantidadFilasTotales > 18) {
        errorModal("No puedes exportar el remito: supera el límite de 18 productos.");
        return;
    }


    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un Pedido sin al menos un producto.");
        return;
    }

    // Detectar forma de pago
    const formaPago = ($("#Formasdepago").select2("data")[0]?.text || "").toLowerCase();

    // ✅ SOLO si es transferencia → modal
    if (formaPago.includes("transfer")) {
        abrirModalExportarPedido();
        return;
    }

    // ✅ Si NO es transferencia → exporta directo
    // Elegí tu default: "minorista" (o el que quieras)
    generarPedidoPDFSeleccionado("minorista");
}

function generarDatosRemitoPDF() {

    const idCliente = $("#Clientes").val();
    const cantidadFilasTotales = gridProductos?.data()?.length ?? 0;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un remito debes seleccionar un cliente.");
        return;
    }

    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un remito sin al menos un producto.");
        return;
    }

    const formaPago = ($("#Formasdepago").select2("data")[0]?.text || "").toLowerCase();

    /* =====================================
       IGUAL QUE Pedido PDF
    ===================================== */

    if (formaPago.includes("transfer")) {
        abrirModalExportarRemito();
        return;
    }

    generarRemitoPDFSeleccionado("minorista");
}

function abrirModalExportarRemito() {

    tipoExportacionActual = "remito";

    const modal = new bootstrap.Modal(
        document.getElementById('modalExportarPedido')
    );

    modal.show();
}

function exportarRemitoTipo(tipo) {

    const modalEl = document.getElementById('modalExportarPedido');
    const modal = bootstrap.Modal.getInstance(modalEl);

    modal.hide();

    generarRemitoPDFSeleccionado(tipo);
}

function generarRemitoPDFSeleccionado(tipoCliente) {

    let cliente = $("#Clientes").select2("data")[0].text;
    let formaPago = $("#Formasdepago").select2("data")[0].text;
    let idCliente = $("#Clientes").val();

    const cantidadFilasTotales = gridProductos.data().length;

    if (!idCliente || idCliente == '-1') {
        errorModal("Para imprimir un remito debes seleccionar un cliente.");
        return;
    }

    if (cantidadFilasTotales < 1) {
        errorModal("No puedes imprimir un remito sin al menos un producto.");
        return;
    }

    const datosPedidoJson = {
        IdPedido: document.getElementById("IdPedido").value,
        Cliente: cliente,
        Fecha: document.getElementById("Fecha").value,
        ImporteTotal: document.getElementById("ImporteTotal").value,
        PorcDesc: document.getElementById("PorcDesc").value,
        Descuento: document.getElementById("Descuento").value,
        SubTotal: document.getElementById("SubTotal").value,
        ImporteAbonado: document.getElementById("ImporteAbonado").value,
        Telefono: document.getElementById("Telefono").value,
        Saldo: document.getElementById("Saldo").value,
        FormaPago: formaPago
    };

    let productos = [];
    gridProductos.rows().every(function () {
        productos.push(this.data());
    });

    const datos = {
        Pedido: datosPedidoJson,
        Productos: productos,
        TipoCliente: tipoCliente
    };

    const factura = generarRemitoPDF(datos);
    facturaCliente = cliente;
    descargarRemitoPDF(datos, factura);
}

function generarRemitoPDF(datos) {

    const doc = new jsPDF();

    /* =====================================================
       CONFIG FISCAL (MISMO PDF)
    ===================================================== */

    const tipoCliente = (datos.TipoCliente || "minorista").toLowerCase();
    const formaPago = (datos.Pedido.FormaPago || "").toLowerCase();

    let ivaPorcentaje = 0;

    if (formaPago.includes("transfer")) {
        ivaPorcentaje = (tipoCliente === "mayorista") ? 21 : 72;
    }

    const esMayorista = tipoCliente === "mayorista" && ivaPorcentaje > 0;

    /* =====================================================
       HEADER
    ===================================================== */

    doc.setFontSize(8);
    doc.text(`${datos.Pedido.Cliente}`, 150, 37);
    doc.text(`${datos.Pedido.Telefono}`, 150, 41);
    doc.text(`${moment(datos.Pedido.Fecha, "YYYY-MM-DD").format("DD/MM/YYYY")}`, 150, 45);

    doc.setFontSize(13);
    doc.text(`${datos.Pedido.IdPedido}`, 165, 27);

    /* =====================================================
       TABLA PRODUCTOS
    ===================================================== */

    const columns = ["C", "Producto", "Color", "Precio", "Subtotal"];

    let rows = datos.Productos.map(item => {

        let precioUnitario = item.PrecioVenta / item.Cantidad;
        let subtotal = item.PrecioVenta;

        if (esMayorista) {
            precioUnitario /= (1 + ivaPorcentaje / 100);
            subtotal /= (1 + ivaPorcentaje / 100);
        }

        return [
            item.Cantidad,
            item.Nombre,
            item.Color,
            formatNumber(precioUnitario),
            formatNumber(subtotal)
        ];
    });

    while (rows.length < 18) {
        rows.push(["", "", "", "", ""]);
    }

    doc.autoTable({
        startY: 55,
        body: rows,
        styles: { fontSize: 10, lineWidth: 0 },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            halign: 'center'
        },
        bodyStyles: { fillColor: [255, 255, 255], lineWidth: 0 },
        alternateRowStyles: { fillColor: false },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 55 },
            2: { cellWidth: 55 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 }
        }
    });

    /* =====================================================
       CALCULOS (MISMO PDF)
    ===================================================== */

    let subtotalSinIVA = 0;

    datos.Productos.forEach(p => {
        let valor = Number(p.PrecioVenta) || 0;
        if (esMayorista)
            valor /= (1 + ivaPorcentaje / 100);

        subtotalSinIVA += valor;
    });

    const ivaTotal = subtotalSinIVA * (ivaPorcentaje / 100);
    const totalConIVA = subtotalSinIVA + ivaTotal;

    const abonado = Number(datos.Pedido.ImporteAbonado) || 0;
    const saldoMayorista = totalConIVA - abonado;

    /* =====================================================
       POSICION
    ===================================================== */

    let y = doc.lastAutoTable.finalY + 10;

    if (y + 60 > doc.internal.pageSize.height) {
        doc.addPage();
        y = 20;
    }

    const boxX = 14;

    /* =====================================================
       BLOQUE FINAL (COLUMNAS CORRECTAS)
    ===================================================== */

    let labels;
    let valores;

    if (esMayorista) {

        labels = [
            "Importe total (sin IVA):",
            "IVA:",
            "TOTAL (con IVA):",
            "Importe abonado:",
            "Saldo:"
        ];

        valores = [
            formatNumber(subtotalSinIVA),
            formatNumber(ivaTotal),
            formatNumber(totalConIVA),
            formatNumber(abonado),
            formatNumber(saldoMayorista)
        ];

    } else {

        labels = [
            "Importe total (incluye IVA):",
            "Descuento %:",
            "Importe total:",
            "Importe abonado:",
            "Saldo:"
        ];

        valores = [
            datos.Pedido.ImporteTotal,
            `${datos.Pedido.PorcDesc}%`,
            datos.Pedido.SubTotal,
            datos.Pedido.ImporteAbonado,
            datos.Pedido.Saldo
        ];
    }

    doc.setFontSize(10);

    labels.forEach((label, i) => {
        const yPos = y + i * 7;
        doc.text(valores[i], boxX + 145, yPos, { align: "right" });
    });

    return doc;
}

function descargarRemitoPDF(datos, facturaPDF) {

    let msjPedido = "";

    if (datos.Pedido.IdPedido == "") {
        msjPedido = ""
    } else {
        msjPedido = `Nº ${datos.Pedido.IdPedido} `
    }


    let titulo = "";

    if (datos.Pedido.FormaPago.includes("Tarjeta")) {
        titulo = `TJ - Remito ${msjPedido}Cliente ${facturaCliente} ${datos.Pedido.SubTotal}`
    } else {
        titulo = `Remito ${msjPedido}Cliente ${facturaCliente} ${datos.Pedido.SubTotal}`
    }


    facturaPDF.save(`${titulo}.pdf`);
}



function obtenerUrlCompleta(rutaRelativa) {
    const path = window.location.origin + rutaRelativa.replace("~", ""); // Construye la URL completa
    return path;
}



// Util: convierte <img> DOM a dataURL (evita problemas de CORS/transparencia)
async function imgToDataURL(imgEl, mime = 'image/png') {
    // si ya es dataURL, úsala
    if (imgEl?.src?.startsWith('data:')) return imgEl.src;

    // re-render a canvas para normalizar (quita alpha problemático)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgEl.src;
    await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // fondo blanco para eliminar alpha
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(mime, 0.92); // 92% para JPEG si lo cambiaras
}

function sanitizeFileName(name) {
    // evita : \ / * ? " < > | y también símbolos conflictivos
    return (name || '')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/[,$%]/g, '-')     // opcional: cambia $, , y % por guión
        .replace(/\s+/g, ' ')       // colapsa espacios
        .trim();
}

function fmtMoneda(v) {
    // asegura string (algunos visores fallan con floats en text())
    return typeof v === 'string' ? v : formatNumber(v ?? 0);
}



function toggleFacturaGroup() {
    const on = $("#Facturado").prop("checked");
    const $grp = $("#divNroFactura");
    const $nro = $("#NroFactura");
    if (on) { $grp.removeClass("d-none"); $nro.prop("disabled", false); }
    else { $grp.addClass("d-none"); $nro.val("").prop("disabled", true); }
}


$("#Facturado").prop("checked", false);
toggleFacturaGroup();
// Listener
$("#Facturado").on("change", toggleFacturaGroup);


// ====== NUEVO BLOQUE UI – pegalo en pedidosnuevomodif.js ======

function initNuevoModifUI() {
    // Select2 robusto para #Clientes y #Formasdepago (sin romper layout)
    initSelect2Dark('#Clientes');
    initSelect2Dark('#Formasdepago');

    // Set defaults de fecha si vienen vacías
    if (!$('#Fecha').val()) {
        $('#Fecha').val(moment().format('YYYY-MM-DD'));
    }

    // Si vino pedidoData (desde la vista)
    if (typeof pedidoData !== 'undefined' && pedidoData && pedidoData.Id) {
        $('#kpiNroPedido').text(pedidoData.Id);
        $('#tituloPedido').text('Pedido #' + pedidoData.Id);
    }

    // Vinculá KPIs con inputs (en vivo)
    bindKpisNuevoModif();

    // Si el estado de Facturado pide NroFactura
    $('#Facturado').on('change', function () {
        $('#divNroFactura').toggleClass('d-none', !this.checked);
    });
}

// Init Select2 oscuro con placeholder real y dropdownParent inteligente
function initSelect2Dark(selector) {
    const $ctl = $(selector);
    if (!$ctl.length) return;

    if ($ctl.data('select2')) $ctl.select2('destroy');
    if (!$ctl.find('option[value=""]').length) $ctl.prepend('<option value=""></option>');

    $ctl.select2({
        placeholder: 'Seleccionar',
        allowClear: true,
        width: '100%',
        dropdownParent: $('.container.page-99') // evita recortes
    });
}

// KPIs espejo de los campos del resumen
function bindKpisNuevoModif() {
    const refl = () => {
        const sub = $('#SubTotal').val() || '0';
        const porc = $('#PorcDesc').val() || '0';
        const tot = $('#ImporteTotal').val() || '0';
        $('#kpiSubTotal').text(sub);
        $('#kpiPorcDesc').text(porc);
        $('#kpiTotal').text(tot);
    };

    ['#SubTotal', '#PorcDesc', '#ImporteTotal'].forEach(id => {
        $(document).on('input change', id, refl);
    });

    // primer reflejo
    refl();
}

// Llamalo en tu ready existente:
$(document).ready(function () {

    localStorage.removeItem("Pedidos_Insumos_Columnas");

    try { initNuevoModifUI(); } catch (e) { console.error(e); }
});


$('#Formasdepago').on('change', function () {
    actualizarCostoFinanciero(); // toggle + cálculo
    calcularDatosPedido();       // re-calcula totales/saldo (y vuelve a reflejar CF)
});

$('#PorcDesc, #ImporteAbonado').on('blur', function () {
    calcularDatosPedido(); // para que CF se recalcule al cambiar descuentos/pagos
});


function getNumberFromInput(id) {
    // Soporta campos con formato moneda (cc-money)
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(convertirMonedaAFloat(el.value)) || 0;
}

function setMoney(id, value) {
    document.getElementById(id).value = formatNumber(value || 0);
}

function getSelectedFormaPagoCF() {
    const id = $('#Formasdepago').val();
    if (!id || !formasPagoCache[id]) return 0;
    const cf = formasPagoCache[id]?.CostoFinanciero;
    return (cf == null) ? 0 : parseFloat(cf);
}


function actualizarCostoFinanciero() {
    const cfPorc = getSelectedFormaPagoCF(); // porcentaje
    const $grpPorc = $('#grpCFPorc');
    const $grpTotal = $('#grpCFTotal');

    if (!cfPorc || cfPorc <= 0) {
        // ocultar y limpiar
        $grpPorc.addClass('d-none');
        $grpTotal.addClass('d-none');
        $('#CostoFinancieroPorc').val('');
        $('#CostoFinancieroTotal').val('');
        return;
    }

    // mostrar
    $grpPorc.removeClass('d-none');
    $grpTotal.removeClass('d-none');

    // Mostrar el % elegido
    $('#CostoFinancieroPorc').val(String(cfPorc).replace('.', ','));

    // Base del costo financiero: usamos el SubTotal (importeTotal - descuento)
    const subTotal = getNumberFromInput('SubTotal');

    // Costo financiero ($)
    const cfTotal = (subTotal * cfPorc) / 100.0;
    setMoney('CostoFinancieroTotal', cfTotal);

    // Ganancia total (sumamos la columna "Ganancia" de productos)
    let gananciaTotal = 0;
    if (gridProductos && gridProductos.rows().count() > 0) {
        gridProductos.rows().every(function () {
            const p = this.data();
            gananciaTotal += parseFloat(p.Ganancia) || 0;
        });
    }

}



function ceilToStep(value, step = 0.1) {
    const v = Number(value) || 0;
    const factor = 1 / step;
    // restamos un epsilon para no subir valores que ya son múltiplos exactos
    return Math.ceil((v - 1e-12) * factor) / factor;
}


function controlarUsoStockInsumos() {

    if (!gridInsumosModal) return;

    const cantidadProducto = parseFloat($('#ProductoModalCantidad').val()) || 0;

    const controles = obtenerControlesStockProductoFilaSeleccionada();
    if (!controles) return;

    const usaStockProducto = controles.chk.is(':checked');
    const cantidadStockProducto = usaStockProducto ? (parseFloat(controles.txt.val()) || 0) : 0;

    const cantidadAFabricar = Math.max(0, cantidadProducto - cantidadStockProducto);

    let cambios = false;

    gridInsumosModal.rows().every(function () {

        const rowData = this.data();

        const stockDisponible = parseFloat(rowData.Stock ?? rowData.StockDisponible ?? 0) || 0;
        const cantidadInicial = parseFloat(rowData.CantidadInicial || 0) || 0;

        const cantidadNecesaria = cantidadInicial * cantidadAFabricar;
        const maximo = Math.min(stockDisponible, cantidadNecesaria);

        let nuevaCantidadStock = parseFloat(rowData.CantidadStock || 0) || 0;

        if (cantidadAFabricar <= 0 || stockDisponible <= 0) {
            nuevaCantidadStock = 0;
        } else {
            nuevaCantidadStock = Math.min(nuevaCantidadStock, maximo);
        }

        const nuevoUsaStock = nuevaCantidadStock > 0 ? 1 : 0;

        // 🔥 SOLO actualiza si cambia (clave para performance y bugs)
        if (
            nuevaCantidadStock !== rowData.CantidadStock ||
            nuevoUsaStock !== rowData.UsaStock
        ) {
            rowData.CantidadStock = nuevaCantidadStock;
            rowData.UsaStock = nuevoUsaStock;

            this.data(rowData);
            cambios = true;
        }
    });

    if (cambios) {
        gridInsumosModal.draw(false);
    }
}
function obtenerCantidadAFabricar() {

    const cantidadProducto = parseFloat($('#ProductoModalCantidad').val()) || 0;

    const controles = obtenerControlesStockProductoFilaSeleccionada();

    if (!controles) return cantidadProducto;

    const usaStock = controles.chk.is(':checked');
    const cantidadStock = usaStock ? (parseFloat(controles.txt.val()) || 0) : 0;

    return Math.max(0, cantidadProducto - cantidadStock);
}


function escaparHtml(texto) {
    if (texto == null) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function intentarParsearJson(texto) {
    if (!texto || typeof texto !== "string") return null;

    try {
        return JSON.parse(texto);
    } catch {
        return null;
    }
}

function construirMensajeErrorServidor(payload, fallback = "Ocurrió un error al procesar la solicitud.") {
    if (!payload) return fallback;

    // Si vino string y ese string adentro era json
    if (typeof payload === "string") {
        const parsed = intentarParsearJson(payload);
        if (parsed) return construirMensajeErrorServidor(parsed, fallback);

        return payload; // ✅ MOSTRAR HTML REAL
    }

    const msg =
        payload.msg ||
        payload.mensaje ||
        payload.message ||
        payload.errorMessage ||
        payload.error ||
        fallback;

    let errores = [];

    if (Array.isArray(payload.errores)) {
        errores = payload.errores.filter(x => x != null && String(x).trim() !== "");
    } else if (Array.isArray(payload.errors)) {
        errores = payload.errors.filter(x => x != null && String(x).trim() !== "");
    } else if (typeof payload.errores === "string" && payload.errores.trim() !== "") {
        errores = [payload.errores];
    } else if (typeof payload.errors === "string" && payload.errors.trim() !== "") {
        errores = [payload.errores];
    }

    let html = `<div style="text-align:left;">`;
    html += `<div style="font-weight:700;margin-bottom:8px;">${msg}</div>`;

    if (errores.length > 0) {
        html += `<ul style="margin:0;padding-left:18px;">`;
        errores.forEach(err => {
            html += `<li style="margin-bottom:6px;">${err}</li>`;
        });
        html += `</ul>`;
    }

    html += `</div>`;

    return html;
}


function getColumnDataSrc(dt, colIndex) {
    const settings = dt.settings()[0];
    return settings.aoColumns[colIndex]?.data ?? null;
}

function clamp(valor, min, max) {
    let n = parseFloat(valor);
    if (isNaN(n)) n = 0;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
}

function getStockDisponibleFila(row) {
    return parseFloat(row.Stock ?? row.StockDisponible ?? 0) || 0;
}

function getCantidadStockFila(row) {
    return parseFloat(row.CantidadStock ?? row.CantidadStockInsumo ?? row.CantidadStockProducto ?? 0) || 0;
}

function getCantidadFila(row) {
    return parseFloat(row.Cantidad || 0) || 0;
}


function controlarUsoStockInsumosOptimizado() {

    const nuevaCantidad = obtenerCantidadAFabricar();

    if (nuevaCantidad === lastCantidadAFabricar) return;

    lastCantidadAFabricar = nuevaCantidad;

    controlarUsoStockInsumos();
}
