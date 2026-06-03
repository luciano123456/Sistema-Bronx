let gridProductos = null;
let gridInsumos = null;
let gridProductosModal = null;
let gridInsumosModal = null;
let isEditing = false;
let isEditingProducto = false;
/** Selección múltiple modal insumos: por IdInsumo (las filas DOM se recrean en cada draw). */
let idsInsumoSeleccionadosModal = [];
let ultimaFilaInsumoModalId = null;
let filaSeleccionadaInsumos = []; // Array para almacenar las filas seleccionadas
let filaSeleccionadaProductos = null; // Variable para almacenar la fila seleccionada
let facturaCliente = null;
const IdPedido = document.getElementById('IdPedido').value;

let cacheInsumosProducto = {};
let promesasInsumos = {};

function claveCacheInsumosProducto(idProducto, idColor) {
    const c = idColor == null || idColor === undefined || idColor === '' ? 0 : (parseInt(idColor, 10) || 0);
    return `${idProducto}_${c}`;
}

/** Cache insumos modal: distingue “sin parámetro idColor” (suma colores en servidor) de idColor=0 (solo sin color). */
function claveCacheInsumosPedidoModal(idProducto, idColorParam) {
    const f = idColorFiltroStockInsumosModal(idColorParam);
    if (f === null || f === undefined) return `${idProducto}_sinFiltroColor`;
    return `${idProducto}_${f}`;
}

/**
 * Filtro de color para saldos de insumo (`StockSaldos` tipo I) vía `GET /Productos/EditarInfo`.
 * - `null`: no se envía `idColor` → el servidor **no** filtra por color (suma todos los saldos del insumo).
 * - `0`: **solo sin color** (`IdColor` null/0 en `StockSaldos`), alineado con insumo “sin color”.
 * - `> 0`: saldo de ese color.
 * `-1` / vacío / no numérico → `null`.
 */
function idColorFiltroStockInsumosModal(idColor) {
    if (idColor == null || idColor === undefined || idColor === "") return null;
    const n = parseInt(String(idColor), 10);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
}

async function parseRespuestaEditarInfoProducto(response) {
    let data = await response.json();
    if (typeof data === "string") {
        return intentarParsearJson(data);
    }
    return data;
}

/** Mapa IdInsumo → stock depósito según color (sin query = suma colores; idColor=0 = solo sin color). */
async function obtenerMapaStockInsumosPorColorProducto(idProducto, idColorRaw) {
    const pid = parseInt(idProducto, 10) || 0;
    if (pid <= 0) return null;
    const idc = idColorFiltroStockInsumosModal(idColorRaw);
    const colorQ =
        idc === null || idc === undefined ? "" : `&idColor=${encodeURIComponent(idc)}`;
    const response = await fetch(`/Productos/EditarInfo?Id=${pid}${colorQ}`);
    if (!response.ok) return null;
    const data = await parseRespuestaEditarInfoProducto(response);
    if (!data) return null;
    const rawInsumos = data.Insumos ?? data.insumos;
    const arr = normalizarArrayDataTable(rawInsumos);
    const map = {};
    arr.forEach(i => {
        const idIns = parseInt(i.IdInsumo ?? i.Id, 10) || 0;
        if (!idIns) return;
        map[idIns] = getStockDisponibleFila(i);
    });
    return map;
}
let tokenCargaProducto = 0;
let timeoutSeleccionProducto = null;
let lastCantidadAFabricar = null;

/** Catálogo modal pedido: líneas producto×color (servidor). */
let _pedModalLineasConStock = [];
let _pedModalLineasSinStock = [];
/** Sub-modo UI del modal: 'pt' | 'fab' | 'ins' */
let pedidoModalPaneActivo = "pt";
/** True si la línea elegida es de fabricación (sin stock de producto terminado para ese color). */
let _pedModalLineaEsFabricacion = false;
/** Línea del pedido que ya salió del depósito como PT (no editable; solo eliminar y volver a agregar). */
let _pedModalStockPtPersistido = { activo: false, cantidad: 0 };

function parseIdInsumoModal(rowData) {
    if (!rowData) return 0;
    const id = rowData.IdInsumo ?? rowData.idInsumo ?? rowData.Id ?? rowData.id;
    const n = parseInt(id, 10);
    return isNaN(n) ? 0 : n;
}

/** FK a `PedidosDetalle` en filas de insumo (JSON puede venir `IdDetalle` o `idDetalle`). */
function insumoIdDetallePadre(ins) {
    if (!ins) return 0;
    const raw = ins.IdDetalle != null && ins.IdDetalle !== "" ? ins.IdDetalle : ins.idDetalle;
    return parseInt(raw, 10) || 0;
}

function idsDetalleProductoPedido(rowProducto) {
    const a = parseInt(rowProducto?.Id ?? rowProducto?.id, 10) || 0;
    const b = parseInt(rowProducto?.IdDetalle ?? rowProducto?.idDetalle, 10) || 0;
    return new Set([a, b].filter(x => x > 0));
}

function aplicarSeleccionVisualInsumosModal() {
    if (!gridInsumosModal) return;
    $('#grd_Insumos_Modal tbody tr').removeClass('selected');
    $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
    gridInsumosModal.rows().every(function () {
        const d = this.data();
        const id = parseIdInsumoModal(d);
        if (id && idsInsumoSeleccionadosModal.indexOf(id) !== -1) {
            const node = this.node();
            if (node) {
                $(node).addClass('selected');
                $('td', node).addClass('selected');
            }
        }
    });
}

function limpiarSeleccionInsumosModal() {
    idsInsumoSeleccionadosModal = [];
    ultimaFilaInsumoModalId = null;
    $('#grd_Insumos_Modal tbody tr').removeClass('selected');
    $('#grd_Insumos_Modal tbody tr td').removeClass('selected');
}

