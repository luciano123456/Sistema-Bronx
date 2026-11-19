// ============================== Stock.js (v5.9 stock por color / historial por variante) ==============================
let gridStock = null;
let gridHistorial = null;

/** Todos los saldos devueltos por el servidor (solo ítems con al menos un movimiento en StockSaldos). */
let stockSaldosCompleto = [];
/** Si es true, la grilla incluye saldo ≤ 0; si false, solo CantidadActual > 0. */
let stockMostrarAgotados = false;

// contexto actual del historial (para recargar después de anular/restaurar/eliminar)
let histContext = {
    tipoItem: null,
    idProducto: null,
    idInsumo: null,
    nombre: null,
    idColor: 0,
    etiquetaColor: ""
};

// Config de filtros por columna para STOCK
// 0 Tipo, 1 Ítem, 2 Proveedor, 3 Color, 4 Stock, 5 Fecha (sin filtro en acciones)
const columnConfigStock = [
    { index: 0, filterType: "select" },
    { index: 1, filterType: "text" },
    { index: 2, filterType: "text" },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" }
];

/* ============================================================
   HELPERS JSON (camelCase del servidor vs Pascal en código)
============================================================ */
function stockJsonPick(obj, pascal) {
    if (obj == null) return undefined;
    const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
    if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
    return obj[pascal];
}

