// ============================== StockNuevoModif.js ==============================

let gridDetalle = null;
let DETALLES = [];
let TEMP_ID_SEQ = 1;

let CATALOGO_PRODUCTOS = [];
let CATALOGO_INSUMOS = [];

/* ========================================================================
   HELPERS
======================================================================== */
function fmtCant(n) {
    return Number(n || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

function fmtMon(n) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS"
    }).format(Number(n || 0));
}

/* ========================================================================
   INIT
======================================================================== */
$(document).ready(async () => {
    await cargarTiposMovimiento();
    await cargarCatalogos();
    configurarTablaDetalle();

    $("#IdTipoMovimiento").select2({
        dropdownParent: $(".page-99"),
        placeholder: "Seleccione..."
    });
});

/* ========================================================================
   CARGAS
======================================================================== */
async function cargarTiposMovimiento() {
    const r = await fetch("/StockTiposMovimientos/Lista");
    const data = await r.json();
    const $s = $("#IdTipoMovimiento").empty().append(new Option("Seleccione...", ""));
    data.forEach(x => $s.append(new Option(x.Nombre, x.Id)));
}

async function cargarCatalogos() {
    const rp = await fetch("/Productos/Lista");
    const ri = await fetch("/Insumos/Lista");

    CATALOGO_PRODUCTOS = (await rp.json()).map(p => ({
        Id: p.Id,
        Nombre: p.Nombre,
        Costo: Number(p.CostoUnitario || 0)
    }));

    CATALOGO_INSUMOS = (await ri.json()).map(i => ({
        Id: i.Id,
        Nombre: i.Descripcion,
        Costo: Number(i.PrecioCosto || 0)
    }));
}

/* ========================================================================
   TABLA PRINCIPAL
======================================================================== */
function configurarTablaDetalle() {
    gridDetalle = $("#grd_Detalle").DataTable({
        paging: false,
        searching: false,
        info: false,
        ordering: false,
        data: [],
        columns: [
            { data: "Tipo" },
            { data: "Nombre" },
            { data: "Cantidad", render: d => fmtCant(d) },
            { data: "Costo", render: d => fmtMon(d) },
            { data: "SubTotal", render: d => fmtMon(d) },
            {
                data: null,
                render: d => `
                    <button class="btn btn-sm btn-outline-light"
                        onclick="abrirEditar(${d.TempId})">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger ms-1"
                        onclick="eliminarItem(${d.TempId})">
                        <i class="fa fa-trash"></i>
                    </button>`
            }
        ]
    });
}

function refrescarTablaDetalle() {
    gridDetalle.clear().rows.add(DETALLES).draw();
    recalcularKpis();
}

/* ========================================================================
   KPIs
======================================================================== */
function recalcularKpis() {
    let total = DETALLES.reduce((a, b) => a + b.SubTotal, 0);
    $("#kpiCantItems").text(DETALLES.length);
    $("#kpiTotalMovimiento").text(fmtMon(total));
}

/* ========================================================================
   MODAL ITEMS
======================================================================== */
function abrirModalItems() {
    $("#tbodyProd").empty();
    $("#tbodyIns").empty();

    agregarFilaProducto();
    agregarFilaInsumo();

    new bootstrap.Modal("#modalItems").show();
}

/* ========================================================================
   FILAS PRODUCTOS
======================================================================== */
function agregarFilaProducto() {

    const trProd = $(`
        <tr class="fila-producto prod-terminado">
            <td>
                <select class="form-select sel-producto"></select>
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input chk-terminado" checked>
            </td>
            <td>
                <input type="number" class="form-control text-center cant-prod" value="1" step="0.001">
            </td>
            <td class="text-end costo-prod">$ 0,00</td>
            <td class="text-end sub-prod">$ 0,00</td>
            <td>
                <button class="btn btn-sm btn-outline-danger btn-del-prod">
                    <i class="fa fa-times"></i>
                </button>
            </td>
        </tr>
    `);

    const trInsumos = $(`
        <tr class="fila-insumos">
            <td colspan="6">
                <div class="p-3 rounded bg-success bg-opacity-10">
                    <div class="fw-bold mb-2 text-success">
                        <i class="fa fa-check-circle me-1"></i>Insu mos del producto (solo lectura)
                    </div>
                    <table class="table table-sm table-borderless mb-0">
                        <thead>
                            <tr>
                                <th>Insumo</th>
                                <th style="width:140px">Cantidad</th>
                                <th style="width:60px"></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </td>
        </tr>
    `);

    $("#tbodyProd").append(trProd).append(trInsumos);

    const $sel = trProd.find(".sel-producto");
    $sel.append(new Option("Seleccione...", ""));
    CATALOGO_PRODUCTOS.forEach(p => $sel.append(new Option(p.Nombre, p.Id)));

    $sel.select2({
        dropdownParent: $("#modalItems"),
        width: "100%"
    });

    trProd.find(".btn-del-prod").on("click", () => {
        trInsumos.remove();
        trProd.remove();
    });

    $sel.on("change", async () => {
        recalcularFilaProducto(trProd);
        await cargarInsumosProducto(trProd, trInsumos);
        configurarEstadoInsumos(trProd, trInsumos, true);
    });

    trProd.find(".cant-prod").on("input", () => {
        recalcularFilaProducto(trProd);
    });

    trProd.find(".chk-terminado").on("change", function () {
        const terminado = this.checked;
        trProd.toggleClass("prod-terminado", terminado);
        trProd.toggleClass("prod-no-terminado", !terminado);
        configurarEstadoInsumos(trProd, trInsumos, terminado);
    });
}

