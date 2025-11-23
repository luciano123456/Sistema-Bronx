// ============================== StockNuevoModif.js ==============================
let gridDetalle = null;
let DETALLES = [];
let TEMP_ID_SEQ = 1;

let CATALOGO_PRODUCTOS = [];
let CATALOGO_INSUMOS = [];

/* ========================================================================
   HELPERS NUMÉRICOS / FORMATO
======================================================================== */
if (typeof window.formatCantidad !== "function") {
    window.formatCantidad = function (n) {
        const v = Number(n || 0);
        // 3 decimales, sin signo de $
        return v.toLocaleString("es-AR", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        });
    };
}
if (typeof window.formatoMoneda !== "object") {
    window.formatoMoneda = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
if (typeof window.formatMoneda !== "function") {
    window.formatMoneda = function (n) {
        return formatoMoneda.format(Number(n || 0));
    };
}

/* ========================================================================
   ARRANQUE
======================================================================== */
$(document).ready(async () => {

    await cargarTiposMovimiento();
    await cargarCatalogos();
    configurarTablaDetalle();

    // Select2 para tipo de movimiento (misma altura que inputs)
    $("#IdTipoMovimiento").select2({
        placeholder: "Seleccione...",
        allowClear: true,
        dropdownParent: $(".page-99")
    });

    const id = Number($("#IdMovimiento").val() || 0);
    if (id > 0) {
        $("#tituloMovimiento").text("Editar movimiento");
        $("#btnGuardarMovimiento").html('<i class="fa fa-save me-2"></i> Guardar cambios');
        await cargarMovimiento(id);
    } else {
        $("#tituloMovimiento").text("Nuevo movimiento");
        $("#btnGuardarMovimiento").html('<i class="fa fa-save me-2"></i> Registrar');
    }

    recalcularKpis();
});

/* ========================================================================
   CARGA CABECERA
======================================================================== */
async function cargarTiposMovimiento() {
    try {
        const resp = await fetch("/StockTiposMovimientos/Lista");
        if (!resp.ok) throw new Error("Error tipos movimiento");
        const data = await resp.json();

        const $sel = $("#IdTipoMovimiento").empty();
        $sel.append(new Option("Seleccione...", ""));
        (data || []).forEach(t => {
            $sel.append(new Option(t.Nombre, t.Id));
        });
    } catch (e) {
        console.error(e);
        errorModal?.("No se pudieron cargar los tipos de movimiento.");
    }
}

async function cargarCatalogos() {
    try {
        // Productos
        let rProd = await fetch("/Productos/Lista");
        if (rProd.ok) {
            const data = await rProd.json();
            CATALOGO_PRODUCTOS = (data || []).map(p => ({
                Id: p.Id,
                Nombre: p.Nombre,
                CostoUnitario: Number(p.CostoUnitario || 0)
            }));
        }

        // Insumos
        let rIns = await fetch("/Insumos/Lista");
        if (rIns.ok) {
            const dataI = await rIns.json();
            CATALOGO_INSUMOS = (dataI || []).map(i => ({
                Id: i.Id,
                Nombre: i.Descripcion,
                CostoUnitario: Number(i.PrecioCosto || 0)
            }));
        }
    } catch (e) {
        console.error(e);
        advertenciaModal?.("No se pudieron cargar productos/insumos.");
    }
}

/* ========================================================================
   OBTENER MOVIMIENTO EXISTENTE
======================================================================== */
async function cargarMovimiento(id) {
    try {
        const resp = await fetch(`/Stock/Obtener?id=${id}`);
        if (!resp.ok) throw new Error("Error al obtener movimiento");
        const json = await resp.json();
        if (!json) return;

        const mov = json.Movimiento;
        let detalles = json.Detalles || [];

        $("#IdTipoMovimiento").val(mov.IdTipoMovimiento).trigger("change");
        $("#Comentario").val(mov.Comentario || "");

        DETALLES = detalles.map(d => {
            const tipo = (d.TipoItem || "").toUpperCase(); // 'P' / 'I'
            const esProducto = tipo === "P";
            const nombre = esProducto
                ? (d.IdProductoNavigation?.Nombre || "")
                : (d.IdInsumoNavigation?.Descripcion || "");

            const costo = Number(d.CostoUnitario ?? 0);
            const cantidad = Number(d.Cantidad || 0);
            const subtotal = Number(d.SubTotal ?? (costo * cantidad));

            return {
                TempId: TEMP_ID_SEQ++,
                Id: d.Id,
                IdMovimiento: d.IdMovimiento,
                TipoItem: tipo,                 // 'P' / 'I'
                IdProducto: esProducto ? d.IdProducto : null,
                IdInsumo: esProducto ? null : d.IdInsumo,
                Cantidad: cantidad,
                CostoUnitario: costo,
                SubTotal: subtotal,
                NombreItem: nombre
            };
        });

        refrescarTablaDetalle();
    } catch (e) {
        console.error(e);
        errorModal?.("Ocurrió un error al cargar el movimiento.");
    }
}

/* ========================================================================
   TABLA DETALLE
======================================================================== */
function configurarTablaDetalle() {
    gridDetalle = $("#grd_Detalle").DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        paging: false,
        searching: false,
        info: false,
        ordering: false,
        scrollX: true,
        columns: [
            {
                data: "TipoItem",
                className: "text-center align-middle stock-col-tipo",
                render: function (data) {
                    const tipo = (data || "").toUpperCase();
                    if (tipo === "P") {
                        return `<span class="stock-pill stock-pill-producto">
                                    <i class="fa fa-cube me-1"></i>PRODUCTO
                                </span>`;
                    } else if (tipo === "I") {
                        return `<span class="stock-pill stock-pill-insumo">
                                    <i class="fa fa-wrench me-1"></i>INSUMO
                                </span>`;
                    } else {
                        return `<span class="stock-pill">${tipo}</span>`;
                    }
                }
            },
            {
                data: "NombreItem",
                className: "align-middle",
                render: d => d || "-"
            },
            {
                data: "Cantidad",
                className: "text-center align-middle stock-cell-cantidad",
                render: d => formatCantidad(d)  // SIN $
            },
            {
                data: "CostoUnitario",
                className: "text-end align-middle",
                render: d => formatMoneda(d)
            },
            {
                data: "SubTotal",
                className: "text-end align-middle",
                render: d => formatMoneda(d)
            },
            {
                data: null,
                className: "text-center align-middle",
                orderable: false,
                render: function (data, type, row) {
                    return `
                        <button type="button" class="btn btn-sm btn-outline-light stock-btn-icon"
                                onclick="abrirModalEditarCantidad(${row.TempId})"
                                title="Editar cantidad">
                            <i class="fa fa-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger stock-btn-icon ms-1"
                                onclick="eliminarItem(${row.TempId})"
                                title="Eliminar">
                            <i class="fa fa-trash"></i>
                        </button>`;
                }
            }
        ],
        createdRow: function (row, data) {
            $(row).attr("data-tempid", data.TempId);
            // barrita de color SOLO en la primera columna
            if (data.TipoItem === "P") {
                $(row).addClass("stock-row-producto");
            } else if (data.TipoItem === "I") {
                $(row).addClass("stock-row-insumo");
            }
        }
    });

    // Click en celda de cantidad => editar
    $("#grd_Detalle tbody").on("click", "td.stock-cell-cantidad", function () {
        const tempId = Number($(this).closest("tr").data("tempid") || 0);
        if (tempId) abrirModalEditarCantidad(tempId);
    });
}