function stockJsonNum(obj, pascal) {
    const raw = stockJsonPick(obj, pascal);
    if (raw == null || raw === "") return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    const s = String(raw).trim().replace(/\s/g, "");
    const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function stockJsonBool(obj, pascal) {
    return !!stockJsonPick(obj, pascal);
}

/** IdColor de una fila de grilla / API (0 = sin color). */
function stockIdColorDesdeFila(row) {
    if (!row) return 0;
    const v = row.idColor ?? row.IdColor;
    if (v == null || v === "" || v === -1) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const STOCK_ETIQUETA_SIN_COLOR = "N/A";

function textoColorGrillaStock(colorTexto, row) {
    const t = String(colorTexto ?? "").trim();
    if (t && t !== "—" && t !== "-") {
        return t;
    }
    return STOCK_ETIQUETA_SIN_COLOR;
}

function renderCeldaColorGrillaStock(colorTexto, row) {
    const t = textoColorGrillaStock(colorTexto, row);
    if (t === STOCK_ETIQUETA_SIN_COLOR) {
        return `<span class="stock-color-na">${STOCK_ETIQUETA_SIN_COLOR}</span>`;
    }
    return `<span class="stock-color-chip">${t}</span>`;
}

/** Cantidad firmada para KPI / grilla: respeta signo del API o arma signo con EsEntrada. */
function stockCantidadHistorialFirmada(det) {
    let cant = stockJsonNum(det, "Cantidad");
    const esIn = stockJsonBool(det, "EsEntrada");
    if (cant > 0 && !esIn) cant = -Math.abs(cant);
    if (cant < 0 && esIn) cant = Math.abs(cant);
    return cant;
}

/* ============================================================
   HELPERS NUMÉRICOS / FECHAS
============================================================ */
function formatCantidadStock(n) {
    const v = Number(n || 0);
    return v.toLocaleString("es-AR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

function formatDateTimeAR(value) {
    if (!value) return "";
    if (typeof value === "string" && /^\d{2}-\d{2}-\d{4}/.test(value)) {
        return value;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
}

/* ============================================================
   ON LOAD
============================================================ */
$(document).ready(async () => {
    $("#stockToggleAgotados").on("change", function () {
        stockMostrarAgotados = $(this).prop("checked");
        refrescarVistaStockPrincipal();
    });

    $(document).on("click", "#grd_Stock .js-stock-historial", function (e) {
        e.preventDefault();
        const $b = $(this);
        const tipo = String($b.attr("data-tipo") || "").toUpperCase();
        const rawP = $b.attr("data-id-producto") || "";
        const rawI = $b.attr("data-id-insumo") || "";
        const idProducto = rawP !== "" && !Number.isNaN(Number(rawP)) ? Number(rawP) : null;
        const idInsumo = rawI !== "" && !Number.isNaN(Number(rawI)) ? Number(rawI) : null;
        const idColor = Number($b.attr("data-id-color")) || 0;
        let nombre = "";
        let etiquetaColor = "";
        try {
            nombre = decodeURIComponent($b.attr("data-nombre") || "");
        } catch (_) {
            nombre = $b.attr("data-nombre") || "";
        }
        try {
            etiquetaColor = decodeURIComponent($b.attr("data-color-etiq") || "");
        } catch (_) {
            etiquetaColor = $b.attr("data-color-etiq") || "";
        }
        void verHistorial(tipo, idProducto, idInsumo, nombre, idColor, etiquetaColor);
    });

    await cargarStock();
});

// Ajustar columnas del historial cada vez que se muestre el modal
$('#modalHistorialStock').on('shown.bs.modal', function () {
    if (gridHistorial) {
        setTimeout(() => {
            gridHistorial.columns.adjust().draw(false);
        }, 80);
    }
});

/* ============================================================
   NAVEGACIÓN
============================================================ */
function nuevoMovimiento() {
    window.location.href = "/Stock/NuevoModif";
}

function editarMovimiento(id) {
    window.location.href = "/Stock/NuevoModif/" + id;
}

/** Desde historial por ítem: abre edición y remarca la fila del producto/insumo (+ color si aplica). */
function editarMovimientoConContexto(idMovimiento, tipoItem, idProducto, idInsumo, idColor) {
    const p = new URLSearchParams();
    const t = (tipoItem || "").toUpperCase();
    if (t === "P" && idProducto != null && idProducto !== "null" && !Number.isNaN(Number(idProducto))) {
        p.set("resaltarTipo", "P");
        p.set("resaltarProducto", String(idProducto));
    } else if (t === "I" && idInsumo != null && idInsumo !== "null" && !Number.isNaN(Number(idInsumo))) {
        p.set("resaltarTipo", "I");
        p.set("resaltarInsumo", String(idInsumo));
    }
    if (idColor != null && idColor !== "null" && !Number.isNaN(Number(idColor))) {
        p.set("resaltarColor", String(Number(idColor)));
    }
    const qs = p.toString();
    window.location.href = "/Stock/NuevoModif/" + idMovimiento + (qs ? "?" + qs : "");
}

/* ============================================================
   LISTA STOCK (Saldos)
   El servidor solo devuelve filas de StockSaldos → siempre hubo al menos un movimiento.
============================================================ */
function stockSaldoConCantidadPositiva(row) {
    return Number(row.CantidadActual || 0) > 0;
}

function stockFiltrarSaldosVista(rows) {
    if (!Array.isArray(rows)) return [];
    if (stockMostrarAgotados) return rows.slice();
    return rows.filter(stockSaldoConCantidadPositiva);
}

function actualizarKpiStock(countVisible, totalConHistorial) {
    $("#kpiItemsStock").text(countVisible.toLocaleString("es-AR"));
    const $lbl = $("#kpiItemsStockLabel");
    if ($lbl.length) {
        $lbl.text(stockMostrarAgotados ? "Con historial (todos)" : "Con stock (> 0)");
    }
    const $sub = $("#kpiItemsStockSub");
    if ($sub.length) {
        if (stockMostrarAgotados) {
            $sub.text(
                totalConHistorial > 0
                    ? `Incluye agotados y saldo cero · ${totalConHistorial.toLocaleString("es-AR")} líneas de saldo`
                    : ""
            );
        } else {
            const agot = totalConHistorial - countVisible;
            $sub.text(
                agot > 0
                    ? `${agot.toLocaleString("es-AR")} sin stock ahora · activá «Ver agotados»`
                    : "Todo lo que tuvo movimientos tiene stock > 0"
            );
        }
    }
}

function refrescarVistaStockPrincipal() {
    const visible = stockFiltrarSaldosVista(stockSaldosCompleto);
    if (gridStock) {
        gridStock.clear().rows.add(visible).draw(false);
    } else {
        renderTablaStock(visible);
    }
    actualizarKpiStock(visible.length, stockSaldosCompleto.length);
}

async function cargarStock() {
    try {
        const resp = await fetch("/Stock/Saldos");
        if (!resp.ok) throw new Error("Error HTTP en Saldos");

        const data = (await resp.json()) || [];
        stockSaldosCompleto = Array.isArray(data) ? data : [];
        refrescarVistaStockPrincipal();
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") errorModal("No se pudo cargar el stock.");
    }
}

function renderTablaStock(data) {
    if (gridStock) {
        gridStock.clear().rows.add(data).draw();
        return;
    }

    // Clonar fila de encabezado para filtros (igual que en Insumos)
    $("#grd_Stock thead tr").clone(true).addClass("filters").appendTo("#grd_Stock thead");

    gridStock = $("#grd_Stock").DataTable({
        data,
        pageLength: 50,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        // Orden por defecto: Fecha (col 5) descendente → más nuevo primero
        order: [[5, "desc"]],
        columns: [
            {
                data: "TipoItem",
                className: "text-center align-middle stock-col-tipo",
                render: function (tipo, type) {
                    const t = (tipo || "").toUpperCase();
                    const label = t === "P" ? "Producto" : t === "I" ? "Insumo" : (t || "-");
                    if (type === "filter" || type === "sort") {
                        return label;
                    }
                    if (t === "P") {
                        return `
                            <span class="stock-pill stock-pill-producto">
                                <i class="fa fa-cube me-1"></i>Producto
                            </span>`;
                    } else if (t === "I") {
                        return `
                            <span class="stock-pill stock-pill-insumo">
                                <i class="fa fa-wrench me-1"></i>Insumo
                            </span>`;
                    } else {
                        return `<span class="stock-pill stock-pill-generic">${t || "-"}</span>`;
                    }
                }
            },
            {
                data: null,
                className: "align-middle",
                render: function (row) {
                    const tipo = (row.TipoItem || "").toUpperCase();
                    const nombre = tipo === "P"
                        ? (row.Producto || "")
                        : (row.Insumo || "");
                    return `<div class="stock-name-text">${nombre || "-"}</div>`;
                }
            },
            {
                data: "Proveedor",
                className: "align-middle",
                render: function (d, type, row) {
                    const tipo = (row.TipoItem || row.tipoItem || "").toUpperCase();
                    if (tipo !== "I") {
                        return "";
                    }
                    const prov = String(d ?? row.proveedor ?? "").trim();
                    return prov ? `<span class="stock-proveedor-text">${prov}</span>` : "—";
                }
            },
            {
                data: "Color",
                className: "align-middle",
                render: function (d, type, row) {
                    return renderCeldaColorGrillaStock(d, row);
                }
            },
            {
                data: "CantidadActual",
                className: "text-end align-middle",
                render: function (d) {
                    const v = Number(d || 0);
                    const abs = formatCantidadStock(Math.abs(v));
                    if (v > 0) {
                        return `<span class="stock-qty-pos">+ ${abs}</span>`;
                    } else if (v < 0) {
                        return `<span class="stock-qty-neg">- ${abs}</span>`;
                    } else {
                        return `<span>${abs}</span>`;
                    }
                }
            },
            {
                data: "Fecha",
                className: "text-center align-middle",
                render: function (d) {
                    return formatDateTimeAR(d);
                }
            },
            {
                data: null,
                className: "text-center align-middle",
                orderable: false,
                render: function (row) {
                    const tipo = (row.TipoItem || "").toUpperCase();
                    const idProd = row.IdProducto != null ? row.IdProducto : null;
                    const idInsu = row.IdInsumo != null ? row.IdInsumo : null;
                    const nombre = tipo === "P" ? (row.Producto || "") : (row.Insumo || "");
                    const idColNum = stockIdColorDesdeFila(row);
                    const colorTxt = String(row.Color || row.color || "");
                    const nomEnc = encodeURIComponent(nombre || "");
                    const colEnc = encodeURIComponent(colorTxt);
                    return `
                        <button type="button"
                                class="btn btn-sm btn-outline-light stock-btn-icon js-stock-historial"
                                title="Historial de movimientos"
                                data-tipo="${tipo}"
                                data-id-producto="${idProd != null && idProd !== "" ? String(idProd) : ""}"
                                data-id-insumo="${idInsu != null && idInsu !== "" ? String(idInsu) : ""}"
                                data-id-color="${idColNum}"
                                data-nombre="${nomEnc}"
                                data-color-etiq="${colEnc}">
                            <i class="fa fa-history"></i>
                        </button>`;
                }
            }
        ],
        dom: "Bfrtip",
        buttons: [
            {
                extend: "excelHtml5",
                text: "Exportar Excel",
                filename: "Stock_Actual",
                exportOptions: { columns: [0, 1, 2, 3, 4, 5] }
            }
        ],
        orderCellsTop: true,
        fixedHeader: false,

        // ====================== FILTROS POR COLUMNA ======================
        initComplete: async function () {
            const api = this.api();

            columnConfigStock.forEach(config => {
                const cell = $(".filters th").eq(config.index);

                if (config.filterType === "select") {
                    // Select con valores únicos de la columna
                    const select = $('<select><option value="">Todos</option></select>')
                        .appendTo(cell.empty())
                        .on("change", function () {
                            const val = $(this).val();
                            api
                                .column(config.index)
                                .search(val ? "^" + $.fn.dataTable.util.escapeRegex(val) + "$" : "", true, false)
                                .draw();

                            if (typeof guardarFiltrosPantalla === "function") {
                                guardarFiltrosPantalla("#grd_Stock", "filtrosStock", true);
                            }
                        });

                    // Construir opciones desde los datos actuales de la columna
                    if (config.index === 0) {
                        select.append('<option value="Producto">Producto</option>');
                        select.append('<option value="Insumo">Insumo</option>');
                    } else {
                        api
                            .column(config.index)
                            .data()
                            .unique()
                            .sort()
                            .each(function (d) {
                                let txt = d;
                                if (typeof d === "string") {
                                    const tmp = document.createElement("div");
                                    tmp.innerHTML = d;
                                    txt = tmp.textContent || tmp.innerText || "";
                                    txt = txt.trim();
                                }
                                if (txt) {
                                    select.append('<option value="' + txt + '">' + txt + "</option>");
                                }
                            });
                    }

                } else if (config.filterType === "text") {
                    const input = $('<input type="text" placeholder="Buscar..." />')
                        .appendTo(cell.empty())
                        .on("keyup change", function (e) {
                            e.stopPropagation();
                            const val = this.value;
                            api
                                .column(config.index)
                                .search(val ? val : "", true, false)
                                .draw();

                            if (typeof guardarFiltrosPantalla === "function") {
                                guardarFiltrosPantalla("#grd_Stock", "filtrosStock", true);
                            }
                        });
                }
            });

            // No queremos filtro en la columna de acciones
            $(".filters th").eq(6).html("");

            // Restaurar filtros si tenés helper global
            if (typeof aplicarFiltrosRestaurados === "function") {
                await aplicarFiltrosRestaurados(gridStock, "#grd_Stock", "filtrosStock", true);
            }

            setTimeout(() => {
                gridStock.columns.adjust().draw(false);
            }, 200);
        }
    });
}

/* ============================================================
   HISTORIAL POR ITEM
   Usa: GET /Stock/HistorialItem?tipoItem=P|I&idProducto=&idInsumo=&idColor=
============================================================ */
async function verHistorial(tipoItem, idProducto, idInsumo, nombreItem, idColor, etiquetaColor) {
    let idC = 0;
    if (idColor !== null && idColor !== undefined && idColor !== "null" && idColor !== "") {
        const n = Number(idColor);
        if (!Number.isNaN(n)) idC = n;
    }
    histContext = {
        tipoItem: (tipoItem || "").toUpperCase(),
        idProducto: idProducto,
        idInsumo: idInsumo,
        nombre: nombreItem || "",
        idColor: idC,
        etiquetaColor: etiquetaColor || ""
    };

    await cargarHistorialActual();
}

async function cargarHistorialActual() {
    try {
        const tipo = histContext.tipoItem;
        if (!tipo || (tipo !== "P" && tipo !== "I")) {
            if (typeof advertenciaModal === "function")
                advertenciaModal("Tipo de ítem inválido.");
            return;
        }

        const idProducto = histContext.idProducto;
        const idInsumo = histContext.idInsumo;
        const nombreItem = histContext.nombre;
        const etiquetaColor = histContext.etiquetaColor || "";

        // Header modal
        $("#histItemNombre").text(
            etiquetaColor ? `${nombreItem || "-"} — ${etiquetaColor}` : (nombreItem || "-")
        );
        $("#histItemTipo")
            .removeClass("stock-pill-producto stock-pill-insumo stock-pill-generic")
            .addClass(
                tipo === "P" ? "stock-pill stock-pill-producto"
                    : tipo === "I" ? "stock-pill stock-pill-insumo"
                        : "stock-pill stock-pill-generic"
            )
            .html(
                tipo === "P"
                    ? `<i class="fa fa-cube me-1"></i>Producto`
                    : `<i class="fa fa-wrench me-1"></i>Insumo`
            );

        // Mostrar modal
        const modalEl = document.getElementById("modalHistorialStock");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        if (!gridHistorial) {
            $("#grd_Historial tbody").html(`
                <tr>
                    <td colspan="7" class="text-center py-3">
                        Cargando historial...
                    </td>
                </tr>`);
        }

        // Armar querystring
        const params = new URLSearchParams();
        params.append("tipoItem", tipo);
        if (tipo === "P") {
            const np = Number(idProducto);
            if (!Number.isFinite(np) || np <= 0) {
                if (typeof advertenciaModal === "function") {
                    advertenciaModal("No se puede abrir el historial: falta identificar el producto.");
                }
                return;
            }
            params.append("idProducto", String(np));
        } else if (tipo === "I") {
            const ni = Number(idInsumo);
            if (!Number.isFinite(ni) || ni <= 0) {
                if (typeof advertenciaModal === "function") {
                    advertenciaModal("No se puede abrir el historial: falta identificar el insumo.");
                }
                return;
            }
            params.append("idInsumo", String(ni));
        }
        params.append("idColor", String(histContext.idColor ?? 0));

        const resp = await fetch(`/Stock/HistorialItem?${params.toString()}`);
        if (!resp.ok) throw new Error("Error HTTP historial");

        /** @type {Array<any>} */
        const detalles = (await resp.json()) || [];

        // VMStockMovimientoDetalle extendido (API en camelCase)
        const historial = detalles.map(det => ({
            Id: stockJsonPick(det, "Id"),
            IdMovimiento: stockJsonPick(det, "IdMovimiento"),
            Fecha: stockJsonPick(det, "Fecha"),
            TipoMovimiento: stockJsonPick(det, "TipoMovimiento") || "",
            Comentario: stockJsonPick(det, "Comentario") || "",
            Cantidad: stockCantidadHistorialFirmada(det),
            EsEntrada: stockJsonBool(det, "EsEntrada"),
            EsAnulado: stockJsonBool(det, "EsAnulado"),

            // para el ojo (detalle completo)
            TipoItem: stockJsonPick(det, "TipoItem") || null,
            IdProducto: stockJsonPick(det, "IdProducto") ?? null,
            IdInsumo: stockJsonPick(det, "IdInsumo") ?? null,
            IdColor: stockJsonPick(det, "IdColor") ?? null,
            NombreColor: stockJsonPick(det, "NombreColor") || ""
        }));

        // Orden cronológico
        historial.sort((a, b) => {
            const da = new Date(a.Fecha);
            const db = new Date(b.Fecha);
            return da - db;
        });

        // Pintar tabla + KPIs
        renderTablaHistorial(historial);
        recalcularResumenHistorial(historial);

    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function")
            errorModal("No se pudo cargar el historial de movimientos.");
    }
}

/* ============================================================
   TABLA HISTORIAL (en modal)
============================================================ */
function renderTablaHistorial(data) {
    if (gridHistorial) {
        gridHistorial.clear().rows.add(data).draw();
        setTimeout(() => {
            gridHistorial.columns.adjust().draw(false);
        }, 80);
        return;
    }

    gridHistorial = $("#grd_Historial").DataTable({
        data,
        pageLength: 25,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: "Fecha",
                className: "text-center align-middle",
                render: function (d) {
                    return formatDateTimeAR(d);
                }
            },
            {
                data: "TipoMovimiento",
                className: "align-middle",
                render: function (d, t, row) {
                    const tipoMov = d || "";
                    const tipoItem = (row.TipoItem || "").toUpperCase();
                    const idProd = row.IdProducto != null ? row.IdProducto : "null";
                    const idInsu = row.IdInsumo != null ? row.IdInsumo : "null";
                    const idClr = stockIdColorDesdeFila(row);

                    return `
                        <div class="d-flex justify-content-between align-items-center gap-2">
                            <span>${tipoMov}</span>
                            <button type="button"
                                    class="btn btn-xs btn-outline-light stock-btn-icon"
                                    title="Ver detalle completo del movimiento"
                                    onclick="verMovimientoCompleto(${row.IdMovimiento}, '${tipoItem}', ${idProd}, ${idInsu}, ${idClr})">
                                <i class="fa fa-eye"></i>
                            </button>
                        </div>`;
                }
            },
            {
                data: "NombreColor",
                className: "align-middle",
                render: function (d, type, row) {
                    return renderCeldaColorGrillaStock(d, row);
                }
            },
            {
                data: "Comentario",
                className: "align-middle"
            },
            {
                data: "Cantidad",
                className: "text-end align-middle",
                render: function (d, t, row) {
                    const v = Number(row.Cantidad || 0);
                    const abs = formatCantidadStock(Math.abs(v));
                    const cls = v >= 0 ? "stock-qty-pos" : "stock-qty-neg";
                    const sign = v >= 0 ? "+" : "-";
                    return `<span class="${cls}">${sign} ${abs}</span>`;
                }
            },
            {
                data: "EsEntrada",
                className: "text-center align-middle",
                render: function (v) {
                    const clase = v ? "chip-in" : "chip-out";
                    const icon = v ? "fa-arrow-down" : "fa-arrow-up";
                    const texto = v ? "Entrada" : "Salida";

                    return `
                        <span class="stock-chip-dir ${clase}">
                            <i class="fa ${icon} me-1"></i>${texto}
                        </span>`;
                }
            },
            {
                data: null,
                className: "text-center align-middle",
                orderable: false,
                render: function (row) {
                    const idDet = row.Id;         // Id del detalle
                    const tipoIt = (row.TipoItem || "").toUpperCase();
                    const idProd = row.IdProducto != null ? row.IdProducto : "null";
                    const idInsu = row.IdInsumo != null ? row.IdInsumo : "null";
                    const idClr = stockIdColorDesdeFila(row);
                    const editarMovimientoBtn = `
                        <button type="button"
                                class="btn btn-outline-warning"
                                title="Editar movimiento completo"
                                onclick="editarMovimientoConContexto(${row.IdMovimiento}, '${tipoIt}', ${idProd}, ${idInsu}, ${idClr})">
                            <i class="fa fa-pencil"></i>
                        </button>`;
                    const eliminarDetalleBtn = `
                        <button type="button"
                                class="btn btn-outline-danger"
                                title="Eliminar SOLO este detalle"
                                onclick="eliminarDetalleHistorial(${idDet})">
                            <i class="fa fa-trash"></i>
                        </button>`;

                    return `
                        <div class="stock-actions d-inline-flex align-items-center">
                            ${editarMovimientoBtn}
                            ${eliminarDetalleBtn}
                        </div>`;
                }
            }
        ],
        createdRow: function (row, data) {
            if (data.EsAnulado) {
                $(row).addClass("hist-anulado");
            }
        },
        dom: "Bfrtip",
        buttons: [
            {
                extend: "excelHtml5",
                text: "Exportar Excel",
                filename: "Stock_Historial_Item",
                exportOptions: { columns: [0, 1, 2, 3, 4, 5] }
            }
        ]
    });

    setTimeout(() => {
        gridHistorial.columns.adjust().draw(false);
    }, 80);
}

/* ============================================================
   RESUMEN (Entradas/Salidas/Neto) en el modal
============================================================ */
function recalcularResumenHistorial(historial) {
    let entradas = 0;
    let salidas = 0;

    historial.forEach(h => {
        if (h.EsAnulado) return;
        let v = Number(h.Cantidad || 0);
        if (Number.isNaN(v)) v = 0;
        const esIn = !!h.EsEntrada;
        if (v > 0 && !esIn) v = -Math.abs(v);
        if (v < 0 && esIn) v = Math.abs(v);
        if (v >= 0) entradas += v;
        else salidas += Math.abs(v);
    });

    const neto = entradas - salidas;

    $("#histTotalEntradas").text(formatCantidadStock(entradas));
    $("#histTotalSalidas").text(formatCantidadStock(salidas));
    $("#histTotalNeto").text(formatCantidadStock(neto));
}

/* ============================================================
   DETALLE COMPLETO DE MOVIMIENTO (ojito en historial)
   Usa: GET /Stock/Obtener?id=
============================================================ */
async function verMovimientoCompleto(idMovimiento, tipoItemSel, idProductoSel, idInsumoSel, idColorSel) {
    try {
        const resp = await fetch(`/Stock/Obtener?id=${idMovimiento}`);

        if (!resp.ok) throw new Error("Error HTTP");

        const json = await resp.json();
        if (!json) {
            errorModal?.("No se encontró el movimiento.");
            return;
        }

        // AHORA mov ES json, NO json.Movimiento
        const mov = json;
        const detalles = json.Detalles || [];

        // ==== HEADER ====
        $("#movDetFecha").text(formatDateTimeAR(mov.Fecha));

        const tipoNombre = mov.TipoMovimientoNombre || `Tipo #${mov.IdTipoMovimiento}`;
        const suf = mov.EsAnulado ? " (ANULADO)" : "";

        $("#movDetTipo").text(tipoNombre + suf);
        $("#movDetComentario").text(mov.Comentario || "-");

        // ==== LISTA DE ITEMS ====
        const cont = document.getElementById("movDetItems");
        cont.innerHTML = "";

        const tipoSel = (tipoItemSel || "").toUpperCase();
        const idProdSel = idProductoSel != null ? Number(idProductoSel) : null;
        const idInsuSel = idInsumoSel != null ? Number(idInsumoSel) : null;
        const idColorSelNorm = (() => {
            if (idColorSel === null || idColorSel === undefined || idColorSel === "null" || idColorSel === "")
                return 0;
            const n = Number(idColorSel);
            return Number.isFinite(n) ? n : 0;
        })();

        detalles.forEach(d => {
            const tipo = (d.TipoItem || d.tipoItem || "").toUpperCase();
            const esProducto = tipo === "P";
            const idProd = d.IdProducto ?? d.idProducto ?? null;
            const idInsu = d.IdInsumo ?? d.idInsumo ?? null;
            const idColorD = d.IdColor ?? d.idColor;
            const idDNn = idColorD != null && idColorD !== "" ? Number(idColorD) : 0;
            const idColorNum = Number.isFinite(idDNn) ? idDNn : 0;

            const nombre = d.NombreItem || d.nombreItem || "-";
            const escHtml = s =>
                String(s ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
            const colorRaw = (d.ColorNombre || d.colorNombre || "").trim();
            const colorNom = escHtml(textoColorGrillaStock(colorRaw, d));
            const cantidad = Number(d.Cantidad ?? d.cantidad ?? 0);
            const costo = Number(d.CostoUnitario ?? d.costoUnitario ?? 0);
            const subtotal = cantidad * costo;

            const matchItem =
                tipoSel === tipo &&
                (
                    (tipo === "P" && idProdSel === idProd) ||
                    (tipo === "I" && idInsuSel === idInsu)
                );
            const matchColor = idColorNum === idColorSelNorm;
            const seleccionado = matchItem && matchColor;

            const pill = esProducto
                ? `<span class="stock-pill stock-pill-producto me-2"><i class="fa fa-cube me-1"></i>Producto</span>`
                : `<span class="stock-pill stock-pill-insumo me-2"><i class="fa fa-wrench me-1"></i>Insumo</span>`;

            const card = document.createElement("div");
            card.className = "col-12 col-md-6";

            card.innerHTML = `
                <div class="stock-mov-card card-glass ${seleccionado ? "stock-mov-card-selected" : ""}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="d-flex align-items-center flex-wrap gap-2">
                            ${pill}
                            <span class="fw-600">${nombre}</span>
                        </div>
                        <div class="text-end small text-muted-cc">
                            Cantidad<br>
                            <strong>${formatCantidadStock(cantidad)}</strong>
                        </div>
                    </div>
                    <div class="small mb-2">
                        <span class="text-muted-cc">Color:</span>
                        <strong>${colorNom}</strong>
                    </div>
                    <div class="d-flex justify-content-between small mt-1">
                        <span>Costo unitario:
                            <strong>${formatMoneda(costo)}</strong>
                        </span>
                        <span>Subtotal:
                            <strong>${formatMoneda(subtotal)}</strong>
                        </span>
                    </div>
                </div>
            `;

            cont.appendChild(card);
        });

        // ==== MOSTRAR MODAL ====
        const modalEl = document.getElementById("modalMovimientoDetalle");
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

    } catch (e) {
        console.error(e);
        errorModal?.("No se pudo cargar el detalle completo del movimiento.");
    }
}

/* ============================================================
   ANULAR / RESTAURAR / ELIMINAR
   - Actúan sobre TODO el movimiento
============================================================ */
async function anularMovimiento(id) {
    if (!confirm("¿Desea ANULAR este movimiento completo?")) return;

    try {
        const resp = await fetch("/Stock/Anular?id=" + id, { method: "PUT" });
        const json = await resp.json();

        if (json.valor) {
            if (typeof exitoModal === "function") exitoModal("Movimiento anulado.");
            await cargarStock();
            await cargarHistorialActual();
        } else {
            if (typeof errorModal === "function")
                errorModal(json.msg || "Error al anular movimiento.");
        }
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function")
            errorModal("Error al anular movimiento.");
    }
}

async function restaurarMovimiento(id) {
    if (!confirm("¿Desea RESTAURAR este movimiento (quitar anulación) y reaplicar el stock?"))
        return;

    try {
        const resp = await fetch("/Stock/Restaurar?id=" + id, { method: "PUT" });
        const json = await resp.json();

        if (json.valor) {
            if (typeof exitoModal === "function") exitoModal("Movimiento restaurado.");
            await cargarStock();
            await cargarHistorialActual();
        } else {
            if (typeof errorModal === "function")
                errorModal(json.msg || "Error al restaurar movimiento.");
        }
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function")
            errorModal("Error al restaurar movimiento.");
    }
}

async function eliminarMovimiento(id) {
    if (!confirm("¿Desea ELIMINAR definitivamente este movimiento?")) return;

    try {
        const resp = await fetch("/Stock/Eliminar?id=" + id, { method: "DELETE" });
        const json = await resp.json();

        if (json.valor) {
            if (typeof exitoModal === "function") exitoModal("Movimiento eliminado.");
            await cargarStock();
            await cargarHistorialActual();
        } else {
            if (typeof errorModal === "function")
                errorModal(json.msg || "Error al eliminar movimiento.");
        }
    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function")
            errorModal("Error al eliminar movimiento.");
    }
}

async function eliminarDetalleHistorial(idDetalle) {
    if (!confirm("¿Seguro que querés eliminar este movimiento del ítem?")) return;

    try {
        const resp = await fetch(`/Stock/EliminarDetalle?idDetalle=${idDetalle}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            alert("No se pudo eliminar el detalle.");
            return;
        }

        const data = await resp.json();
        if (data.ok) {
            await cargarHistorialActual(); // refresca el modal
            await cargarStock();           // refresca grilla principal
        } else {
            alert(data.mensaje || "No se pudo eliminar el detalle.");
        }
    } catch (e) {
        console.error(e);
        alert("Error al eliminar el detalle de stock.");
    }
}