/* ========================================================================
   INSUMOS POR PRODUCTO
======================================================================== */
async function cargarInsumosProducto(trProd, trInsumos) {

    const idProd = Number(trProd.find(".sel-producto").val());
    const tbody = trInsumos.find("tbody").empty();

    if (!idProd) return;

    const r = await fetch(`/Productos/ListaInsumosProducto?IdProducto=${idProd}`);
    const insumos = await r.json();

    insumos.forEach(ins => {
        tbody.append(`
            <tr data-id="${ins.IdInsumo}">
                <td>${ins.Nombre}</td>
                <td>
                    <input type="number"
                           class="form-control text-center cant-ins-prod"
                           value="${ins.Cantidad}"
                           step="0.001">
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger btn-del-ins">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    tbody.on("click", ".btn-del-ins", function () {
        $(this).closest("tr").remove();
    });
}

function configurarEstadoInsumos(trProd, trInsumos, terminado) {

    const box = trInsumos.find("> td > div");

    if (terminado) {
        box
            .removeClass("bg-warning bg-opacity-10")
            .addClass("bg-success bg-opacity-10")
            .find(".fw-bold")
            .html(`<i class="fa fa-check-circle me-1"></i>Insumos del producto (solo lectura)`);

        trInsumos.find("input").prop("disabled", true);
        trInsumos.find(".btn-del-ins").addClass("d-none");

    } else {
        box
            .removeClass("bg-success bg-opacity-10")
            .addClass("bg-warning bg-opacity-10")
            .find(".fw-bold")
            .html(`<i class="fa fa-cogs me-1"></i>Insumos a utilizar (editable)`);

        trInsumos.find("input").prop("disabled", false);
        trInsumos.find(".btn-del-ins").removeClass("d-none");
    }
}

/* ========================================================================
   FILAS INSUMOS MANUALES
======================================================================== */
function agregarFilaInsumo() {

    const tr = $(`
        <tr>
            <td>
                <select class="form-select sel-insumo"></select>
            </td>
            <td>
                <input type="number" class="form-control text-center cant-ins" value="1" step="0.001">
            </td>
            <td class="text-end costo-ins">$ 0,00</td>
            <td class="text-end sub-ins">$ 0,00</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="$(this).closest('tr').remove()">
                    <i class="fa fa-times"></i>
                </button>
            </td>
        </tr>
    `);

    $("#tbodyIns").append(tr);

    const $sel = tr.find(".sel-insumo");
    $sel.append(new Option("Seleccione...", ""));
    CATALOGO_INSUMOS.forEach(i => $sel.append(new Option(i.Nombre, i.Id)));

    $sel.select2({
        dropdownParent: $("#modalItems"),
        width: "100%"
    });

    $sel.on("change", () => recalcularFilaInsumo(tr));
    tr.find(".cant-ins").on("input", () => recalcularFilaInsumo(tr));
}

/* ========================================================================
   RECALCULAR FILAS
======================================================================== */
function recalcularFilaProducto(tr) {
    const id = Number(tr.find(".sel-producto").val());
    const cant = Number(tr.find(".cant-prod").val());
    const p = CATALOGO_PRODUCTOS.find(x => x.Id === id);
    const costo = p ? p.Costo : 0;

    tr.find(".costo-prod").text(fmtMon(costo));
    tr.find(".sub-prod").text(fmtMon(cant * costo));
}

function recalcularFilaInsumo(tr) {
    const id = Number(tr.find(".sel-insumo").val());
    const cant = Number(tr.find(".cant-ins").val());
    const i = CATALOGO_INSUMOS.find(x => x.Id === id);
    const costo = i ? i.Costo : 0;

    tr.find(".costo-ins").text(fmtMon(costo));
    tr.find(".sub-ins").text(fmtMon(cant * costo));
}

/* ========================================================================
   CONFIRMAR MODAL
======================================================================== */
function confirmarItemsModal() {

    // PRODUCTOS
    $("#tbodyProd tr.fila-producto").each(function () {

        const tr = $(this);
        const terminado = tr.find(".chk-terminado").is(":checked");
        const id = Number(tr.find(".sel-producto").val());
        const cant = Number(tr.find(".cant-prod").val());
        const prod = CATALOGO_PRODUCTOS.find(p => p.Id === id);
        if (!prod || cant <= 0) return;

        if (terminado) {
            agregarDetalle("P", prod.Id, prod.Nombre, cant, prod.Costo);
        } else {
            tr.next(".fila-insumos").find("tbody tr").each(function () {
                const insId = Number($(this).data("id"));
                const ins = CATALOGO_INSUMOS.find(i => i.Id === insId);
                const c = Number($(this).find("input").val());
                if (ins && c > 0) {
                    agregarDetalle("I", ins.Id, ins.Nombre, c, ins.Costo);
                }
            });
        }
    });

    // INSUMOS MANUALES
    $("#tbodyIns tr").each(function () {
        const id = Number($(this).find(".sel-insumo").val());
        const cant = Number($(this).find(".cant-ins").val());
        const ins = CATALOGO_INSUMOS.find(i => i.Id === id);
        if (ins && cant > 0) {
            agregarDetalle("I", ins.Id, ins.Nombre, cant, ins.Costo);
        }
    });

    refrescarTablaDetalle();
    bootstrap.Modal.getInstance("#modalItems").hide();
}

/* ========================================================================
   BUFFER
======================================================================== */
function agregarDetalle(tipo, refId, nombre, cant, costo) {
    let ex = DETALLES.find(d => d.Tipo === tipo && d.RefId === refId);
    if (ex) {
        ex.Cantidad += cant;
        ex.SubTotal = ex.Cantidad * ex.Costo;
    } else {
        DETALLES.push({
            TempId: TEMP_ID_SEQ++,
            Tipo: tipo === "P" ? "PRODUCTO" : "INSUMO",
            RefId: refId,
            Nombre: nombre,
            Cantidad: cant,
            Costo: costo,
            SubTotal: cant * costo
        });
    }
}

/* ========================================================================
   EDITAR / ELIMINAR
======================================================================== */
function abrirEditar(tempId) {
    const d = DETALLES.find(x => x.TempId === tempId);
    $("#editTempId").val(tempId);
    $("#editItemName").text(d.Nombre);
    $("#editCantidad").val(d.Cantidad);
    $("#editSubtotal").text(fmtMon(d.SubTotal));
    new bootstrap.Modal("#modalEditarCantidad").show();
}

function guardarCantidadEditada() {
    const id = Number($("#editTempId").val());
    const cant = Number($("#editCantidad").val());
    const d = DETALLES.find(x => x.TempId === id);
    if (!d || cant <= 0) return;

    d.Cantidad = cant;
    d.SubTotal = cant * d.Costo;

    refrescarTablaDetalle();
    bootstrap.Modal.getInstance("#modalEditarCantidad").hide();
}

function eliminarItem(tempId) {
    DETALLES = DETALLES.filter(x => x.TempId !== tempId);
    refrescarTablaDetalle();
}

/* ========================================================================
   GUARDAR
======================================================================== */
async function guardarMovimiento() {
    if (!DETALLES.length) return;

    const modelo = {
        Id: Number($("#IdMovimiento").val() || 0),
        IdTipoMovimiento: Number($("#IdTipoMovimiento").val()),
        Comentario: $("#Comentario").val(),
        StockMovimientosDetalles: DETALLES.map(d => ({
            TipoItem: d.Tipo[0],
            IdProducto: d.Tipo === "PRODUCTO" ? d.RefId : null,
            IdInsumo: d.Tipo === "INSUMO" ? d.RefId : null,
            Cantidad: d.Cantidad,
            CostoUnitario: d.Costo
        }))
    };

    await fetch("/Stock/Registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelo)
    });

    location.href = "/Stock/Index";
}

function volver() {
    location.href = "/Stock/Index";
}