function refrescarTablaDetalle() {
    if (!gridDetalle) return;
    gridDetalle.clear().rows.add(DETALLES).draw();
    recalcularKpis();
}

/* ========================================================================
   KPIs
======================================================================== */
function recalcularKpis() {
    let cant = DETALLES.length;
    let total = 0;
    DETALLES.forEach(d => total += Number(d.SubTotal || 0));

    $("#kpiCantItems").text(cant.toLocaleString("es-AR"));
    $("#kpiTotalMovimiento").text(formatMoneda(total));
}

/* ========================================================================
   MODAL AÑADIR ITEMS
======================================================================== */
function abrirModalItems() {
    $("#tbodyModalItems").empty();
    agregarFilaModal();

    const modal = new bootstrap.Modal(document.getElementById("modalItems"));
    modal.show();
}

function agregarFilaModal() {
    const idx = $("#tbodyModalItems tr").length;
    const tr = $(`
        <tr data-row="${idx}">
            <td>
                <select class="form-select form-select-sm stock-input stock-tipo-select" data-field="Tipo">
                    <option value="I">Insumo</option>
                    <option value="P">Producto</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm stock-input stock-item-select" data-field="Item">
                    <option value="">Seleccione...</option>
                </select>
            </td>
            <td>
                <input type="number"
                       class="form-control form-control-sm stock-input text-center"
                       data-field="Cantidad"
                       min="0.001" step="0.001" value="1" />
            </td>
            <td>
                <input type="text"
                       class="form-control form-control-sm stock-input text-end"
                       data-field="Costo"
                       readonly />
            </td>
            <td>
                <input type="text"
                       class="form-control form-control-sm stock-input text-end"
                       data-field="Subtotal"
                       readonly />
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger stock-btn-icon"
                        onclick="eliminarFilaModal(this)">
                    <i class="fa fa-times"></i>
                </button>
            </td>
        </tr>`);

    $("#tbodyModalItems").append(tr);
    inicializarFilaModal(tr);
}

