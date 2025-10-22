// ============================== ProductosNuevoModif.js ==============================
let gridInsumos = null;
let insumos = [];

// Filtros de columnas (dejado por compatibilidad)
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
];

/* -----------------------------------------------------------------------------
   Helpers de respaldo (no pisan si ya existen en site.js)
----------------------------------------------------------------------------- */
if (typeof window.formatNumber !== 'function') {
    window.formatNumber = function (n) {
        const v = Number(n || 0);
        return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
}
if (typeof window.formatoMoneda !== 'object') {
    window.formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}
if (typeof window.formatMoneda !== 'function') {
    window.formatMoneda = function (n) { return formatoMoneda.format(Number(n || 0)); };
}
if (typeof window.convertirMonedaAFloat !== 'function') {
    window.convertirMonedaAFloat = function (s) {
        if (s == null) return 0;
        const clean = String(s).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
        const v = parseFloat(clean);
        return isNaN(v) ? 0 : v;
    };
}
function toNumberSoft(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isNaN(n) ? convertirMonedaAFloat(v) : n;
}

/* -----------------------------------------------------------------------------
   Arranque
----------------------------------------------------------------------------- */
$(document).ready(async () => {
    // Título dinámico (si existe el elemento)
    setTituloProducto();

    // Cargar catálogo de categorías
    await listaCategorias();

    // Si viene id en ViewBag -> editar, si no -> alta
    if (window.ProductoData && Number(ProductoData) > 0) {
        await cargarDatosProducto();
    } else {
        await configurarDataTable(null);
    }

    // Select2
    $("#Categorias").select2({
        width: "100%",
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    $("#insumoSelect").select2({
        width: "100%",
        dropdownParent: $("#insumosModal"),
        placeholder: "Selecciona una opción",
        allowClear: false
    });

    // Cambios que recalculan
    $('#UnidadesNegocio').on('change', () => {
        if (gridInsumos) gridInsumos.clear().draw();
        calcularDatosProducto();
    });

    $('#Nombre').on('input', validarCampos);

    // Eventos del modal para cálculos
    $(document).on('input', '#precioInput, #cantidadInput', calcularTotal);
    $(document).on('blur', '#precioInput', function () {
        this.value = formatMoneda(convertirMonedaAFloat(this.value));
        calcularTotal();
    });

    // Cálculo inicial
    calcularDatosProducto();
});

/* -----------------------------------------------------------------------------
   UI: título + botón principal
----------------------------------------------------------------------------- */
function setTituloProducto() {
    const $title = $('#tituloProducto, .cc-header h2').first(); // cualquiera de los dos que tengas
    const $btn = $('#btnNuevoModificar');
    let duplicar = localStorage.getItem('DuplicarProducto');

    if (window.ProductoData && Number(ProductoData) > 0) {
        // Editando
        if ($title.length) $title.text('Editar Producto');
        if ($btn.length) $btn.text(duplicar === 'true' ? 'Registrar' : 'Guardar');
    } else {
        // Nuevo
        if ($title.length) $title.text('Nuevo Producto');
        if ($btn.length) $btn.text('Registrar');
    }
}

/* -----------------------------------------------------------------------------
   Carga/edición de datos
----------------------------------------------------------------------------- */
async function cargarDatosProducto() {
    if (!(window.ProductoData && Number(ProductoData) > 0)) return;
    const datos = await ObtenerDatosProducto(Number(ProductoData));
    await configurarDataTable(datos?.Insumos);
    await insertarDatosProducto(datos?.Producto);
    validarCampos();
}

async function ObtenerDatosProducto(id) {
    const url = `/Productos/EditarInfo?id=${id}`;
    const response = await fetch(url);
    return await response.json();
}

async function insertarDatosProducto(datos) {
    if (!datos) return;

    $('#IdProducto').val(datos.Id);
    $('#Nombre').val(datos.Nombre);
    $('#Categorias').val(datos.IdCategoria);
    $('#porcIVA').val(datos.PorcIva);
    $('#porcGanancia').val(datos.PorcGanancia);

    // Re-init select2 para reflejar el valor
    $("#Categorias").trigger('change.select2');

    const duplicar = localStorage.getItem("DuplicarProducto");
    if (duplicar === 'true') {
        $('#btnNuevoModificar').text('Registrar');
    } else {
        $('#btnNuevoModificar').text('Guardar');
    }

    await calcularDatosProducto();
}

/* -----------------------------------------------------------------------------
   Validación mínima
----------------------------------------------------------------------------- */
function validarCampos() {
    const Nombre = $("#Nombre").val();
    const okNombre = !!Nombre;

    $("#lblNombre").css("color", okNombre ? "" : "red");
    $("#Nombre").css("border-color", okNombre ? "" : "red");

    return okNombre;
}

async function configurarDataTable(data) {
    if (!gridInsumos) {
        $('#grd_Insumos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');
        gridInsumos = $('#grd_Insumos').DataTable({
            data: data != null ? data.$values : data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                { data: 'Nombre' },
                { data: 'Proveedor' },
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
            fixedHeader: false,
            "columnDefs": [

                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [2, 4] // Índices de las columnas de números
                },

            ],

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

                setTimeout(function () {
                    gridInsumos.columns.adjust();
                }, 10);

                $('body').on('mouseenter', '#grd_Productos .fa-map-marker', function () {
                    $(this).css('cursor', 'pointer');
                });


            },
        });

    } else {
        gridInsumos.clear().rows.add(data).draw();
    }
}

/* -----------------------------------------------------------------------------
   Catálogos
----------------------------------------------------------------------------- */
async function listaCategoriasFilter() {
    const url = `/Productos/ListaCategorias`;
    const resp = await fetch(url);
    const data = await resp.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaCategorias() {
    const data = await listaCategoriasFilter();
    const $sel = $('#Categorias').empty();
    (data || []).forEach(x => $sel.append(new Option(x.Nombre, x.Id)));
    // Mantener selección si ya había un valor
    const val = $sel.data('value') || $sel.val();
    if (val) $sel.val(val).trigger('change');
}

/* -----------------------------------------------------------------------------
   Insumos (listado para modal)
----------------------------------------------------------------------------- */
async function obtenerInsumosUnidadNegocio() {
    const url = `/Insumos/Lista`;
    const response = await fetch(url);
    const data = await response.json();
    return (data || []).map(x => ({
        Id: x.Id,
        IdInsumo: x.Id,           // compat
        Nombre: x.Descripcion,
        CostoUnitario: x.PrecioCosto,
        Proveedor: x.Proveedor
    }));
}

/* -----------------------------------------------------------------------------
   ABM Insumos en modal
----------------------------------------------------------------------------- */
async function anadirInsumo() {
    const insumosEnTabla = [];
    if (gridInsumos) {
        gridInsumos.rows().every(function () {
            const r = this.data();
            insumosEnTabla.push(Number(r.IdInsumo));
        });
    }

    insumos = await cargarInsumosModal(null, insumosEnTabla);

    const todosYaAgregados = insumos.length > 0 && insumos.every(x => insumosEnTabla.includes(x.Id));
    if (todosYaAgregados) { advertenciaModal?.("¡Ya agregaste todos los insumos!"); return; }
    if (!insumos || !insumos.length) return;

    const $insumoSelect = $("#insumoSelect");
    const $precioInput = $("#precioInput");
    const $cantidadInput = $("#cantidadInput");
    const $totalInput = $("#totalInput");
    const $proveedorInput = $("#insumoProveedor");

    $insumoSelect.off('change').on("change", function () {
        const idSel = Number($(this).val());
        const item = insumos.find(p => p.Id === idSel);
        const costo = item?.CostoUnitario ?? 0;
        $cantidadInput.val(1);
        $precioInput.val(formatoMoneda.format(costo));
        $totalInput.val(formatoMoneda.format(costo));
        $proveedorInput.val(item?.Proveedor || '');
    });

    $insumoSelect.trigger("change");

    const $modal = $('#insumosModal');
    $modal.attr('data-editing', 'false').attr('edit-id', '');
    $('#btnGuardarInsumo').text('Añadir');
    $modal.modal('show');
}

async function editarInsumo(id) {
    const insumosEnTabla = [];
    let insumoData = null;

    gridInsumos?.rows().every(function () {
        const r = this.data();
        insumosEnTabla.push(Number(r.IdInsumo));
        if (Number(r.IdInsumo) === Number(id)) insumoData = r;
    });

    if (!insumoData) { advertenciaModal?.("No se encontró el insumo a editar."); return; }

    insumos = await cargarInsumosModal(null, insumosEnTabla, insumoData.IdInsumo);
    if (!insumos) return;

    $("#cantidadInput").val(insumoData.Cantidad);
    $("#precioInput").val(formatoMoneda.format(insumoData.CostoUnitario));
    $("#totalInput").val(formatoMoneda.format(insumoData.SubTotal));
    $("#insumoProveedor").val(insumoData.Proveedor);

    $("#insumoSelect").prop("disabled", true).val(insumoData.IdInsumo).trigger('change');

    const $modal = $('#insumosModal');
    $modal.attr('data-editing', 'true').attr('edit-id', String(insumoData.IdInsumo));
    $('#btnGuardarInsumo').text('Editar');
    $modal.modal('show');
}

async function cargarInsumosModal(_idUnidad, insumosEnTabla, insumoSeleccionado = null) {
    const lista = await obtenerInsumosUnidadNegocio();
    const $sel = $("#insumoSelect").empty();

    let primerHabilitado = null;

    lista.forEach(x => {
        const $opt = $(`<option value="${x.Id}">${x.Nombre}</option>`);
        if (insumosEnTabla.includes(x.Id) && x.Id !== insumoSeleccionado) {
            $opt.prop('disabled', true);
        } else if (primerHabilitado == null) {
            primerHabilitado = x.Id;
        }
        $sel.append($opt);
    });

    if (insumoSeleccionado != null) {
        $sel.val(insumoSeleccionado).prop('disabled', true);
    } else if (primerHabilitado != null) {
        $sel.val(primerHabilitado).prop('disabled', false);
    }

    $sel.trigger('change.select2');
    return lista;
}

function eliminarInsumo(id) {
    if (!gridInsumos) return;
    gridInsumos.rows().every(function (rowIdx) {
        const d = this.data();
        if (d && Number(d.IdInsumo) === Number(id)) {
            gridInsumos.row(rowIdx).remove().draw(false);
        }
    });
    calcularDatosProducto();
}

/* -----------------------------------------------------------------------------
   Cálculos (modal)
----------------------------------------------------------------------------- */
function calcularTotal() {
    const precioRaw = $('#precioInput').val();
    const cantidad = toNumberSoft($('#cantidadInput').val());
    const precio = convertirMonedaAFloat(precioRaw);
    const total = (precio || 0) * (cantidad || 0);
    $('#totalInput').val(formatoMoneda.format(total));
}

/* -----------------------------------------------------------------------------
   Recalcular totales del producto + KPIs
----------------------------------------------------------------------------- */
async function calcularDatosProducto() {
    let InsumoTotal = 0;

    if (gridInsumos && gridInsumos.rows().count() > 0) {
        gridInsumos.rows().every(function () {
            const r = this.data();
            InsumoTotal += toNumberSoft(r?.SubTotal);
        });
    }

    // Campo total de insumos
    $('#TotalInsumos').val(formatoMoneda.format(InsumoTotal));

    // Recalcular IVA + Ganancia + costo total
    calcularIVAyGanancia();

    // KPI: Total Insumos
    const $kpiIns = $('#kpiTotalInsumos');
    if ($kpiIns.length) $kpiIns.text(formatNumber(InsumoTotal));
}

function calcularIVAyGanancia() {
    const totalInsumos = convertirMonedaAFloat($('#TotalInsumos').val());
    const porcIVA = toNumberSoft($('#porcIVA').val());
    const porcGanancia = toNumberSoft($('#porcGanancia').val());

    const totalGanancia = (totalInsumos * porcGanancia) / 100;
    const totalIVA = ((totalGanancia + totalInsumos) * porcIVA) / 100;
    let costoTotal = totalInsumos + totalGanancia + totalIVA;
    costoTotal = Math.ceil(costoTotal / 100) * 100;

    $('#totalIVA').val(formatoMoneda.format(totalIVA));
    $('#totalGanancia').val(formatoMoneda.format(totalGanancia));
    $('#costoTotal').val(formatNumber(costoTotal));

    // KPIs
    const $kpiIns = $('#kpiTotalInsumos');
    const $kpiIva = $('#kpiIva');
    const $kpiGan = $('#kpiGanancia');
    const $kpiCost = $('#kpiCostoTotal');

    if ($kpiIns.length) $kpiIns.text(formatNumber(totalInsumos));
    if ($kpiIva.length) $kpiIva.text(porcIVA.toLocaleString('es-AR'));
    if ($kpiGan.length) $kpiGan.text(porcGanancia.toLocaleString('es-AR'));
    if ($kpiCost.length) $kpiCost.text(formatNumber(costoTotal));
}

// Eventos para recalcular al tipear % IVA/Ganancia
$(document).on('input', '#porcIVA, #porcGanancia', calcularIVAyGanancia);

/* -----------------------------------------------------------------------------
   Guardar
----------------------------------------------------------------------------- */
function guardarCambios() {
    let idProducto = $("#IdProducto").val();
    const duplicar = localStorage.getItem("DuplicarProducto");

    if (duplicar === 'true') idProducto = ""; // forzamos alta

    if (!validarCampos()) { errorModal?.("Debes completar los campos requeridos."); return; }

    function obtenerInsumos(grd) {
        const arr = [];
        grd.rows().every(function () {
            const it = this.data();
            arr.push({
                "IdProducto": idProducto !== "" ? Number(idProducto) : 0,
                "IdInsumo": Number(it.IdInsumo),
                "Id": it.Id ? Number(it.Id) : 0,
                "Nombre": it.Nombre,
                "Cantidad": toNumberSoft(it.Cantidad)
            });
        });
        return arr;
    }

    const items = obtenerInsumos(gridInsumos);
    if (!items.length) { advertenciaModal?.("Debes agregar al menos un insumo"); return; }

    const nuevoModelo = {
        "Id": idProducto !== "" ? Number(idProducto) : 0,
        "Nombre": $("#Nombre").val(),
        "IdColor": $("#Colores").val(), // si no existe en el form, backend lo ignorará
        "IdCategoria": Number($("#Categorias").val()),
        "PorcGanancia": toNumberSoft($("#porcGanancia").val()),
        "PorcIVA": toNumberSoft($("#porcIVA").val()),
        "CostoUnitario": convertirMonedaAFloat($("#costoTotal").val()),
        "ProductosInsumos": items
    };

    const url = idProducto === "" ? "/Productos/Insertar" : "/Productos/Actualizar";
    const method = idProducto === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(dataJson => {
            if (duplicar === 'true') localStorage.removeItem("DuplicarProducto");
            const msg = idProducto === "" ? "Producto registrado correctamente" : "Producto modificado correctamente";
            exitoModal?.(msg);
            window.location.href = "/Productos/Index";
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal?.('Ocurrió un error al guardar el producto.');
        });
}

/* -----------------------------------------------------------------------------
   Click-out para cerrar cualquier dropdown de acciones (si lo hubiese)
----------------------------------------------------------------------------- */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});