/** Cantidades / insumos: sin símbolo $ (formatNumber de site.js es moneda). */
function formatCantidadPedido(val) {
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (val == null || val === '' || isNaN(n)) return '0,00';
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/** Número desde API o string (coma decimal es-AR, punto miles). */
function parseNumeroFlexible(val) {
    if (val == null || val === "") return 0;
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    const s = String(val).trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Respuestas `ObtenerDatosPedido` con System.Text.Json usan camelCase en propiedades;
 * el grid y `JSON.stringify(row)` conservan esas claves.
 */
function cantidadStockProductoDesdeFilaPedido(p) {
    if (!p) return 0;
    return parseNumeroFlexible(
        p.CantidadStockProducto ?? p.cantidadStockProducto ?? p.CantidadUsadaStock ?? p.cantidadUsadaStock ?? 0
    );
}

function usaStockProductoDesdeFilaPedido(p) {
    if (!p) return false;
    const cant = cantidadStockProductoDesdeFilaPedido(p);
    if (cant > 0) return true;
    return (
        p.UsaStockProducto === true ||
        p.usaStockProducto === true ||
        Number(p.UsaStockProducto) === 1 ||
        Number(p.usaStockProducto) === 1
    );
}

function idProductoDetallePedido(p) {
    return parseInt(p?.IdProducto ?? p?.idProducto, 10) || 0;
}

function idColorDetallePedido(p) {
    const raw = p?.IdColor ?? p?.idColor;
    if (raw == null || raw === "") return 0;
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? 0 : n;
}

function usaStockInsumoProcesoPedido(r) {
    if (!r) return false;
    return (
        r.UsaStock === true ||
        r.usaStock === true ||
        Number(r.UsaStock) === 1 ||
        Number(r.usaStock) === 1
    );
}

function cantidadStockInsumoProcesoPedido(r) {
    if (!r) return 0;
    return parseNumeroFlexible(
        r.CantidadStock ??
            r.cantidadStock ??
            r.CantidadStockInsumo ??
            r.cantidadStockInsumo ??
            r.CantidadUsadaStock ??
            r.cantidadUsadaStock ??
            0
    );
}

/** Cantidad de insumo por 1 unidad de producto a fabricar (modal pedido). */
function cantidadInicialInsumoPedidoModal(rowData, cantidadAFabricar) {
    let ci = parseNumeroFlexible(rowData?.CantidadInicial);
    if (ci > 0) return ci;
    const qFab = cantidadAFabricar > 0 ? cantidadAFabricar : (parseFloat($('#ProductoModalCantidad').val()) || 0);
    const cantLinea = parseNumeroFlexible(rowData?.Cantidad);
    if (qFab > 0 && cantLinea > 0) return cantLinea / qFab;
    return 0;
}

function stockInsumoDeposito(row) {
    return parseNumeroFlexible(row?.Stock ?? row?.StockDisponible);
}

/** True si la línea de proceso consume cantidad desde depósito de insumos. */
function insumoUsaDepositoEnPedido(row) {
    if (!row) return false;
    const cant = cantidadStockInsumoProcesoPedido(row);
    const usa = usaStockInsumoProcesoPedido(row);
    return usa && cant > 0;
}

/**
 * Stock de insumo **ya guardado** en el pedido al abrir «Editar producto».
 * No confundir con tildar «usar stock» antes de guardar: ahí `_insumoCantidadStockDesdeDb` sigue en 0.
 */
function insumoStockDepositoYaPersistidoEnPedido(row) {
    if (!row || !isEditingProducto) return false;
    return parseNumeroFlexible(row._insumoCantidadStockDesdeDb) > 0;
}

/**
 * Columna "stock" del modal de insumos:
 * - **Agregar** (`!isEditingProducto`): si usás stock de **producto terminado**, badge informativo **USA STOCK PRODUCTO**
 *   (no se descuentan insumos del depósito); si no, STOCK DISPONIBLE / SIN STOCK o USA STOCK del insumo.
 * - **Editar** (`isEditingProducto`): USA STOCK insumo; con PT del depósito **USA STOCK PRODUCTO**; HAY STOCK / NO USA STOCK.
 */
function modalInsumoBadgeStockResumen(row) {
    const tituloPt =
        "La salida de depósito es por producto terminado; este insumo no descuenta stock del depósito (solo informativo).";

    if (!isEditingProducto) {
        if (insumoUsaDepositoEnPedido(row)) {
            return `<span class="badge bg-success">USA STOCK</span>`;
        }
        if (productoTerminadoUsaStockEnModal()) {
            return `<span class="badge bg-primary" title="${tituloPt}">USA STOCK PRODUCTO</span>`;
        }
        const dep = stockInsumoDeposito(row);
        if (dep > 0) {
            return `<span class="badge bg-info text-dark">STOCK DISPONIBLE</span>`;
        }
        return `<span class="badge bg-secondary">SIN STOCK</span>`;
    }

    if (insumoUsaDepositoEnPedido(row)) {
        return `<span class="badge bg-success">USA STOCK</span>`;
    }

    if (productoTerminadoUsaStockEnModal()) {
        return `<span class="badge bg-primary" title="${tituloPt}">USA STOCK PRODUCTO</span>`;
    }

    const dep = stockInsumoDeposito(row);
    if (dep > 0) {
        return `<span class="badge bg-success" title="Hay saldo en depósito; podés marcar «Usar stock»."><i class="fa fa-check me-1" aria-hidden="true"></i>HAY STOCK</span>`;
    }
    return `<span class="badge bg-secondary" title="Esta línea no está tomando stock del depósito.">NO USA STOCK</span>`;
}

/** Campos alineados con ProcesoDetalleCambioSignificativo (servidor): si cambian, se renueva la fecha del proceso. */
function insumoSnapshotCamposFecha(d) {
    if (!d) return {};
    return {
        IdEstado: d.IdEstado,
        IdColor: idColorDetallePedido(d),
        Cantidad: parseFloat(d.Cantidad ?? d.cantidad ?? 0) || 0,
        Especificacion: d.Especificacion ?? '',
        Comentarios: d.Comentarios ?? '',
        CantidadStock: parseNumeroFlexible(d.CantidadStock ?? d.cantidadStock ?? d.CantidadStockInsumo ?? d.cantidadStockInsumo ?? d.CantidadUsadaStock ?? d.cantidadUsadaStock ?? 0),
        UsaStock: usaStockInsumoProcesoPedido(d) ? 1 : 0,
        PrecioUnitario: parseFloat(d.PrecioUnitario || 0) || 0,
        SubTotal: parseFloat(d.SubTotal || 0) || 0
    };
}

function insumoCambioParaFecha(prev, d) {
    const n = insumoSnapshotCamposFecha(d);
    return (prev.IdEstado ?? 0) !== (n.IdEstado ?? 0)
        || (prev.IdColor ?? 0) !== (n.IdColor ?? 0)
        || prev.Cantidad !== n.Cantidad
        || (prev.Especificacion || '') !== (n.Especificacion || '')
        || (prev.Comentarios || '') !== (n.Comentarios || '')
        || prev.CantidadStock !== n.CantidadStock
        || prev.UsaStock !== n.UsaStock
        || prev.PrecioUnitario !== n.PrecioUnitario
        || prev.SubTotal !== n.SubTotal;
}

function tocarFechaActualizacionInsumoSiCambio(d, prev) {
    if (!d || !prev) return;
    if (insumoCambioParaFecha(prev, d))
        d.FechaActualizacion = new Date().toISOString();
}

function estadoStockProductoSegunInsumos(rowProducto) {
    if (!gridInsumos || !rowProducto) return null;

    const idsDetalle = idsDetalleProductoPedido(rowProducto);
    if (idsDetalle.size === 0) return null;

    let total = 0;
    let conUsoDeposito = 0;

    gridInsumos.rows().every(function () {
        const ins = this.data();
        const idInsumoDetalle = insumoIdDetallePadre(ins);
        if (!idsDetalle.has(idInsumoDetalle)) return;

        total++;
        if (insumoUsaDepositoEnPedido(ins)) {
            conUsoDeposito++;
        }
    });

    if (total <= 0) return null;
    if (conUsoDeposito <= 0) return "sin";
    if (conUsoDeposito >= total) return "ok";
    return "parcial";
}

/** True si la línea de producto toma producto terminado desde depósito. */
function productoUsaStockTerminadoEnPedido(row) {
    return usaStockProductoDesdeFilaPedido(row);
}

function pedidoLineaUsaStockProductoTerminado(cantidadStockProducto, usaStockProducto) {
    const cant = parseFloat(cantidadStockProducto ?? 0) || 0;
    if (cant <= 0) return false;
    return usaStockProducto === true || Number(usaStockProducto) === 1;
}

/** Línea de pedido con salida de depósito por producto terminado ya guardada (no se edita en modal). */
function pedidoLineaUsaStockPtGuardado(row) {
    if (!row) return false;
    const cant = cantidadStockProductoDesdeFilaPedido(row);
    return pedidoLineaUsaStockProductoTerminado(cant, usaStockProductoDesdeFilaPedido(row));
}

function resetPedModalStockPtPersistido() {
    _pedModalStockPtPersistido = { activo: false, cantidad: 0 };
}

/** Checkbox «Usar stock PT» en grilla modal de producto (lee fila + edición persistida). */
function usaStockPtFilaModalProducto(row) {
    if (!row) return false;
    if (_pedModalStockPtPersistido.activo && isEditingProducto) {
        return parseNumeroFlexible(_pedModalStockPtPersistido.cantidad) > 0;
    }
    const cant = cantidadStockProductoDesdeFilaPedido(row);
    return pedidoLineaUsaStockProductoTerminado(cant, usaStockProductoDesdeFilaPedido(row));
}

function cantidadStockPtFilaModalProducto(row) {
    if (!row) return 0;
    if (_pedModalStockPtPersistido.activo && isEditingProducto) {
        return parseNumeroFlexible(_pedModalStockPtPersistido.cantidad);
    }
    return cantidadStockProductoDesdeFilaPedido(row);
}

/** Tras cada draw de `grd_Productos_Modal`, sincroniza checkbox/cant. PT con datos de fila. */
function maximoCantidadStockPtModal(cantidadPedido, stockDisponible) {
    const qPed = parseFloat(cantidadPedido) || 0;
    const st = parseFloat(stockDisponible) || 0;
    if (_pedModalStockPtPersistido.activo && isEditingProducto) {
        const guardada = parseNumeroFlexible(_pedModalStockPtPersistido.cantidad);
        return qPed > 0 ? qPed : (guardada > 0 ? guardada : 0);
    }
    if (st <= 0) return 0;
    return Math.min(st, qPed > 0 ? qPed : st);
}

function aplicarControlesStockPtGrillaModalProducto() {
    if (!gridProductosModal) return;
    gridProductosModal.rows().every(function () {
        const row = this.data();
        const node = this.node();
        if (!row || !node) return;
        const usa = usaStockPtFilaModalProducto(row);
        const cant = cantidadStockPtFilaModalProducto(row);
        const $tr = $(node);
        $tr.find(".chk-usa-stock-producto").prop("checked", usa);
        const $txt = $tr.find(".txt-cantidad-stock-producto");
        $txt.val(cant);
        $txt.prop("disabled", !usa);
        if (usa) {
            const cantPed = parseFloat($("#ProductoModalCantidad").val()) || parseFloat(row.Cantidad ?? row.cantidad) || 0;
            const stockDisp = parseFloat(row.Stock ?? row.stock ?? 0) || 0;
            $txt.attr("max", maximoCantidadStockPtModal(cantPed, stockDisp));
        }
        row.UsaStockProducto = usa;
        row.CantidadStockProducto = cant;
    });
}

/** Si el detalle de producto del pedido usa stock PT guardado (para insumos hijos). */
function infoStockPtDetallePedido(idDetalle) {
    const id = parseInt(idDetalle, 10) || 0;
    if (!id || !gridProductos) return null;
    let info = null;
    gridProductos.rows().every(function () {
        const p = this.data();
        if (!idsDetalleProductoPedido(p).has(id)) return;
        if (!pedidoLineaUsaStockPtGuardado(p)) return;
        info = {
            cantPt: cantidadStockProductoDesdeFilaPedido(p),
            cantPed: parseFloat(p.Cantidad ?? p.cantidad) || 0
        };
    });
    return info;
}

function insumoCubiertoPorProductoTerminadoEnPedido(insumoRow) {
    const idDet = insumoIdDetallePadre(insumoRow);
    if (!idDet) return false;
    const info = infoStockPtDetallePedido(idDet);
    return !!info && info.cantPt > 0;
}

/** Columna «Usa stock» en grilla Procesos e Insumos del pedido. */
function badgeStockResumenLineaInsumoPedido(row) {
    if (insumoCubiertoPorProductoTerminadoEnPedido(row)) {
        const titulo =
            "La salida de depósito es por producto terminado; este insumo no descuenta stock del depósito.";
        return `<span class="badge bg-primary" title="${titulo}">USA STOCK PRODUCTO</span>`;
    }
    if (insumoUsaDepositoEnPedido(row)) {
        return `<span class="badge bg-success">USA STOCK</span>`;
    }
    return `<span class="badge bg-secondary">NO USA STOCK</span>`;
}

function cantidadStockMostrarLineaInsumoPedido(row) {
    if (insumoCubiertoPorProductoTerminadoEnPedido(row)) {
        const cant = parseFloat(row.Cantidad ?? row.cantidad) || 0;
        if (cant > 0) {
            return `<span style="font-weight:bold">${formatCantidadPedido(cant)}</span>`;
        }
        const info = infoStockPtDetallePedido(insumoIdDetallePadre(row));
        if (info && info.cantPed > 0) {
            const ci = parseNumeroFlexible(row.CantidadInicial ?? row.cantidadInicial);
            if (ci > 0) {
                return `<span style="font-weight:bold">${formatCantidadPedido(ci * info.cantPed)}</span>`;
            }
        }
        return `<span style="color:#6c757d">0</span>`;
    }
    const usado = cantidadStockInsumoProcesoPedido(row);
    if (usado <= 0) {
        return `<span style="color:#6c757d">0</span>`;
    }
    return `<span style="font-weight:bold">${formatCantidadPedido(usado)}</span>`;
}

/** IdDetalle → { cantPt, cantPed, cubreTodo } para no descontar insumos cuando el PT cubre toda la línea. */
function mapaStockPtPorDetallePedido() {
    const m = Object.create(null);
    if (!gridProductos) return m;
    gridProductos.rows().every(function () {
        const p = this.data();
        const id = parseInt(p.Id ?? p.id, 10) || 0;
        if (!id) return;
        const cantPtVal = cantidadStockProductoDesdeFilaPedido(p);
        const usaPt = usaStockProductoDesdeFilaPedido(p);
        const cantPt = pedidoLineaUsaStockProductoTerminado(cantPtVal, usaPt) ? cantPtVal : 0;
        const cantPed = parseFloat(p.Cantidad ?? p.cantidad) || 0;
        m[id] = { cantPt, cantPed, cubreTodo: cantPt > 0 && cantPed > 0 && cantPt >= cantPed };
    });
    return m;
}

function cantidadStockDepositoInsumoAlPersistir(insumoRow, detalleUsaPtCompleto) {
    if (detalleUsaPtCompleto) return 0;
    const usa = usaStockInsumoProcesoPedido(insumoRow);
    if (!usa) return 0;
    return cantidadStockInsumoProcesoPedido(insumoRow);
}

/** Badge columna stock producto en `grd_Productos`: PT depósito vs insumos depósito (parcial). */
function badgeStockResumenLineaProductoPedido(row) {
    const usaPt = productoUsaStockTerminadoEnPedido(row);
    const estadoInsumos = estadoStockProductoSegunInsumos(row);

    if (usaPt) {
        return `<span class="badge bg-success">USA STOCK</span>`;
    }
    if (estadoInsumos === "ok" || estadoInsumos === "parcial") {
        return `<span class="badge bg-warning text-dark">USA STOCK PARCIAL</span>`;
    }
    if (estadoInsumos === "sin") {
        return `<span class="badge bg-secondary">NO USA STOCK</span>`;
    }

    const usa = usaStockProductoDesdeFilaPedido(row);
    const cantidad = cantidadStockProductoDesdeFilaPedido(row);
    if (usa && cantidad > 0) {
        return `<span class="badge bg-success">USA STOCK</span>`;
    }
    return `<span class="badge bg-secondary">NO USA STOCK</span>`;
}

function actualizarPedidoModalTabsEdicionBloqueo() {
    const dis = !!isEditingProducto;
    document.querySelectorAll('.ped-modal-seg[data-ped-modal-pane="pt"], .ped-modal-seg[data-ped-modal-pane="fab"]').forEach(b => {
        b.disabled = dis;
    });
}

/**
 * Ajusta visibilidad de columnas según pestaña del modal.
 */
function aplicarVisibilidadColumnasStockProductoModal() {
    const esFabricacion = pedidoModalPaneActivo === "fab";
    const host = document.getElementById("listaProductos");
    if (host) {
        host.classList.toggle("ped-modal-cat-fabricacion", esFabricacion);
    }
    if (gridProductosModal) {
        try {
            // 0 Desc, 1 Color, 2 Categoria, 3 Stock, 4 Usa stock PT, 5 Cant. stock PT, 6 Precio venta
            gridProductosModal.column(1).visible(!esFabricacion, false); // Color
            gridProductosModal.column(3).visible(!esFabricacion, false);
            gridProductosModal.column(4).visible(!esFabricacion, false); // Usa stock PT
            gridProductosModal.column(5).visible(!esFabricacion, false); // Cant. stock PT
            gridProductosModal.column(6).visible(true, false);
            gridProductosModal.columns.adjust().draw(false);
        } catch (e) { /* no-op */ }
    }
}

function obtenerLineasBaseModalProductos() {
    if (isEditingProducto && gridProductosModal && gridProductosModal.rows().count() === 1) {
        return normalizarArrayDataTable(gridProductosModal.rows().data().toArray());
    }
    if (pedidoModalPaneActivo === "fab") return normalizarArrayDataTable(_pedModalLineasSinStock);
    return normalizarArrayDataTable(_pedModalLineasConStock);
}

function filtrarLineasModalProductos(lineas) {
    if (isEditingProducto) {
        // En edición el modal debe mostrar exclusivamente la línea editada.
        return normalizarArrayDataTable(lineas);
    }

    const bus = ($("#busqueda").val() || "").toString().toLowerCase().trim();
    const $cat = $("#Categorias");
    const valSel = ($cat.val() ?? "").toString().trim();
    const textoSel = ($cat.find("option:selected").text() || "").toString().toLowerCase().trim();
    const esTodos = valSel === "" || valSel === "-1" || textoSel === "" || textoSel === "todos";

    return normalizarArrayDataTable(lineas).filter(row => {
        const nombre = (row?.Nombre ?? "").toString().toLowerCase().trim();
        const colorBase = (row?.Color ?? "").toString().toLowerCase().trim();
        const categoria = (row?.Categoria ?? "").toString().toLowerCase().trim();
        const idColRow = parseInt(row?.IdColor, 10) || 0;
        const stockRow = parseFloat(row?.Stock) || 0;
        // Fabricación (catálogo): fila sin PT — el color se elige después; sumamos el color del
        // desplegable "Colores" al texto buscable para que no desaparezca al buscar "cromo", etc.
        let color = colorBase;
        if (stockRow <= 0 && idColRow === 0) {
            const selId = parseInt($("#Colores").val(), 10) || 0;
            const selTxt = ($("#Colores option:selected").text() || "").toString().toLowerCase().trim();
            if (selId > 0 && selTxt) {
                color = [colorBase, selTxt].filter(Boolean).join(" ");
            }
        }

        if (bus) {
            const blob = [nombre, color, categoria].join(" ");
            if (blob.indexOf(bus) === -1) return false;
        }

        if (!esTodos && categoria.indexOf(textoSel) === -1) return false;
        return true;
    });
}

function obtenerNombreColorPorId(idColor) {
    const id = parseInt(idColor, 10) || 0;
    if (id <= 0) return "";
    const $opt = $("#Colores option").filter(function () {
        return (parseInt($(this).val(), 10) || 0) === id;
    }).first();
    return ($opt.text() || "").toString().trim();
}

function forzarColorInsumosModalDesdeProducto(colorId, colorTexto) {
    if (!gridInsumosModal) return;
    const id = parseInt(colorId, 10);
    const txt = (colorTexto || "").toString().trim() || obtenerNombreColorPorId(id) || ($("#Colores option:selected").text() || "").toString().trim() || "-";

    gridInsumosModal.rows().every(function () {
        const rowData = this.data() || {};
        if (!Number.isNaN(id) && id >= 0) rowData.IdColor = id;
        rowData.Color = txt;
        this.data(rowData);
    });
    gridInsumosModal.draw(false);
}

function restaurarSeleccionProductoModalSiCorresponde(idProductoEsperado) {
    if (!gridProductosModal || !idProductoEsperado || isEditingProducto) return;
    let node = null;
    gridProductosModal.rows().every(function () {
        const d = this.data();
        if (parseInt(d.Id, 10) === idProductoEsperado) {
            node = this.node();
            return false;
        }
    });
    if (!node) return;
    filaSeleccionadaProductos = node;
    $(node).addClass("selected");
    $("td", node).addClass("selected");
}

function redrawModalProductosSiHayGrilla() {
    if (gridProductosModal) {
        try {
            const pidGuardado = parseInt($("#ProductoModalId").val() || "0", 10) || 0;
            const base = obtenerLineasBaseModalProductos();
            const filtradas = filtrarLineasModalProductos(base);
            filaSeleccionadaProductos = null;
            $("#grd_Productos_Modal tbody tr").removeClass("selected");
            $("#grd_Productos_Modal tbody tr td").removeClass("selected");
            gridProductosModal.clear().rows.add(filtradas).draw(false);
            aplicarVisibilidadColumnasStockProductoModal();
            forzarReflowTablaModalProductos();
            if (pidGuardado > 0) {
                restaurarSeleccionProductoModalSiCorresponde(pidGuardado);
            }
        } catch (e) { /* no-op */ }
    }
}

function forzarReflowTablaModalProductos() {
    if (!gridProductosModal) return;
    const ajustes = () => {
        try { gridProductosModal.columns.adjust().draw(false); } catch (e) { /* no-op */ }
    };
    requestAnimationFrame(ajustes);
    setTimeout(ajustes, 40);
    setTimeout(ajustes, 120);
}

/** Limpia búsqueda/categoría del modal producto (coherente con filtros vía DataTables, no manipulación directa del DOM). */
function resetFiltrosVistaModalProductos() {
    $("#busqueda").val("");
    const $cat = $("#Categorias");
    if (!$cat.length) {
        redrawModalProductosSiHayGrilla();
        return;
    }
    let todosVal = null;
    $cat.find("option").each(function () {
        if ($(this).text().trim().toLowerCase() === "todos") {
            todosVal = $(this).attr("value");
            return false;
        }
    });
    if (todosVal != null) {
        $cat.val(todosVal);
    }
    redrawModalProductosSiHayGrilla();
}

let _debounceRedrawModalProductosBusq = null;

function limpiarSeleccionModalProductoYCampos() {
    filaSeleccionadaProductos = null;
    $("#grd_Productos_Modal tbody tr").removeClass("selected");
    $("#grd_Productos_Modal tbody tr td").removeClass("selected");
    void limpiarInformacionProducto();
}

/**
 * Cambia la solapa interna del modal de pedido (producto terminado / fabricación / insumos).
 * @param {string} pane 'pt' | 'fab' | 'ins'
 * @param {{ skipReloadProductosGrid?: boolean }} [opts]
 */
function setPedidoModalPane(pane, opts) {
    opts = opts || {};
    const p = pane === "fab" ? "fab" : pane === "ins" ? "ins" : "pt";
    const anterior = pedidoModalPaneActivo;

    document.querySelectorAll("#productoModal .ped-modal-seg").forEach(btn => {
        const on = btn.getAttribute("data-ped-modal-pane") === p;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    pedidoModalPaneActivo = p;

    const areaProd = document.getElementById("pedModalAreaProducto");
    if (areaProd) {
        areaProd.classList.remove("d-none");
        if (p === "ins") {
            setTimeout(() => {
                const el = document.getElementById("pedModalInlineInsumos");
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
                try {
                    gridInsumosModal?.columns?.adjust();
                } catch (e) { /* no-op */ }
            }, 80);
        } else {
            setTimeout(() => {
                try {
                    forzarReflowTablaModalProductos();
                } catch (e) { /* no-op */ }
            }, 50);
        }
    }

    const tituloLista = document.getElementById("pedModalListaTitulo");
    if (tituloLista) {
        if (p === "fab") {
            tituloLista.textContent = "Todos los productos — fabricación con insumos (elegí el color al añadir)";
        } else if (p === "pt") {
            tituloLista.textContent = "Productos con stock (terminados)";
        }
    }

    if (opts.skipReloadProductosGrid) {
        aplicarVisibilidadColumnasStockProductoModal();
        lastCantidadAFabricar = null;
        controlarUsoStockInsumosOptimizado();
        return;
    }

    if (anterior !== p && (p === "pt" || p === "fab") && (anterior === "pt" || anterior === "fab")) {
        limpiarSeleccionModalProductoYCampos();
    }

    if (p === "pt" || p === "fab") {
        const data = p === "fab" ? _pedModalLineasSinStock : _pedModalLineasConStock;
        configurarDataTableProductosModal(normalizarArrayDataTable(data));
    }

    aplicarVisibilidadColumnasStockProductoModal();
    lastCantidadAFabricar = null;
    controlarUsoStockInsumosOptimizado();
}

/** Cantidad de insumo por 1 unidad de producto en el pedido (evita re-multiplicar al editar). */
function enriquecerInsumosConCantidadInicial(insumos, detalleProductos) {
    const detalle = normalizarArrayDataTable(detalleProductos);
    const mapaQtyProducto = {};
    detalle.forEach(d => {
        const id = parseInt(d.Id, 10);
        if (!isNaN(id)) mapaQtyProducto[id] = Math.max(1, parseFloat(d.Cantidad) || 1);
    });
    return normalizarArrayDataTable(insumos).map(row => {
        const idDet = insumoIdDetallePadre(row);
        const qProd = mapaQtyProducto[idDet] || 1;
        const cantLinea = parseFloat(row.Cantidad) || 0;
        const cantidadInicial = cantLinea / Math.max(1, qProd);
        return { ...row, CantidadInicial: cantidadInicial };
    });
}

function obtenerCantidadProductoPedidoPorIdDetalle(idDetalle) {
    if (!gridProductos) return 1;
    let q = 1;
    gridProductos.rows().every(function () {
        const p = this.data();
        if (parseInt(p.Id, 10) === parseInt(idDetalle, 10)) {
            q = Math.max(1, parseFloat(p.Cantidad) || 1);
            return false;
        }
    });
    return q;
}

let _listaEstadosPedidoCache = null;
async function getListaEstadosPedidoCached() {
    if (!_listaEstadosPedidoCache) _listaEstadosPedidoCache = await listaEstadosFilter();
    return _listaEstadosPedidoCache;
}

/** Sin stock de producto → PEDIR; usar stock de producto → ENTREGAR; si no, insumo con stock en depósito → ENTREGAR. */
async function aplicarEstadosPorDefectoFilasInsumos(insumosFilas) {
    if (!insumosFilas || !insumosFilas.length) return;

    const estados = await getListaEstadosPedidoCached();
    const nom = (x) => (x.Nombre || '').trim().toUpperCase();
    const estPedir = estados.find(x => nom(x) === 'PEDIR') || estados.find(x => nom(x).includes('PEDIR'));
    const estEntregar = estados.find(x => nom(x) === 'ENTREGAR') || estados.find(x => nom(x).includes('ENTREGAR'));
    if (!estPedir || !estEntregar) return;

    const prodRow = obtenerFilaProductoModalSeleccionadaData();
    const ctrl = obtenerControlesStockProductoFilaSeleccionada();
    const stockProd = parseFloat(prodRow?.Stock ?? 0) || 0;
    const usaStockProd = !!(ctrl && ctrl.chk && ctrl.chk.is(':checked'));

    for (const row of insumosFilas) {
        const stockIns = stockInsumoDeposito(row);
        if (stockProd <= 0) {
            row.IdEstado = estPedir.Id;
            row.Estado = estPedir.Nombre;
        } else if (usaStockProd) {
            row.IdEstado = estEntregar.Id;
            row.Estado = estEntregar.Nombre;
        } else if (stockIns > 0) {
            row.IdEstado = estEntregar.Id;
            row.Estado = estEntregar.Nombre;
        } else {
            row.IdEstado = estPedir.Id;
            row.Estado = estPedir.Nombre;
        }
    }
}

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

    $('#Colores, #Categorias').on('select2:open', function () {
        setTimeout(function () {
            const search = document.querySelector('.select2-container--open .select2-search__field');
            if (search) search.focus();
        }, 0);
    });

    await Promise.all([listaColores(), listaClientes(), listaFormasdepago()]);
    void getListaEstadosPedidoCached();




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





    $("#Categorias").on("change select2:select", function () {
        redrawModalProductosSiHayGrilla();
    });

    $("#busqueda").on("keyup input", function () {
        clearTimeout(_debounceRedrawModalProductosBusq);
        _debounceRedrawModalProductosBusq = setTimeout(redrawModalProductosSiHayGrilla, 120);
    });

    $(document).on("click", "#productoModal .ped-modal-seg", function () {
        if (this.disabled) return;
        const pane = this.getAttribute("data-ped-modal-pane");
        if (!pane) return;
        setPedidoModalPane(pane);
    });

    $("#productoModal").on("hidden.bs.modal", function () {
        isEditingProducto = false;
        actualizarPedidoModalTabsEdicionBloqueo();
        $("#Colores").prop("disabled", false);
        setPedidoModalPane("pt", { skipReloadProductosGrid: true });
    });

    $("#productoModal").on("shown.bs.modal", function () {
        setTimeout(() => {
            forzarReflowTablaModalProductos();
            try { gridInsumosModal?.columns?.adjust().draw(false); } catch (e) { /* no-op */ }
        }, 80);
    });
});

async function cargarDatosPedido(id) {
    $("#tituloPedido").text(`Editar Pedido ${id}`);
    const datosPedido = await ObtenerDatosPedido(id);
    const detalleProd = normalizarArrayDataTable(datosPedido.PedidoDetalle);
    const insumosEnriquecidos = enriquecerInsumosConCantidadInicial(datosPedido.PedidoDetalleProceso, detalleProd);
    await Promise.all([
        configurarDataTableProductos(detalleProd),
        configurarDataTableInsumos(insumosEnriquecidos)
    ]);
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

/** Una sola fila por (Id producto, Id color) en el catálogo del modal. */
function dedupePedidoModalLineasCatalogo(arr) {
    const list = normalizarArrayDataTable(arr);
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
        const row = list[i];
        const k = `${parseInt(row.Id, 10) || 0}_${parseInt(row.IdColor, 10) || 0}`;
        if (!map.has(k)) {
            map.set(k, row);
        }
    }
    return Array.from(map.values());
}

function obtenerFilaProductoModalSeleccionadaData() {
    if (!filaSeleccionadaProductos || !gridProductosModal) return null;
    if (!document.body.contains(filaSeleccionadaProductos)) {
        filaSeleccionadaProductos = null;
        return null;
    }
    return gridProductosModal.row(filaSeleccionadaProductos).data();
}

/** Índice de fila en la grilla modal para leer controles de stock de producto (incluye edición con una sola fila). */
function obtenerIndiceFilaStockProductoModal() {
    if (filaSeleccionadaProductos && gridProductosModal && document.body.contains(filaSeleccionadaProductos)) {
        return gridProductosModal.row(filaSeleccionadaProductos).index();
    }
    if (isEditingProducto && gridProductosModal && gridProductosModal.rows().count() === 1) {
        return 0;
    }
    return null;
}

function obtenerControlesStockProductoFilaSeleccionada() {
    if (!gridProductosModal) return null;

    if (filaSeleccionadaProductos && document.body.contains(filaSeleccionadaProductos)) {
        const $tr = $(filaSeleccionadaProductos);
        const idx = gridProductosModal.row(filaSeleccionadaProductos).index();
        return {
            rowIndex: idx,
            chk: $tr.find(".chk-usa-stock-producto"),
            txt: $tr.find(".txt-cantidad-stock-producto")
        };
    }

    if (isEditingProducto && gridProductosModal.rows().count() === 1) {
        const tr = gridProductosModal.row(0).node();
        if (!tr) return null;
        const $tr = $(tr);
        return {
            rowIndex: 0,
            chk: $tr.find(".chk-usa-stock-producto"),
            txt: $tr.find(".txt-cantidad-stock-producto")
        };
    }

    return null;
}

function sincronizarStockProductoSeleccionadoConCantidad() {
    const producto = obtenerFilaProductoModalSeleccionadaData();
    const controles = obtenerControlesStockProductoFilaSeleccionada();

    if (!producto || !controles) return;

    const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
    const stockDisponible = parseFloat(producto.Stock ?? producto.stock ?? 0) || 0;

    if (_pedModalStockPtPersistido.activo) {
        const cantGuardada = parseNumeroFlexible(_pedModalStockPtPersistido.cantidad);
        controles.chk.prop('checked', cantGuardada > 0);
        controles.txt.prop('disabled', cantGuardada <= 0);
        controles.txt.val(cantGuardada);
        return;
    }

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

        rowData.Cantidad = Math.round((parseNumeroFlexible(rowData.CantidadInicial) * cantidad) * 100) / 100;
        rowData.SubTotal = Math.round((parseFloat(rowData.CostoUnitario || 0) * rowData.Cantidad) * 100) / 100;

        if (!insumoStockDepositoYaPersistidoEnPedido(rowData)) {
            if (rowData.CantidadStock != null) {
                if (parseFloat(rowData.CantidadStock) > rowData.Cantidad) {
                    rowData.CantidadStock = rowData.Cantidad;
                }
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
            deferRender: true,
            paging: false,
            scrollX: true,
            scrollY: "400px",
            scrollCollapse: true,
            searching: false,
            ordering: false,
            info: false,
            drawCallback: function () {
                aplicarControlesStockPtGrillaModalProducto();
            },
            columns: [
                { data: 'Nombre' },
                { data: 'Color' },
                { data: 'Categoria' },
                {
                    data: 'Stock',
                    render: function (data, type, row) {
                        if (_pedModalStockPtPersistido.activo && isEditingProducto) {
                            return `<span class="badge bg-success" title="Esta línea ya usa producto terminado del depósito">USA STOCK</span>`;
                        }
                        const stock = parseFloat(data) || 0;

                        if (stock <= 0) {
                            return `<span style="color:#dc3545;font-weight:bold">SIN STOCK</span>`;
                        }
                        if (stock < 5) {
                            return `<span style="color:#ffc107;font-weight:bold">${formatCantidadPedido(stock)}</span>`;
                        }

                        return `<span style="color:#28a745;font-weight:bold">${formatCantidadPedido(stock)}</span>`;
                    }
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        const usa = usaStockPtFilaModalProducto(row);
                        const checked = usa ? "checked" : "";
                        return `
                            <div class="form-check d-flex justify-content-center align-items-center m-0">
                                <input class="form-check-input chk-usa-stock-producto"
                                       type="checkbox" ${checked}>
                            </div>
                        `;
                    }
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        const usa = usaStockPtFilaModalProducto(row);
                        const cant = cantidadStockPtFilaModalProducto(row);
                        const disabled = usa ? "" : "disabled";
                        return `
                            <input type="number"
                                   class="form-control form-control-sm txt-cantidad-stock-producto"
                                   min="0"
                                   step="0.01"
                                   value="${cant}"
                                   ${disabled}>
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
                { data: 'Id', visible: false },
                { data: 'IdColor', visible: false }
            ],
            initComplete: function () {
                aplicarVisibilidadColumnasStockProductoModal();
                setTimeout(() => {
                    forzarReflowTablaModalProductos();
                    resetFiltrosVistaModalProductos();
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

                            if (filaSeleccionadaProductos === this) {
                                return;
                            }

                            filaSeleccionadaProductos = this;

                            $(this).addClass('selected');
                            $('td', this).addClass('selected');
                            _pedModalLineaEsFabricacion =
                                pedidoModalPaneActivo === "fab" || (parseFloat(data.Stock) || 0) <= 0;

                            if (!isEditingProducto) {
                                await cargarInformacionProducto(data.Id, data.IdColor, data.Color);
                                if (pedidoModalPaneActivo === "pt") {
                                    // Refuerzo: al elegir producto terminado, todos sus insumos heredan su color.
                                    forzarColorInsumosModalDesdeProducto(data.IdColor, data.Color);
                                }
                                const esFabricacion = pedidoModalPaneActivo === "fab";
                                if (esFabricacion) {
                                    // En fabricación el color siempre se elige manualmente al añadir.
                                    $("#Colores").val("-1").trigger("change.select2");
                                    $("#Colores").prop("disabled", false);
                                } else {
                                    const colorFijado = (parseInt(data.IdColor, 10) || 0) > 0;
                                    $("#Colores").prop("disabled", colorFijado);
                                }
                            }

                        }, 120); // 🔥 ultra rápido pero evita spam
                    });

                $('#grd_Productos_Modal tbody')
                    .off('change', '.chk-usa-stock-producto')
                    .on('change', '.chk-usa-stock-producto', function () {

                        const $tr = $(this).closest('tr');
                        const tr = $tr[0];
                        if (!tr || !gridProductosModal) return;

                        const rowApi = gridProductosModal.row(tr);
                        const rowData = rowApi.data();
                        if (!rowData) return;

                        const input = $tr.find('.txt-cantidad-stock-producto');

                        const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
                        const stockDisponible = parseFloat(rowData.Stock ?? rowData.stock) || 0;
                        const maximo = maximoCantidadStockPtModal(cantidadPedido, stockDisponible);

                        if ($(this).is(':checked')) {
                            input.prop('disabled', false);
                            input.attr('max', maximo);
                            const auto = maximo > 0 ? maximo : 0;
                            if (auto > 0) input.val(auto);
                            rowData.UsaStockProducto = true;
                            rowData.CantidadStockProducto = auto;
                        } else {
                            input.prop('disabled', true);
                            input.val(0);
                            rowData.UsaStockProducto = false;
                            rowData.CantidadStockProducto = 0;
                        }
                        rowApi.data(rowData);

                        controlarUsoStockInsumos();

                        void (async () => {
                            if (!gridInsumosModal) return;
                            const refs = [];
                            gridInsumosModal.rows().every(function () { refs.push(this.data()); });
                            await aplicarEstadosPorDefectoFilasInsumos(refs);
                            gridInsumosModal.rows().every(function (i) {
                                this.data(refs[i]);
                            });
                            gridInsumosModal.draw(false);
                        })();
                    });

                $('#grd_Productos_Modal tbody')
                    .off('input', '.txt-cantidad-stock-producto')
                    .on('input', '.txt-cantidad-stock-producto', function () {

                        const $tr = $(this).closest('tr');
                        const tr = $tr[0];
                        if (!tr || !gridProductosModal) return;

                        const rowApi = gridProductosModal.row(tr);
                        const rowData = rowApi.data();
                        if (!rowData) return;

                        const cantidadPedido = parseFloat($('#ProductoModalCantidad').val()) || 0;
                        const stockDisponible = parseFloat(rowData.Stock ?? rowData.stock) || 0;

                        let valor = parseFloat($(this).val()) || 0;

                        const maximo = maximoCantidadStockPtModal(cantidadPedido, stockDisponible);

                        if (valor < 0) valor = 0;
                        if (valor > maximo) valor = maximo;

                        $(this).val(valor);

                        const chk = $tr.find('.chk-usa-stock-producto');

                        if (valor > 0) {
                            chk.prop('checked', true);
                            $(this).prop('disabled', false);
                            rowData.UsaStockProducto = true;
                            rowData.CantidadStockProducto = valor;
                        } else {
                            chk.prop('checked', false);
                            $(this).prop('disabled', true);
                            rowData.UsaStockProducto = false;
                            rowData.CantidadStockProducto = 0;
                        }
                        rowApi.data(rowData);

                        controlarUsoStockInsumos();
                    });


                
               
            }
        });
    } else {
        filaSeleccionadaProductos = null;
        $("#grd_Productos_Modal tbody tr").removeClass("selected");
        $("#grd_Productos_Modal tbody tr td").removeClass("selected");
        gridProductosModal.clear().rows.add(dataFinal).draw(false);
        aplicarVisibilidadColumnasStockProductoModal();
        setTimeout(() => {
            forzarReflowTablaModalProductos();
            resetFiltrosVistaModalProductos();
            aplicarControlesStockPtGrillaModalProducto();
        }, 0);
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
            info: false,
            drawCallback: function () {
                aplicarSeleccionVisualInsumosModal();
                const viaPt = productoTerminadoUsaStockEnModal();
                if (isEditingProducto) {
                    $('#grd_Insumos_Modal tbody tr').each(function () {
                        const apiRow = gridInsumosModal.row(this);
                        const d = apiRow.data();
                        $(this).toggleClass('insumo-fila-stock-pedido', !!d && insumoStockDepositoYaPersistidoEnPedido(d));
                        $(this).toggleClass('insumo-fila-via-pt-producto', viaPt);
                    });
                } else {
                    $('#grd_Insumos_Modal tbody tr').removeClass('insumo-fila-stock-pedido insumo-fila-via-pt-producto');
                }
            },
            columns: [
                { data: 'Nombre' },
                { data: 'Cantidad' },
                {
                    data: 'Stock',
                    render: function (data, type, row) {
                        return modalInsumoBadgeStockResumen(row);
                    }
                },
                {
                    data: 'UsaStock',
                    render: function (data, type, row, meta) {
                        if (productoTerminadoUsaStockEnModal()) {
                            return `
            <div class="form-check d-flex justify-content-center align-items-center m-0">
                <input class="form-check-input chk-usa-stock-insumo chk-insumo-stock-via-pt"
                       type="checkbox"
                       data-row="${meta.row}"
                       checked
                       disabled
                       title="Cubierto por producto terminado del depósito (informativo).">
            </div>
        `;
                        }
                        if (insumoStockDepositoYaPersistidoEnPedido(row)) {
                            return `
            <div class="form-check d-flex justify-content-center align-items-center m-0">
                <input class="form-check-input chk-usa-stock-insumo chk-insumo-stock-pedido"
                       type="checkbox"
                       data-row="${meta.row}"
                       checked
                       disabled
                       title="Este insumo ya tiene stock del depósito guardado en el pedido. Guardá o revertí desde el pedido para cambiarlo.">
            </div>
        `;
                        }
                        if (isEditingProducto && insumoUsaDepositoEnPedido(row)) {
                            const checked = row.UsaStock === true || Number(row.UsaStock) === 1 ? 'checked' : '';
                            return `
            <div class="form-check d-flex justify-content-center align-items-center m-0">
                <input class="form-check-input chk-usa-stock-insumo chk-insumo-stock-ok"
                       type="checkbox"
                       data-row="${meta.row}"
                       ${checked}
                       title="Podés destildar antes de guardar si no querés usar stock del depósito.">
            </div>
        `;
                        }
                        const stockReal = stockInsumoDeposito(row);
                        const sinSaldo = stockReal <= 0;
                        const disabled = sinSaldo ? 'disabled' : '';
                        const checked = row.UsaStock === true || Number(row.UsaStock) === 1 ? 'checked' : '';
                        const chkCls = sinSaldo
                            ? 'chk-usa-stock-insumo chk-insumo-stock-sin-saldo'
                            : 'chk-usa-stock-insumo chk-insumo-stock-ok';

                        return `
            <div class="form-check d-flex justify-content-center align-items-center m-0">
                <input class="form-check-input ${chkCls}"
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
                        if (productoTerminadoUsaStockEnModal()) {
                            const qtyInfo = cantidadInformativaInsumoCubiertoPorProductoTerminado(row);
                            return `
                            <input type="text"
                                   readonly
                                   class="form-control form-control-sm txt-cant-stock-insumo txt-cant-stock-insumo-via-pt"
                                   data-row="${meta.row}"
                                   value="${formatCantidadPedido(qtyInfo)}"
                                   title="Cantidad de insumo para la cantidad de producto del pedido (receta × cantidad). Con PT del depósito no se descuenta insumo del depósito; es informativo.">
                        `;
                        }
                        if (insumoStockDepositoYaPersistidoEnPedido(row)) {
                            const q = parseNumeroFlexible(row.CantidadStock ?? row.CantidadUsadaStock ?? 0);
                            return `
                            <input type="text"
                                   readonly
                                   class="form-control form-control-sm txt-cant-stock-insumo txt-cant-stock-insumo-pedido"
                                   data-row="${meta.row}"
                                   value="${formatCantidadPedido(q)}"
                                   title="Cantidad ya tomada del depósito para esta línea (solo lectura).">
                        `;
                        }
                        const stockDisponible = parseFloat(row.Stock ?? row.StockDisponible ?? 0) || 0;
                        const cantidad = parseFloat(row.Cantidad || 0) || 0;
                        const maximo = Math.min(stockDisponible, cantidad);
                        const disabled = 'disabled';

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
                        return formatCantidadPedido(data);
                    },
                    targets: [1]
                },
                {
                    render: function (data) {
                        return formatNumber(data);
                    },
                    targets: [5, 6]
                }
            ],
            initComplete: function () {
                setTimeout(function () {
                    gridInsumosModal.columns.adjust();
                }, 250);

                void getListaEstadosPedidoCached();

                $('#grd_Insumos_Modal tbody').off('click', 'tr').on('click', 'tr', function (event) {
                    if ($(event.target).closest('input, select, button, textarea, label').length) return;

                    const $fila = $(this);
                    const idIns = parseIdInsumoModal(gridInsumosModal.row($fila).data());
                    if (!idIns) return;

                    const ctrlPresionado = event.ctrlKey || event.metaKey;
                    const shiftPresionado = event.shiftKey;

                    if (ctrlPresionado) {
                        const index = idsInsumoSeleccionadosModal.indexOf(idIns);
                        if (index === -1) {
                            idsInsumoSeleccionadosModal.push(idIns);
                        } else {
                            idsInsumoSeleccionadosModal.splice(index, 1);
                        }
                    } else if (shiftPresionado && ultimaFilaInsumoModalId != null) {
                        const ordenIds = [];
                        $('#grd_Insumos_Modal tbody tr').each(function () {
                            const id = parseIdInsumoModal(gridInsumosModal.row($(this)).data());
                            if (id) ordenIds.push(id);
                        });
                        const indexActual = ordenIds.indexOf(idIns);
                        const indexUltima = ordenIds.indexOf(ultimaFilaInsumoModalId);
                        if (indexActual !== -1 && indexUltima !== -1) {
                            const inicio = Math.min(indexActual, indexUltima);
                            const fin = Math.max(indexActual, indexUltima);
                            for (let i = inicio; i <= fin; i++) {
                                const id = ordenIds[i];
                                if (idsInsumoSeleccionadosModal.indexOf(id) === -1) {
                                    idsInsumoSeleccionadosModal.push(id);
                                }
                            }
                        }
                    } else {
                        idsInsumoSeleccionadosModal = [idIns];
                    }

                    ultimaFilaInsumoModalId = idIns;
                    aplicarSeleccionVisualInsumosModal();
                });

                $('#grd_Insumos_Modal tbody')
                    .off('change', '.chk-usa-stock-insumo')
                    .on('change', '.chk-usa-stock-insumo', function () {

                        const $tr = $(this).closest('tr');
                        const apiRow = gridInsumosModal.row($tr);
                        const rowData = apiRow.data();
                        if (!rowData) return;

                        const prev = insumoSnapshotCamposFecha(rowData);
                        const rowIndex = apiRow.index();
                        const input = $(`.txt-cant-stock-insumo[data-row="${rowIndex}"]`);

                        const stockDisponible = parseNumeroFlexible(rowData.Stock ?? rowData.StockDisponible);

                        const cantidadAFabricar = obtenerCantidadAFabricar();
                        const cantidadPorUnidad = cantidadInicialInsumoPedidoModal(rowData, cantidadAFabricar);

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

                            tocarFechaActualizacionInsumoSiCambio(rowData, prev);
                            apiRow.data(rowData).draw(false);
                            return;
                        }

                        const checked = $(this).is(':checked');
                        rowData.UsaStock = checked ? 1 : 0;

                        if (rowData.UsaStock === 1) {
                            const necesario = cantidadNecesaria;
                            if (stockDisponible < necesario) {
                                if (typeof advertenciaModal === 'function') {
                                    advertenciaModal(`No alcanza el stock de este insumo. Necesitás ${formatCantidadPedido(necesario)} y hay ${formatCantidadPedido(stockDisponible)}.`);
                                }
                                $(this).prop('checked', false);
                                rowData.UsaStock = 0;
                                rowData.CantidadStock = 0;
                                input.val(0).prop('disabled', true);
                                tocarFechaActualizacionInsumoSiCambio(rowData, prev);
                                apiRow.data(rowData).draw(false);
                                return;
                            }
                            rowData.CantidadStock = necesario;
                            input.prop('disabled', true);
                            input.attr('max', maximo);
                            input.val(necesario);
                            if (_listaEstadosPedidoCache) {
                                const ent = _listaEstadosPedidoCache.find(x => (x.Nombre || '').trim().toUpperCase() === 'ENTREGAR')
                                    || _listaEstadosPedidoCache.find(x => (x.Nombre || '').toUpperCase().includes('ENTREGAR'));
                                if (ent) {
                                    rowData.IdEstado = ent.Id;
                                    rowData.Estado = ent.Nombre;
                                }
                            }
                        } else {
                            rowData.CantidadStock = 0;
                            input.prop('disabled', true);
                            input.val(0);
                        }

                        tocarFechaActualizacionInsumoSiCambio(rowData, prev);
                        apiRow.data(rowData).draw(false);
                    });

                $('#grd_Insumos_Modal tbody')
                    .off('input', '.txt-cant-stock-insumo:not(.txt-cant-stock-insumo-pedido):not(.txt-cant-stock-insumo-via-pt)')
                    .on('input', '.txt-cant-stock-insumo:not(.txt-cant-stock-insumo-pedido):not(.txt-cant-stock-insumo-via-pt)', function () {

                        const $tr = $(this).closest('tr');
                        const apiRow = gridInsumosModal.row($tr);
                        const rowData = apiRow.data();
                        if (!rowData) return;

                        const prev = insumoSnapshotCamposFecha(rowData);

                        const stockDisponible = parseNumeroFlexible(rowData.Stock ?? rowData.StockDisponible);

                        const cantidadAFabricar = obtenerCantidadAFabricar();
                        const cantidadPorUnidad = cantidadInicialInsumoPedidoModal(rowData, cantidadAFabricar);

                        const cantidadNecesaria = cantidadPorUnidad * cantidadAFabricar;

                        const maximo = Math.min(stockDisponible, cantidadNecesaria);

                        let valor = parseFloat($(this).val()) || 0;

                        if (valor < 0) valor = 0;
                        if (valor > maximo) valor = maximo;

                        rowData.CantidadStock = valor;
                        rowData.UsaStock = valor > 0 ? 1 : 0;

                        $(this).val(valor);

                        tocarFechaActualizacionInsumoSiCambio(rowData, prev);
                        apiRow.data(rowData).draw(false);
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
                        if (productoTerminadoUsaStockEnModal()) {
                            isEditing = false;
                            if (typeof advertenciaModal === 'function') {
                                advertenciaModal(
                                    'Los insumos están cubiertos por producto terminado del depósito. Editá cantidad, precio o color del producto arriba.'
                                );
                            }
                            return;
                        }
                        if (insumoStockDepositoYaPersistidoEnPedido(rowData)) {
                            isEditing = false;
                            if (typeof advertenciaModal === 'function') {
                                advertenciaModal('Este insumo ya tiene stock del depósito guardado en el pedido; no se puede editar desde acá.');
                            }
                            return;
                        }
                        if (insumoUsaStock(rowData)) {
                            isEditing = false;
                            if (typeof advertenciaModal === 'function') {
                                advertenciaModal('Este insumo usa stock y no permite edición manual.');
                            }
                            return;
                        }

                        async function saveEdit(newText, newValue) {
                            const idCelda = parseIdInsumoModal(rowData);
                            const idsEditar =
                                idsInsumoSeleccionadosModal.length > 0
                                    ? idsInsumoSeleccionadosModal.slice()
                                    : (idCelda ? [idCelda] : []);

                            let stockPorInsumoMap = null;
                            if (dataSrc === 'Color') {
                                const pidModal = parseInt(document.getElementById("ProductoModalId")?.value, 10) || 0;
                                if (pidModal > 0) {
                                    stockPorInsumoMap = await obtenerMapaStockInsumosPorColorProducto(pidModal, newValue);
                                }
                            }

                            gridInsumosModal.rows().every(function () {
                                const d = this.data();
                                const idRow = parseIdInsumoModal(d);
                                if (idsEditar.indexOf(idRow) === -1) return;

                                const prev = insumoSnapshotCamposFecha(d);

                                if (dataSrc === 'Color') {
                                    d.IdColor = parseInt(newValue, 10) || 0;
                                    d.Color = newText;
                                    if (stockPorInsumoMap) {
                                        const idIns = parseIdInsumoModal(d);
                                        const st = stockPorInsumoMap[idIns];
                                        const disp = typeof st === 'number' ? st : 0;
                                        d.Stock = disp;
                                        d.StockDisponible = disp;
                                    }
                                } else if (dataSrc === 'Estado') {
                                    d.IdEstado = parseInt(newValue, 10) || 0;
                                    d.Estado = newText;
                                } else if (dataSrc === 'Cantidad') {
                                    const cantidad = parseFloat(newValue) || 0;
                                    d.Cantidad = cantidad;
                                    const qFab = obtenerCantidadAFabricar();
                                    d.CantidadInicial = qFab > 0 ? (cantidad / qFab) : (parseFloat(d.CantidadInicial) || 0);
                                    if (parseFloat(d.CantidadStock || 0) > cantidad) {
                                        d.CantidadStock = cantidad;
                                        d.UsaStock = cantidad > 0 ? d.UsaStock : 0;
                                    }
                                } else {
                                    d[dataSrc] = newText;
                                }

                                tocarFechaActualizacionInsumoSiCambio(d, prev);
                                this.data(d);
                            });

                            idsInsumoSeleccionadosModal = [];
                            ultimaFilaInsumoModalId = null;
                            gridInsumosModal.draw(false);
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
        limpiarSeleccionInsumosModal();
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

        if (!_pedModalLineaEsFabricacion && !_pedModalStockPtPersistido.activo) {
            const productoSel = obtenerFilaProductoModalSeleccionadaData();
            const stockDisponible = parseFloat(productoSel?.Stock) || 0;
            if (stockDisponible > 0 && cantidad > stockDisponible) {
                cantidad = stockDisponible;
                $(this).val(cantidad);
                if (typeof advertenciaModal === 'function') {
                    advertenciaModal(`No tenés stock suficiente del producto terminado. Stock disponible: ${formatCantidadPedido(stockDisponible)}.`);
                }
            }
        }

        // 🔥 1. RECALCULAR INSUMOS
        recalcularInsumosPorCantidadProducto();

        // 🔥 2. SINCRONIZAR STOCK PRODUCTO
        sincronizarStockProductoSeleccionadoConCantidad();

        // 🔥 3. CONTROLAR STOCK INSUMOS
        controlarUsoStockInsumosOptimizado();

        if (productoTerminadoUsaStockEnModal() && gridInsumosModal) {
            gridInsumosModal.draw(false);
        }

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

$('#Colores').on('change', async function () {
    var idColorSeleccionado = $(this).val();
    const idColorFiltro = idColorFiltroStockInsumosModal(idColorSeleccionado);

    if (pedidoModalPaneActivo === "fab" && gridProductosModal) {
        redrawModalProductosSiHayGrilla();
    }

    if (!isEditingProducto && idColorFiltro !== null && (pedidoModalPaneActivo === "fab" || pedidoModalPaneActivo === "pt")) {
        const pid = document.getElementById("ProductoModalId")?.value;
        if (pid) {
            await cargarInformacionProducto(parseInt(pid, 10), idColorFiltro);
        }
    }

    // Verificar si hay filas en gridInsumosModal
    var filasEnGrid = gridInsumosModal.rows().data().length;

    // Si no hay filas en el grid, no hacer nada
    if (filasEnGrid === 0) {
        return; // Detener la ejecución si no hay filas
    }
    var colorSeleccionadoTexto = $('#Colores option:selected').text(); // El texto es el nombre del color

    if (idsInsumoSeleccionadosModal.length > 0) {
        gridInsumosModal.rows().every(function () {
            var rowData = this.data();
            if (idsInsumoSeleccionadosModal.indexOf(parseIdInsumoModal(rowData)) === -1) return;
            const prev = insumoSnapshotCamposFecha(rowData);
            rowData.Color = colorSeleccionadoTexto;
            rowData.IdColor = idColorSeleccionado;
            tocarFechaActualizacionInsumoSiCambio(rowData, prev);
            this.data(rowData);
        });
        gridInsumosModal.draw(false);
    } else {
        gridInsumosModal.rows().every(function () {
            var rowData = this.data();
            const prev = insumoSnapshotCamposFecha(rowData);
            rowData.Color = colorSeleccionadoTexto;
            rowData.IdColor = idColorSeleccionado;
            tocarFechaActualizacionInsumoSiCambio(rowData, prev);
            this.data(rowData);
        });
        gridInsumosModal.draw(false);
    }
});

$('#btnEliminarInsumo').on('click', function () {
    if (productoTerminadoUsaStockEnModal()) {
        if (typeof advertenciaModal === "function") {
            advertenciaModal(
                "No podés quitar insumos mientras el producto usa stock terminado del depósito. Editá el producto arriba o eliminá la línea del pedido."
            );
        }
        return;
    }

    if (idsInsumoSeleccionadosModal.length === 0) {
        alert("No tienes ninguna fila seleccionada.");
        return;
    }

    for (let i = 0; i < idsInsumoSeleccionadosModal.length; i++) {
        const idSel = idsInsumoSeleccionadosModal[i];
        let bloqueada = false;
        gridInsumosModal.rows().every(function () {
            const d = this.data();
            if (parseIdInsumoModal(d) === idSel && insumoStockDepositoYaPersistidoEnPedido(d)) {
                bloqueada = true;
            }
        });
        if (bloqueada) {
            if (typeof advertenciaModal === "function") {
                advertenciaModal("No se puede eliminar un insumo que ya tiene stock del depósito guardado en el pedido.");
            } else {
                alert("No se puede eliminar un insumo que ya tiene stock del depósito guardado en el pedido.");
            }
            return;
        }
    }

    var cantidadFilasTotales = gridInsumosModal.data().length;
    var cantidadFilasSeleccionadas = idsInsumoSeleccionadosModal.length;

    if (cantidadFilasTotales - cantidadFilasSeleccionadas < 1) {
        alert("No puedes eliminar todas las filas. Debe quedar al menos un insumo.");
        return;
    }

    var confirmacion = confirm("¿Deseas eliminar " + cantidadFilasSeleccionadas + " registro(s)?");

    if (confirmacion) {
        var idsQuitar = idsInsumoSeleccionadosModal.slice();
        gridInsumosModal.rows(function (idx, data) {
            return idsQuitar.indexOf(parseIdInsumoModal(data)) !== -1;
        }).remove();
        limpiarSeleccionInsumosModal();
        gridInsumosModal.draw(false);
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
            scrollX: true,
            scrollCollapse: true,
            deferRender: true,
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
                        return badgeStockResumenLineaProductoPedido(row);
                    }
                },

                {
                    data: 'CantidadStockProducto',
                    render: function (data, type, row) {

                        const stock = parseFloat(row.Stock ?? row.stock ?? 0) || 0;
                        const cantPt = cantidadStockProductoDesdeFilaPedido(row);

                        if (stock <= 0) {
                            return `<span style="color:#dc3545">0</span>`;
                        }

                        return `<span style="font-weight:bold">
                    ${cantPt || 0}
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
                        const idDet = row.Id ?? row.id;
                        return `
                  <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(${JSON.stringify(row)})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                </button>
                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${idDet})' title='Eliminar'>
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
                        return formatCantidadPedido(data);
                    },
                    "targets": [4]
                },
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [8, 10, 11, 12] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
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
            scrollX: true,
            scrollCollapse: true,
            deferRender: true,
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
                        return badgeStockResumenLineaInsumoPedido(row);
                    }
                },
                {
                    data: 'CantidadStockInsumo',
                    render: function (data, type, row) {
                        return cantidadStockMostrarLineaInsumoPedido(row);
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
                        return formatCantidadPedido(data);
                    },
                    "targets": [3]
                },
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear números
                    },
                    "targets": [6, 7] // Índices de las columnas de números
                },

            ],

            initComplete: async function () {
                void getListaEstadosPedidoCached();

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
                                const prev = insumoSnapshotCamposFecha(d);

                                if (dataSrc === 'Color') {
                                    d.IdColor = parseInt(newValue) || 0;
                                    d.Color = newText;
                                } else if (dataSrc === 'Estado') {
                                    d.IdEstado = parseInt(newValue) || 0;
                                    d.Estado = newText;
                                } else if (dataSrc === 'Cantidad') {
                                    const cantidad = parseFloat(newValue) || 0;
                                    d.Cantidad = cantidad;
                                    const qProd = obtenerCantidadProductoPedidoPorIdDetalle(insumoIdDetallePadre(d));
                                    d.CantidadInicial = qProd > 0 ? (cantidad / qProd) : (parseFloat(d.CantidadInicial ?? d.cantidadInicial) || 0);
                                    if (cantidadStockInsumoProcesoPedido(d) > cantidad) {
                                        d.CantidadStock = cantidad;
                                        d.UsaStock = cantidad > 0 ? d.UsaStock : 0;
                                    }
                                } else {
                                    d[dataSrc] = newText;
                                }

                                tocarFechaActualizacionInsumoSiCambio(d, prev);
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

    const rowIndexStock = gridProductosModal ? obtenerIndiceFilaStockProductoModal() : null;
    if (rowIndexStock != null && gridProductosModal) {
        const rowProducto = gridProductosModal.row(rowIndexStock).data();

        if (rowProducto) {
            stockDisponibleProducto = parseFloat(rowProducto.Stock ?? rowProducto.stock ?? 0) || 0;

            if (!_pedModalLineaEsFabricacion && Cantidad > stockDisponibleProducto) {
                errorModal(`No tenés stock suficiente del producto terminado. Stock disponible: ${formatCantidadPedido(stockDisponibleProducto)}.`);
                return false;
            }

            if (_pedModalLineaEsFabricacion) {
                usaStockProducto = 0;
                cantidadStockProducto = 0;
            } else {
                const ctrl = obtenerControlesStockProductoFilaSeleccionada();
                if (!ctrl || !ctrl.chk.length) {
                    usaStockProducto = 0;
                    cantidadStockProducto = 0;
                } else {
                    usaStockProducto = ctrl.chk.is(":checked") ? 1 : 0;
                    cantidadStockProducto = usaStockProducto ? (parseFloat(ctrl.txt.val()) || 0) : 0;

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
        }
    }

    let colorValido = true;

    if (gridInsumosModal) {
        gridInsumosModal.rows().every(function () {
            let insumoData = this.data();
            const idc = parseInt(insumoData.IdColor ?? insumoData.idColor, 10) || 0;
            if (!idc || idc === 0) {
                colorValido = false;
            }
        });
    }

    if (!colorValido) {
        errorModal("Uno de los insumos no tiene color.");
        return false;
    }

    if (gridInsumosModal) {
        controlarUsoStockInsumos();
        let errorStockInsumo = false;

        gridInsumosModal.rows().every(function () {

            const insumoData = this.data();

            const usaStock = usaStockInsumoProcesoPedido(insumoData);
            if (!usaStock) return; // 🔥 SI NO USA STOCK → IGNORAR

            const cantInsumo = parseFloat(insumoData.Cantidad ?? insumoData.cantidad ?? 0) || 0;
            const cantStockInsumo = cantidadStockInsumoProcesoPedido(insumoData);

            if (cantStockInsumo > cantInsumo) {
                errorStockInsumo = true;
            }
        });

        if (errorStockInsumo) {
            errorModal("Uno o más insumos tienen una cantidad de stock inválida.");
            return false;
        }
    }
    if (editando) {
        const detalleUsaPtCompleto = pedidoLineaUsaStockProductoTerminado(cantidadStockProducto, usaStockProducto) &&
            cantidadStockProducto >= Cantidad;

        gridProductos.rows().every(function () {
            const data = this.data();

            if (parseInt(data.Id ?? data.id, 10) == parseInt(IdProductoEditando, 10)) {
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

                if (parseInt(insumoDataInsumos.IdDetalle ?? insumoDataInsumos.idDetalle, 10) === parseInt(IdProductoEditando, 10) &&
                    parseInt(insumoDataInsumos.IdInsumo ?? insumoDataInsumos.idInsumo, 10) === parseInt(insumoData.IdInsumo ?? insumoData.idInsumo, 10)) {
                    const prev = insumoSnapshotCamposFecha(insumoDataInsumos);

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
                    const cantStockIns = cantidadStockDepositoInsumoAlPersistir(insumoData, detalleUsaPtCompleto);
                    insumoDataInsumos.UsaStock = cantStockIns > 0 ? 1 : 0;
                    insumoDataInsumos.CantidadStock = cantStockIns;

                    tocarFechaActualizacionInsumoSiCambio(insumoDataInsumos, prev);

                    this.data(insumoDataInsumos).draw();
                }
            });
        });

    } else {
        const detalleUsaPtCompleto = pedidoLineaUsaStockProductoTerminado(cantidadStockProducto, usaStockProducto) &&
            cantidadStockProducto >= Cantidad;

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
            const cantStockIns = cantidadStockDepositoInsumoAlPersistir(insumoData, detalleUsaPtCompleto);

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
                UsaStock: cantStockIns > 0 ? 1 : 0,
                CantidadStock: cantStockIns
            }).draw();
        });
    }

    isEditingProducto = false;
    actualizarPedidoModalTabsEdicionBloqueo();

    await limpiarInformacionProducto();
    $('#Colores').val('-1').trigger('change');
    $('#productoModal').modal('hide');
    if (gridProductos) {
        gridProductos.draw(false);
    }
    calcularDatosPedido();

    return true;
}