function inicializarFilaModal($row) {
    const $tipo = $row.find('[data-field="Tipo"]');
    const $item = $row.find('[data-field="Item"]');
    const $cant = $row.find('[data-field="Cantidad"]');
    const $costo = $row.find('[data-field="Costo"]');
    const $sub = $row.find('[data-field="Subtotal"]');

    function llenarItems(tipoChar) {
        $item.empty();
        $item.append(new Option("Seleccione...", ""));
        const lista = tipoChar === "P" ? CATALOGO_PRODUCTOS : CATALOGO_INSUMOS;
        lista.forEach(x => $item.append(new Option(x.Nombre, x.Id)));
        $item.val("").trigger("change");
        $costo.val("");
        $sub.val("");
    }

    // Select2 para ITEM
    $item.select2({
        dropdownParent: $("#modalItems"),
        placeholder: "Seleccione...",
        allowClear: true,
        width: "100%"
    });

    $tipo.off("change.modal").on("change.modal", function () {
        llenarItems($(this).val());
    });

    $item.off("change.modal").on("change.modal", function () {
        const tipo = $tipo.val();
        const id = Number($(this).val() || 0);
        const catalogo = tipo === "P" ? CATALOGO_PRODUCTOS : CATALOGO_INSUMOS;
        const item = catalogo.find(x => x.Id === id);
        const costo = item ? item.CostoUnitario : 0;
        $costo.val(formatMoneda(costo));

        const cant = Number($cant.val() || 0);
        $sub.val(formatMoneda(cant * costo));
    });

    $cant.off("input.modal").on("input.modal", function () {
        const tipo = $tipo.val();
        const id = Number($item.val() || 0);
        const catalogo = tipo === "P" ? CATALOGO_PRODUCTOS : CATALOGO_INSUMOS;
        const item = catalogo.find(x => x.Id === id);
        const costo = item ? item.CostoUnitario : 0;
        const cant = Number($(this).val() || 0);
        $sub.val(formatMoneda(cant * costo));
    });

    // cargar al inicio (por defecto Insumo)
    llenarItems($tipo.val());
    $costo.val("");
    $sub.val("");
}

function eliminarFilaModal(btn) {
    $(btn).closest("tr").remove();
}

/* Agregar ítems del modal al buffer DETALLES
   - No permite filas inválidas
   - Si el mismo item + tipo ya existe => suma cantidad y recalcula subtotal
*/
function confirmarItemsModal() {
    const filas = $("#tbodyModalItems tr");
    if (!filas.length) {
        advertenciaModal?.("Debes agregar al menos una fila.");
        return;
    }

    let agregados = 0;

    filas.each(function () {
        const $row = $(this);
        const tipo = $row.find('[data-field="Tipo"]').val(); // 'P' / 'I'
        const idItem = Number($row.find('[data-field="Item"]').val() || 0);
        const cantidad = Number($row.find('[data-field="Cantidad"]').val() || 0);
        if (!idItem || cantidad <= 0) return;

        const catalogo = tipo === "P" ? CATALOGO_PRODUCTOS : CATALOGO_INSUMOS;
        const item = catalogo.find(x => x.Id === idItem);
        const costo = item ? item.CostoUnitario : 0;

        // Buscar si ya existe
        let existente = DETALLES.find(d =>
            d.TipoItem === tipo &&
            ((tipo === "P" && d.IdProducto === idItem) ||
                (tipo === "I" && d.IdInsumo === idItem))
        );

        if (existente) {
            existente.Cantidad = Number(existente.Cantidad || 0) + cantidad;
            existente.SubTotal = existente.Cantidad * existente.CostoUnitario;
        } else {
            DETALLES.push({
                TempId: TEMP_ID_SEQ++,
                Id: 0,
                IdMovimiento: Number($("#IdMovimiento").val() || 0),
                TipoItem: tipo, // 'P' / 'I'
                IdProducto: tipo === "P" ? idItem : null,
                IdInsumo: tipo === "I" ? idItem : null,
                Cantidad: cantidad,
                CostoUnitario: costo,
                SubTotal: cantidad * costo,
                NombreItem: item ? item.Nombre : ""
            });
        }

        agregados++;
    });

    if (!agregados) {
        advertenciaModal?.("Completa al menos un ítem válido.");
        return;
    }

    refrescarTablaDetalle();

    const modalEl = document.getElementById("modalItems");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
}

