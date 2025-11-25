// ============================== Stock.js (v5.2 con filtros) ==============================
let gridStock = null;
let gridHistorial = null;

// contexto actual del historial (para recargar después de anular/restaurar/eliminar)
let histContext = {
    tipoItem: null,
    idProducto: null,
    idInsumo: null,
    nombre: null
};

// Config de filtros por columna para STOCK
// index según las columnas del DataTable:
// 0 = TipoItem, 1 = Nombre, 2 = CantidadActual, 3 = Fecha
const columnConfigStock = [
    { index: 0, filterType: "select" },
    { index: 1, filterType: "text" },
    { index: 2, filterType: "text" },
    { index: 3, filterType: "text" }
];

/* ============================================================
   HELPERS NUMÉRICOS / FECHAS
============================================================ */
if (typeof window.formatNumber !== "function") {
    window.formatNumber = function (n) {
        const v = Number(n || 0);
        return v.toLocaleString("es-AR", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        });
    };
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

/* ============================================================
   LISTA STOCK (Saldos)
============================================================ */
async function cargarStock() {
    try {
        const resp = await fetch("/Stock/Saldos");
        if (!resp.ok) throw new Error("Error HTTP en Saldos");

        const data = await resp.json() || [];
        renderTablaStock(data);

        $("#kpiItemsStock").text(data.length.toLocaleString("es-AR"));
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
        // Orden por defecto: Fecha (col 3) descendente → más nuevo primero
        order: [[3, "desc"]],
        columns: [
            {
                data: "TipoItem",
                className: "text-center align-middle stock-col-tipo",
                render: function (tipo) {
                    const t = (tipo || "").toUpperCase();
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
                data: "CantidadActual",
                className: "text-end align-middle",
                render: function (d) {
                    const v = Number(d || 0);
                    const abs = formatNumber(Math.abs(v));
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
                    const safeNombre = (nombre || "").replace(/'/g, "\\'");
                    return `
                        <button type="button"
                                class="btn btn-sm btn-outline-light stock-btn-icon"
                                title="Historial de movimientos"
                                onclick="verHistorial('${tipo}', ${idProd ?? "null"}, ${idInsu ?? "null"}, '${safeNombre}')">
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
                exportOptions: { columns: [0, 1, 2, 3] }
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
                    api
                        .column(config.index)
                        .data()
                        .unique()
                        .sort()
                        .each(function (d) {
                            // Extraer texto plano si viene con HTML (TipoItem)
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
            $(".filters th").eq(4).html("");

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
   Usa: GET /Stock/HistorialItem?tipoItem=P|I&idProducto=&idInsumo=
============================================================ */
async function verHistorial(tipoItem, idProducto, idInsumo, nombreItem) {
    histContext = {
        tipoItem: (tipoItem || "").toUpperCase(),
        idProducto: idProducto,
        idInsumo: idInsumo,
        nombre: nombreItem
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

        // Header modal
        $("#histItemNombre").text(nombreItem || "-");
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
                    <td colspan="6" class="text-center py-3">
                        Cargando historial...
                    </td>
                </tr>`);
        }

        // Armar querystring
        const params = new URLSearchParams();
        params.append("tipoItem", tipo);
        if (tipo === "P" && idProducto != null) params.append("idProducto", idProducto);
        if (tipo === "I" && idInsumo != null) params.append("idInsumo", idInsumo);

        const resp = await fetch(`/Stock/HistorialItem?${params.toString()}`);
        if (!resp.ok) throw new Error("Error HTTP historial");

        /** @type {Array<any>} */
        const detalles = (await resp.json()) || [];

        // VMStockMovimientoDetalle extendido
        const historial = detalles.map(det => ({
            Id: det.Id,                        // id detalle
            IdMovimiento: det.IdMovimiento,    // cabecera
            Fecha: det.Fecha,
            TipoMovimiento: det.TipoMovimiento,
            Comentario: det.Comentario || "",
            Cantidad: Number(det.Cantidad || 0),
            EsEntrada: !!det.EsEntrada,
            EsAnulado: !!det.EsAnulado,

            // para el ojo (detalle completo)
            TipoItem: det.TipoItem || null,
            IdProducto: det.IdProducto ?? null,
            IdInsumo: det.IdInsumo ?? null
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

                    return `
                        <div class="d-flex justify-content-between align-items-center gap-2">
                            <span>${tipoMov}</span>
                            <button type="button"
                                    class="btn btn-xs btn-outline-light stock-btn-icon"
                                    title="Ver detalle completo del movimiento"
                                    onclick="verMovimientoCompleto(${row.IdMovimiento}, '${tipoItem}', ${idProd}, ${idInsu})">
                                <i class="fa fa-eye"></i>
                            </button>
                        </div>`;
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
                    const abs = formatNumber(Math.abs(v));
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
                    const eliminarDetalleBtn = `
                        <button type="button"
                                class="btn btn-outline-danger"
                                title="Eliminar SOLO este detalle"
                                onclick="eliminarDetalleHistorial(${idDet})">
                            <i class="fa fa-trash"></i>
                        </button>`;

                    return `
                        <div class="stock-actions d-inline-flex align-items-center">
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
                exportOptions: { columns: [0, 1, 2, 3, 4] }
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
        const v = Number(h.Cantidad || 0);
        if (v >= 0) entradas += v;
        else salidas += Math.abs(v);
    });

    const neto = entradas - salidas;

    $("#histTotalEntradas").text(formatNumber(entradas));
    $("#histTotalSalidas").text(formatNumber(salidas));
    $("#histTotalNeto").text(formatNumber(neto));
}

/* ============================================================
   DETALLE COMPLETO DE MOVIMIENTO (ojito en historial)
   Usa: GET /Stock/Obtener?id=
============================================================ */
async function verMovimientoCompleto(idMovimiento, tipoItemSel, idProductoSel, idInsumoSel) {
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

        detalles.forEach(d => {
            const tipo = (d.TipoItem || "").toUpperCase();
            const esProducto = tipo === "P";
            const idProd = d.IdProducto ?? null;
            const idInsu = d.IdInsumo ?? null;

            const nombre = d.NombreItem || "-";
            const cantidad = Number(d.Cantidad || 0);
            const costo = Number(d.CostoUnitario ?? 0);
            const subtotal = cantidad * costo;

            const seleccionado =
                tipoSel === tipo &&
                (
                    (tipo === "P" && idProdSel === idProd) ||
                    (tipo === "I" && idInsuSel === idInsu)
                );

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
                            <strong>${formatNumber(cantidad)}</strong>
                        </div>
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