async function cargarDatosProductoModal() {
    await listaCategorias();

    const response = await fetch("/Productos/CatalogoPedidoModal");
    if (!response.ok) {
        errorModal("No se pudo cargar el catálogo de productos para el pedido.");
        return;
    }
    const j = await response.json();
    _pedModalLineasConStock = dedupePedidoModalLineasCatalogo(j.lineasConStock);
    _pedModalLineasSinStock = dedupePedidoModalLineasCatalogo(j.lineasSinStock);
    setPedidoModalPane("pt");
}


async function ObtenerDatosCliente(id) {
    const url = `/Clientes/EditarInfo?Id=${id}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function ObtenerInsumosProducto(id, idColor) {
    const idc = idColorFiltroStockInsumosModal(idColor);
    const colorQ =
        idc == null || idc === undefined || idc === ""
            ? ""
            : `&idColor=${encodeURIComponent(idc)}`;
    const url = `/Productos/EditarInfo?Id=${id}${colorQ}`;
    const response = await fetch(url);
    const data = await parseRespuestaEditarInfoProducto(response);
    return data;
}

async function limpiarInformacionProducto() {
    limpiarSeleccionInsumosModal();
    filaSeleccionadaProductos = null;
    _pedModalLineaEsFabricacion = false;
    resetPedModalStockPtPersistido();
    $("#Colores").prop("disabled", false);

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
}

async function cargarInformacionProducto(id, idColor, colorTextoProducto) {
    const miToken = ++tokenCargaProducto;
    const cacheKey = claveCacheInsumosPedidoModal(id, idColor);

    try {
        let data = null;

        if (cacheInsumosProducto[cacheKey]) {
            data = cacheInsumosProducto[cacheKey];
        } else {
            if (!promesasInsumos[cacheKey]) {
                promesasInsumos[cacheKey] = ObtenerInsumosProducto(id, idColor);
            }

            data = await promesasInsumos[cacheKey];
            cacheInsumosProducto[cacheKey] = data;
            delete promesasInsumos[cacheKey];
        }

        // Si mientras esperaba se seleccionó otro producto, no pises el modal
        if (miToken !== tokenCargaProducto) return;

        await procesarProducto(data, idColor, colorTextoProducto);
        if (pedidoModalPaneActivo === "pt") {
            forzarColorInsumosModalDesdeProducto(idColor, colorTextoProducto);
        }
    } catch (error) {
        delete promesasInsumos[cacheKey];
        console.error("Error cargando insumos del producto:", error);
        errorModal("No se pudieron cargar los insumos del producto.");
    }
}

async function procesarProducto(insumosProducto, idColorSeleccionado, colorTextoProducto) {
    if (!insumosProducto) return;

    const rawInsumos = insumosProducto.Insumos ?? insumosProducto.insumos;
    const insumos = normalizarArrayDataTable(rawInsumos).map(i => ({
        ...i,
        Stock: getStockDisponibleFila(i),
        StockDisponible: getStockDisponibleFila(i),
        Cantidad: parseNumeroFlexible(i.Cantidad),
        CantidadInicial: parseNumeroFlexible(i.CantidadInicial ?? i.Cantidad),
        CantidadStock: parseNumeroFlexible(i.CantidadStock || 0),
        UsaStock: Number(i.UsaStock) === 1 ? 1 : 0
    }));

    await aplicarEstadosPorDefectoFilasInsumos(insumos);

    if (gridInsumosModal == null) {
        configurarDataTableInsumosModal(insumos, false);
    } else {
        gridInsumosModal.clear().rows.add(insumos).draw(false);
    }

    let totalInsumos = 0;
    insumos.forEach(i => {
        totalInsumos += parseFloat(i.SubTotal || 0) || 0;
    });

    const producto = insumosProducto.Producto || {};
    const selColorFiltro = idColorFiltroStockInsumosModal(idColorSeleccionado);
    const colorSelectId = idColorFiltroStockInsumosModal($("#Colores").val());
    const fromProduct = parseInt(producto.IdColor, 10);
    const colorProducto =
        selColorFiltro !== null
            ? selColorFiltro
            : (colorSelectId !== null ? colorSelectId : (Number.isNaN(fromProduct) ? 0 : fromProduct));
    const colorSelectTexto = ($("#Colores option:selected").text() || "").toString().trim();
    const colorProductoTexto =
        ((colorTextoProducto ?? producto.Color ?? "").toString().trim()) ||
        obtenerNombreColorPorId(colorProducto) ||
        colorSelectTexto;

    if (pedidoModalPaneActivo === "pt") {
        insumos.forEach(i => {
            if (selColorFiltro !== null) {
                i.IdColor = selColorFiltro;
            } else if (colorProducto > 0) {
                i.IdColor = colorProducto;
            } else if (!Number.isNaN(fromProduct) && fromProduct === 0) {
                i.IdColor = 0;
            }
            i.Color = colorProductoTexto || "-";
        });
    }

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

    if (selColorFiltro !== null) {
        $('#Colores').val(String(selColorFiltro)).trigger('change.select2');
    } else if (colorProducto > 0) {
        $('#Colores').val(String(colorProducto)).trigger('change.select2');
    } else if (colorProducto === 0 && (colorSelectId === 0 || fromProduct === 0)) {
        $('#Colores').val("0").trigger('change.select2');
    }

    if (pedidoModalPaneActivo === "pt") {
        forzarColorInsumosModalDesdeProducto(colorProducto, colorProductoTexto);
    }

    const qModal = parseFloat($('#ProductoModalCantidad').val());
    if (!isNaN(qModal) && qModal > 0) {
        recalcularInsumosPorCantidadProducto();
    }

    controlarUsoStockInsumosOptimizado();

    setTimeout(() => {
        try {
            gridInsumosModal?.columns?.adjust();
        } catch (e) { /* no-op */ }
    }, 120);
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
   

    // Stock por color viene del detalle del pedido (API); no usar lista genérica de productos.
    const stockReal =
        parseFloat(producto.Stock ?? producto.stock ?? producto.StockDisponible ?? producto.stockDisponible ?? 0) || 0;
    const cantPtLinea = cantidadStockProductoDesdeFilaPedido(producto);
    const usaPtLinea = usaStockProductoDesdeFilaPedido(producto);
    const idProdModal = idProductoDetallePedido(producto);
    const idColModal = idColorDetallePedido(producto);
    const idDetallePedido = parseInt(producto.Id ?? producto.id, 10) || 0;

    if (pedidoLineaUsaStockPtGuardado(producto)) {
        _pedModalStockPtPersistido = { activo: true, cantidad: cantPtLinea };
    } else {
        resetPedModalStockPtPersistido();
    }

    _pedModalLineaEsFabricacion = stockReal <= 0 && cantPtLinea <= 0;

    // =========================================================
    // 3) ARMAR PRODUCTO PARA MODAL
    // =========================================================
    const productoSoloModal = {
        Id: idProdModal,
        Nombre: producto.Nombre,
        Categoria: producto.Categoria,
        IdCategoria: producto.IdCategoria ?? producto.idCategoria,
        CostoUnitario: producto.CostoUnitario,

        // 🔥 STOCK REAL
        Stock: stockReal,

        IdProducto: idProdModal,
        IdColor: idColModal,
        Color: producto.Color,
        PorcGanancia: producto.PorcGanancia,
        Ganancia: producto.Ganancia,
        PorcIva: producto.PorcIva,
        IVA: producto.IVA,
        PrecioVenta: producto.PrecioVenta,
        PrecioVentaUnitario: producto.PrecioVentaUnitario,
        Cantidad: producto.Cantidad ?? producto.cantidad,
        UsaStockProducto: usaPtLinea,
        CantidadStockProducto: cantPtLinea
    };

    // =========================================================
    // 4) SETEAR FORMULARIO (cantidad antes de sincronizar stock PT del modal)
    // =========================================================
    $('#ProductoEditandoModalId').val(String(idDetallePedido));
    $('#ProductoModalId').val(String(idProdModal));

    $('#ProductoModalNombre').val(producto.Nombre);
    $('#ProductoModalIdCategoria').val(producto.IdCategoria ?? producto.idCategoria);
    $('#ProductoModalCategoria').val(producto.Categoria);

    $('#ProductoModalCostoUnitario').val(formatNumber(producto.CostoUnitario));
    $('#ProductoModalPorcGanancia').val(producto.PorcGanancia);
    $('#ProductoModalGanancia').val(formatNumber(producto.Ganancia));

    $('#ProductoModalPorcIva').val(producto.PorcIva);
    $('#ProductoModalIva').val(formatNumber(producto.IVA));

    $('#ProductoModalPrecioVenta').val(formatNumber(producto.PrecioVenta));
    $('#ProductoModalCantidad').val(producto.Cantidad ?? producto.cantidad);

    // =========================================================
    // 5) CARGAR PRODUCTO EN MODAL (grilla superior)
    // =========================================================
    await configurarDataTableProductosModal([productoSoloModal]);

    // Stock PT en DOM **antes** de setPedidoModalPane → controlarUsoStockInsumos (usa el checkbox).
    if (gridProductosModal) {
        const filasModal = gridProductosModal.rows().nodes().to$();
        filasModal.removeClass('selected');
        filasModal.find('td').removeClass('selected');
    }
    filaSeleccionadaProductos = null;

    let filaStockPt = null;
    if (gridProductosModal) {
        if (isEditingProducto && gridProductosModal.rows().count() === 1) {
            filaStockPt = gridProductosModal.row(0).node();
        } else {
            gridProductosModal.rows().every(function () {
                const d = this.data();
                const idCatalogoFila =
                    parseInt(d.Id ?? d.id ?? d.IdProducto ?? d.idProducto, 10) || 0;
                const idColorFila = idColorDetallePedido(d);
                if (idCatalogoFila === idProdModal && idColorFila === idColModal) {
                    filaStockPt = this.node();
                }
            });
        }
    }

    if (filaStockPt) {
        filaSeleccionadaProductos = filaStockPt;
        $(filaStockPt).addClass('selected');
        $('td', filaStockPt).addClass('selected');

        const $fila = $(filaStockPt);
        const chk = $fila.find('.chk-usa-stock-producto');
        const txt = $fila.find('.txt-cantidad-stock-producto');
        const usaStock = usaStockProductoDesdeFilaPedido(producto);
        const cantTxt = cantidadStockProductoDesdeFilaPedido(producto);

        if (_pedModalLineaEsFabricacion) {
            chk.prop('checked', false);
            txt.prop('disabled', true).val(0);
        } else {
            chk.prop('checked', usaStock || _pedModalStockPtPersistido.activo);
            txt.prop('disabled', !(usaStock || _pedModalStockPtPersistido.activo));
            txt.val(_pedModalStockPtPersistido.activo ? _pedModalStockPtPersistido.cantidad : cantTxt);
            sincronizarStockProductoSeleccionadoConCantidad();
        }
    }

    setPedidoModalPane((stockReal > 0 || cantPtLinea > 0) ? "pt" : "fab", { skipReloadProductosGrid: true });
    actualizarPedidoModalTabsEdicionBloqueo();
    aplicarControlesStockPtGrillaModalProducto();

    // =========================================================
    // 6) OBTENER INSUMOS DEL GRID PRINCIPAL
    // =========================================================
    let insumosData = [];

    if (gridInsumos) {
        insumosData = gridInsumos
            .rows()
            .data()
            .toArray()
            .filter(row => parseInt(row.IdDetalle ?? row.idDetalle, 10) === idDetallePedido);
    }

    // =========================================================
    // 7) TRANSFORMAR INSUMOS PARA MODAL
    // =========================================================
    const qProdLinea = Math.max(1, parseFloat(producto.Cantidad ?? producto.cantidad) || 1);

    const transformedData = insumosData.map(row => {

        const cantLinea = parseFloat(row.Cantidad ?? row.cantidad) || 0;
        const cantidadInicial = cantLinea / qProdLinea;

        return {

        Nombre: row.Insumo ?? row.insumo,
        Cantidad: row.Cantidad ?? row.cantidad,
        CantidadInicial: cantidadInicial,

        CostoUnitario: row.PrecioUnitario ?? row.precioUnitario,
        SubTotal: row.SubTotal ?? row.subTotal,

        IdCategoria: row.IdCategoria ?? row.idCategoria,
        Categoria: row.Categoria ?? row.categoria,

        IdColor: row.IdColor ?? row.idColor,
        Color: row.Color ?? row.color,

        IdEstado: row.IdEstado ?? row.idEstado,
        Estado: row.Estado ?? row.estado,

        IdTipo: row.IdTipo ?? row.idTipo,
        Tipo: row.Tipo ?? row.tipo,

        Especificacion: row.Especificacion ?? row.especificacion,
        Comentarios: row.Comentarios ?? row.comentarios,

        IdUnidadMedida: row.IdUnidadMedida ?? row.idUnidadMedida,
        IdProveedor: row.IdProveedor ?? row.idProveedor,
        Proveedor: row.Proveedor ?? row.proveedor,

        Id: row.Id ?? row.id,
        IdProducto: row.IdProducto ?? row.idProducto,
        IdInsumo: row.IdInsumo ?? row.idInsumo,

        // 🔥 STOCK CORRECTO
        Stock: parseFloat(row.Stock ?? row.stock ?? row.StockDisponible ?? row.stockDisponible ?? 0) || 0,
        StockDisponible: parseFloat(row.Stock ?? row.stock ?? row.StockDisponible ?? row.stockDisponible ?? 0) || 0,

        UsaStock: usaStockInsumoProcesoPedido(row) ? 1 : 0,
        CantidadStock: cantidadStockInsumoProcesoPedido(row),
        CantidadUsadaStock: parseNumeroFlexible(
            row.CantidadUsadaStock ?? row.cantidadUsadaStock ?? row.CantidadStock ?? row.cantidadStock ?? row.CantidadStockInsumo ?? row.cantidadStockInsumo ?? 0
        ),
        _insumoCantidadStockDesdeDb: parseNumeroFlexible(
            row.CantidadUsadaStock ?? row.cantidadUsadaStock ?? row.CantidadStockInsumo ?? row.cantidadStockInsumo ?? row.CantidadStock ?? row.cantidadStock ?? 0
        )
        };
    });

    // =========================================================
    // 8) CARGAR INSUMOS EN MODAL
    // =========================================================
    await configurarDataTableInsumosModal(transformedData, true);

    // =========================================================
    // 9) SETEAR COLOR
    // =========================================================
    $('#Colores')
        .val(String(idColModal !== 0 && idColModal != null ? idColModal : -1))
        .trigger('change');

    if (stockReal > 0) {
        forzarColorInsumosModalDesdeProducto(idColModal, producto.Color);
    }

    if (gridInsumosModal) {
        if (!_pedModalStockPtPersistido.activo) {
            controlarUsoStockInsumos();
        }
        gridInsumosModal.draw(false);
        if (_pedModalStockPtPersistido.activo) {
            $('#grd_Insumos_Modal tbody tr').addClass('insumo-fila-via-pt-producto');
        }
    }

    // =========================================================
    // 11) UI MODAL
    // =========================================================
    const tituloModal = _pedModalStockPtPersistido.activo
        ? "Editar Producto (terminado del depósito)"
        : "Editar Producto";
    $("#productoModal .modal-title").text(tituloModal);
    $("#btnGuardarProducto").html(`<i class="fa fa-check me-1"></i> Guardar`);

    $('#productoModal .modal-dialog').css({
        'max-width': '100%',
        'width': '70%'
    });

    // =========================================================
    // 12) ABRIR MODAL
    // =========================================================
    $("#productoModal").modal("show");
    setTimeout(() => aplicarControlesStockPtGrillaModalProducto(), 100);
}
async function anadirProducto() {
    resetPedModalStockPtPersistido();
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

    actualizarPedidoModalTabsEdicionBloqueo();
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

    try {
        if (gridProductos && $.fn.DataTable.isDataTable("#grd_Productos")) {
            gridProductos.column(5).cells().invalidate();
            gridProductos.draw(false);
        }
    } catch (e) { /* no-op */ }
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

                const cantidadStock = cantidadStockProductoDesdeFilaPedido(p);

                productos.push({
                    "Id": p.Id ?? p.id,
                    "IdProducto": parseInt(p.IdProducto ?? p.idProducto, 10),
                    "IdCategoria": parseInt(p.IdCategoria ?? p.idCategoria, 10),
                    "CostoUnitario": parseFloat(p.CostoUnitario ?? p.costoUnitario),
                    "Cantidad": parseFloat(p.Cantidad ?? p.cantidad),
                    "PorcGanancia": parseFloat(p.PorcGanancia ?? p.porcGanancia),
                    "Ganancia": parseFloat(p.Ganancia ?? p.ganancia),
                    "PorcIva": parseFloat(p.PorcIva ?? p.porcIva),
                    "IVA": parseFloat(p.IVA ?? p.iva),
                    "PrecioVenta": parseFloat(p.PrecioVenta ?? p.precioVenta),
                    "IdColor": parseInt(p.IdColor ?? p.idColor, 10),
                    "Producto": p.Nombre,

                    // 🔥 CLAVE
                    "CantidadUsadaStock": cantidadStock,
                    "UsaStockProducto": usaStockProductoDesdeFilaPedido(p)
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
            const stockPtPorDetalle = mapaStockPtPorDetallePedido();

            gridInsumos.rows().every(function () {
                const i = this.data();

                const cantidad = parseFloat(i.Cantidad ?? i.cantidad ?? 0) || 0;

                const idDet = parseInt(i.IdDetalle ?? i.idDetalle, 10) || 0;
                const infoPt = stockPtPorDetalle[idDet];
                const ptCubreTodo = !!(infoPt && infoPt.cubreTodo);

                const usaCheckbox = usaStockInsumoProcesoPedido(i);
                let cantidadStock = cantidadStockInsumoProcesoPedido(i);
                if (!usaCheckbox || ptCubreTodo) {
                    cantidadStock = 0;
                }

                const idColorIns = parseInt(i.IdColor ?? i.idColor, 10) || 0;
                if (!idColorIns || idColorIns === 0) {
                    invalido = true;
                }

                if (cantidadStock > cantidad) {
                    invalido = true;
                }

                const ins = {
                    "Id": idPedido !== "" ? (i.Id ?? i.id) : 0,
                    "IdProducto": parseInt(i.IdProducto ?? i.idProducto, 10),
                    "IdInsumo": parseInt(i.IdInsumo ?? i.idInsumo, 10),
                    "IdCategoria": parseInt(i.IdCategoria ?? i.idCategoria, 10),
                    "PrecioUnitario": parseFloat(i.PrecioUnitario ?? i.precioUnitario),
                    "Cantidad": cantidad,
                    "SubTotal": parseFloat(i.SubTotal ?? i.subTotal),
                    "IdColor": idColorIns,
                    "IdTipo": parseInt(i.IdTipo ?? i.idTipo, 10),
                    "IdEstado": parseInt(i.IdEstado ?? i.idEstado, 10),
                    "IdDetalle": idDet,
                    "IdProveedor": parseInt(i.IdProveedor ?? i.idProveedor, 10),
                    "IdUnidadMedida": parseInt(i.IdUnidadMedida ?? i.idUnidadMedida, 10),
                    "Especificacion": i.Especificacion ?? i.especificacion,
                    "Comentarios": i.Comentarios ?? i.comentarios,

                    "CantidadUsadaStock": cantidadStock
                };

                if (i.FechaActualizacion)
                    ins.FechaActualizacion = i.FechaActualizacion;

                insumos.push(ins);
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

        const cantidad = parseFloat(p.Cantidad ?? p.cantidad ?? 0) || 0;
        const usaStockProducto = usaStockProductoDesdeFilaPedido(p);
        const cantidadStockProducto = pedidoLineaUsaStockProductoTerminado(
            cantidadStockProductoDesdeFilaPedido(p),
            usaStockProducto
        )
            ? cantidadStockProductoDesdeFilaPedido(p)
            : 0;

        if (cantidadStockProducto > cantidad) {
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

        const cantidad = parseFloat(i.Cantidad ?? i.cantidad ?? 0) || 0;
        const usaStock = usaStockInsumoProcesoPedido(i);
        const cantidadStock = usaStock ? cantidadStockInsumoProcesoPedido(i) : 0;

        if (cantidadStock > cantidad) {
            errorStockInsumo = true;
        }

        const idColIns = parseInt(i.IdColor ?? i.idColor, 10) || 0;
        if (!idColIns || idColIns === 0) {
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
    if (productoTerminadoUsaStockEnModal()) return;

    const cantidadProducto = parseFloat($('#ProductoModalCantidad').val()) || 0;

    const controles = obtenerControlesStockProductoFilaSeleccionada();
    let usaStockProducto = false;
    let cantidadStockProducto = 0;
    if (controles) {
        usaStockProducto = _pedModalLineaEsFabricacion ? false : controles.chk.is(':checked');
        cantidadStockProducto = usaStockProducto ? (parseFloat(controles.txt.val()) || 0) : 0;
    }

    const productoUsaStock = usaStockProducto && cantidadStockProducto > 0;

    const cantidadAFabricar = Math.max(0, cantidadProducto - cantidadStockProducto);

    let cambios = false;

    gridInsumosModal.rows().every(function () {

        const rowData = this.data();

        if (insumoStockDepositoYaPersistidoEnPedido(rowData)) {
            return;
        }

        const stockDisponible = parseNumeroFlexible(rowData.Stock ?? rowData.StockDisponible);
        const cantidadInicial = cantidadInicialInsumoPedidoModal(rowData, cantidadAFabricar);

        const cantidadNecesaria = cantidadInicial * cantidadAFabricar;
        const maximo = Math.min(stockDisponible, cantidadNecesaria);

        let nuevaCantidadStock = parseNumeroFlexible(rowData.CantidadStock);

        // Producto terminado del depósito NO consume insumos del depósito (solo baja stock tipo P).
        if (productoUsaStock && cantidadAFabricar <= 0) {
            nuevaCantidadStock = 0;
        } else if (cantidadAFabricar <= 0 || stockDisponible <= 0) {
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

    if (_pedModalLineaEsFabricacion) {
        return cantidadProducto;
    }

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
    return parseNumeroFlexible(row?.Stock ?? row?.StockDisponible);
}

function getCantidadStockFila(row) {
    if (!row) return 0;
    if (row.CantidadStockProducto != null || row.cantidadStockProducto != null) {
        return cantidadStockProductoDesdeFilaPedido(row);
    }
    return cantidadStockInsumoProcesoPedido(row);
}

function getCantidadFila(row) {
    return parseFloat(row.Cantidad ?? row.cantidad ?? 0) || 0;
}

function productoTerminadoUsaStockEnModal() {
    if (_pedModalLineaEsFabricacion) return false;
    if (_pedModalStockPtPersistido.activo) {
        return parseNumeroFlexible(_pedModalStockPtPersistido.cantidad) > 0;
    }
    const controles = obtenerControlesStockProductoFilaSeleccionada();
    if (!controles || !controles.chk?.length) return false;
    if (!controles.chk.is(':checked')) return false;
    const cantidadStock = parseFloat(controles.txt?.val()) || 0;
    return cantidadStock > 0;
}

/** Cantidad de insumo de la línea (informativo con PT del depósito): receta × cantidad de producto del modal (= columna Cantidad). */
function cantidadInformativaInsumoCubiertoPorProductoTerminado(row) {
    if (!productoTerminadoUsaStockEnModal() || !row) return 0;
    const qPedido = parseFloat($("#ProductoModalCantidad").val()) || 0;
    if (qPedido <= 0) return 0;

    let cantInicial = parseFloat(row.CantidadInicial ?? row.cantidadInicial ?? 0) || 0;
    if (cantInicial <= 0) {
        const cantLinea = parseFloat(row.Cantidad ?? row.cantidad ?? 0) || 0;
        cantInicial = qPedido > 0 ? cantLinea / qPedido : cantLinea;
    }
    const n = cantInicial * qPedido;
    return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

function insumoUsaStock(row) {
    return usaStockInsumoProcesoPedido(row);
}


function controlarUsoStockInsumosOptimizado() {

    const nuevaCantidad = obtenerCantidadAFabricar();

    if (nuevaCantidad === lastCantidadAFabricar) return;

    lastCantidadAFabricar = nuevaCantidad;

    controlarUsoStockInsumos();
}