/* ========================================================================
   EDITAR CANTIDAD (MODAL)
======================================================================== */
function abrirModalEditarCantidad(tempId) {
    const det = DETALLES.find(d => d.TempId === tempId);
    if (!det) return;

    $("#editTempId").val(det.TempId);
    $("#editItemName").text(det.NombreItem || "-");
    $("#editCantidad").val(det.Cantidad);
    $("#editCosto").text(formatMoneda(det.CostoUnitario));
    $("#editSubtotal").text(formatMoneda(det.SubTotal));

    $("#editCantidad").off("input").on("input", function () {
        const cant = Number($(this).val() || 0);
        const sub = cant * det.CostoUnitario;
        $("#editSubtotal").text(formatMoneda(sub));
    });

    const modal = new bootstrap.Modal(document.getElementById("modalEditarCantidad"));
    modal.show();
}

function guardarCantidadEditada() {
    const tempId = Number($("#editTempId").val() || 0);
    const det = DETALLES.find(d => d.TempId === tempId);
    if (!det) return;

    const nuevaCant = Number($("#editCantidad").val() || 0);
    if (nuevaCant <= 0) {
        advertenciaModal?.("La cantidad debe ser mayor a 0.");
        return;
    }

    det.Cantidad = nuevaCant;
    det.SubTotal = nuevaCant * det.CostoUnitario;

    refrescarTablaDetalle();

    const modalEl = document.getElementById("modalEditarCantidad");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
}

/* ========================================================================
   ELIMINAR ITEM
======================================================================== */
function eliminarItem(tempId) {
    DETALLES = DETALLES.filter(d => d.TempId !== tempId);
    refrescarTablaDetalle();
}

/* ========================================================================
   GUARDAR MOVIMIENTO
   - Asegura Id=0 en detalles nuevos
   - TipoItem 'P' / 'I' para que no trunque
======================================================================== */
async function guardarMovimiento() {
    const idMovimiento = Number($("#IdMovimiento").val() || 0);
    const idTipo = Number($("#IdTipoMovimiento").val() || 0);
    const comentario = $("#Comentario").val() || "";

    if (!idTipo) {
        errorModal?.("Debes seleccionar un tipo de movimiento.");
        return;
    }
    if (!DETALLES.length) {
        advertenciaModal?.("Debes agregar al menos un ítem al movimiento.");
        return;
    }

    const modelo = {
        Id: idMovimiento,
        IdTipoMovimiento: idTipo,
        Comentario: comentario,
        StockMovimientosDetalles: DETALLES.map(d => ({
            Id: d.Id || 0,                      // para registrar => 0
            IdMovimiento: d.IdMovimiento || 0,  // el repo vuelve a setearlo con mov.Id
            TipoItem: d.TipoItem,              // 'P' / 'I'
            IdProducto: d.IdProducto,
            IdInsumo: d.IdInsumo,
            Cantidad: d.Cantidad,
            CostoUnitario: d.CostoUnitario,
            //SubTotal: d.SubTotal
        }))
    };

    const url = idMovimiento > 0 ? "/Stock/Modificar" : "/Stock/Registrar";
    const method = idMovimiento > 0 ? "PUT" : "POST";

    try {
        const resp = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(modelo)
        });

        if (!resp.ok) throw new Error("Error HTTP");

        const json = await resp.json();
        if (json?.valor) {
            exitoModal?.("Movimiento guardado correctamente.");
            setTimeout(() => {
                window.location.href = "/Stock/Index";
            }, 800);
        } else {
            errorModal?.(json?.msg || "Ocurrió un error al guardar el movimiento.");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Ocurrió un error al guardar el movimiento.");
    }
}

/* ========================================================================
   VOLVER
======================================================================== */
function volver() {
    window.location.href = "/Stock/Index";
}
