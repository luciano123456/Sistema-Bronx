// ============================== Stock.js (FINAL COMPLETO CARDS + HISTORIAL) ==============================

let gridHistorial = null;

let STOCK_DATA = [];
let STOCK_FILTRADO = [];

let paginaActual = 1;
const PAGE_SIZE = 12;

// contexto actual del historial (para recargar después de eliminar/restaurar/etc.)
let histContext = {
    tipoItem: null,
    idProducto: null,
    idInsumo: null,
    nombre: null
};

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

function escaparHtml(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparJsString(texto) {
    return String(texto ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "")
        .replace(/\n/g, " ");
}

function getStockClass(stock) {
    const v = Number(stock || 0);
    if (v <= 0) return "stock-negativo";
    if (v < 10) return "stock-bajo";
    return "stock-ok";
}

/* ============================================================
   ON LOAD
============================================================ */
$(document).ready(async () => {
    await cargarStock();
    inicializarToolbarStock();
});

// Ajustar columnas del historial cada vez que se muestre el modal
$('#modalHistorialStock').on('shown.bs.modal', function () {
    if (gridHistorial) {
        setTimeout(() => {
            gridHistorial.columns.adjust().draw(false);
        }, 120);
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
   INIT TOOLBAR
============================================================ */
function inicializarToolbarStock() {
    const input = document.getElementById("txtBuscarStock");
    if (input) {
        input.addEventListener("input", function () {
            aplicarFiltrosStock();
        });
    }

    document.querySelectorAll(".seg-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            aplicarFiltrosStock();
        });
    });
}

/* ============================================================
   LISTA STOCK (SALDOS)
============================================================ */
async function cargarStock() {
    try {
        const resp = await fetch("/Stock/Saldos");
        if (!resp.ok) throw new Error("Error HTTP en Saldos");

        const data = await resp.json() || [];

        STOCK_DATA = Array.isArray(data) ? data : [];
        STOCK_DATA.sort((a, b) => {
            const da = new Date(a.Fecha || 0);
            const db = new Date(b.Fecha || 0);
            return db - da;
        });

        $("#kpiItemsStock").text(STOCK_DATA.length.toLocaleString("es-AR"));

        aplicarFiltrosStock();

    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") {
            errorModal("No se pudo cargar el stock.");
        }
    }
}

function aplicarFiltrosStock() {
    const txt = (document.getElementById("txtBuscarStock")?.value || "").toLowerCase().trim();
    const tipoActivo = document.querySelector(".seg-btn.active")?.dataset.tipo || "ALL";

    STOCK_FILTRADO = STOCK_DATA.filter(row => {
        const tipo = (row.TipoItem || "").toUpperCase();
        const nombre = tipo === "P"
            ? (row.Producto || "")
            : (row.Insumo || "");

        if (tipoActivo !== "ALL" && tipo !== tipoActivo) return false;
        if (txt && !nombre.toLowerCase().includes(txt)) return false;

        return true;
    });

    paginaActual = 1;
    renderStockPaginado();
}

function renderStockPaginado() {
    const inicio = (paginaActual - 1) * PAGE_SIZE;
    const fin = inicio + PAGE_SIZE;
    const paginaData = STOCK_FILTRADO.slice(inicio, fin);

    renderStockCards(paginaData);
    renderPaginador();
}

function renderStockCards(data) {
    const cont = document.getElementById("stockCardsContainer");
    if (!cont) return;

    cont.innerHTML = "";

    if (!data || !data.length) {
        cont.innerHTML = `
            <div class="stock-empty-state">
                <div class="stock-empty-icon">
                    <i class="fa fa-cubes"></i>
                </div>
                <div class="stock-empty-title">No se encontraron ítems</div>
                <div class="stock-empty-desc">
                    Probá cambiando el filtro o la búsqueda para ver productos e insumos.
                </div>
            </div>
        `;
        return;
    }

    data.forEach(row => {
        const tipo = (row.TipoItem || "").toUpperCase();
        const nombre = tipo === "P"
            ? (row.Producto || "")
            : (row.Insumo || "");

        const stock = Number(row.CantidadActual || 0);
        const stockFmt = formatNumber(stock);
        const tipoClase = tipo === "P" ? "stock-pill-producto" : "stock-pill-insumo";
        const tipoIcon = tipo === "P" ? "fa-cube" : "fa-wrench";
        const tipoText = tipo === "P" ? "Producto" : "Insumo";

        const idProd = row.IdProducto != null ? row.IdProducto : "null";
        const idInsu = row.IdInsumo != null ? row.IdInsumo : "null";
        const safeNombre = escaparJsString(nombre);

        const card = document.createElement("div");
        card.className = "stock-card-item pop-in";

        card.innerHTML = `
            <div class="stock-card-header">
                <span class="stock-pill ${tipoClase}">
                    <i class="fa ${tipoIcon} me-1"></i>${tipoText}
                </span>

                <button type="button"
                        class="stock-info-btn"
                        title="Historial de movimientos"
                        onclick="verHistorial('${tipo}', ${idProd}, ${idInsu}, '${safeNombre}')">
                    <i class="fa fa-history"></i>
                </button>
            </div>

            <div class="stock-card-body">
                <div class="stock-card-title" title="${escaparHtml(nombre)}">
                    ${escaparHtml(nombre || "-")}
                </div>

                <div class="stock-card-stock ${getStockClass(stock)}">
                    ${stock >= 0 ? "" : "- "}${formatNumber(Math.abs(stock))}
                </div>

                <div class="stock-card-last">
                    Último movimiento: ${formatDateTimeAR(row.Fecha) || "-"}
                </div>
            </div>
        `;

        cont.appendChild(card);
    });
}

function renderPaginador() {
    const cont = document.getElementById("stockPaginador");
    if (!cont) return;

    cont.innerHTML = "";

    const totalPaginas = Math.ceil(STOCK_FILTRADO.length / PAGE_SIZE);
    if (totalPaginas <= 1) return;

    const crearBtn = (texto, pagina, activo = false, disabled = false, extraClass = "") => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `${activo ? "active" : ""} ${extraClass}`.trim();
        btn.textContent = texto;
        if (disabled) {
            btn.disabled = true;
        } else {
            btn.onclick = () => {
                paginaActual = pagina;
                renderStockPaginado();
                scrollHastaTarjetaStock();
            };
        }
        cont.appendChild(btn);
    };

    crearBtn("‹", Math.max(1, paginaActual - 1), false, paginaActual === 1, "stock-page-arrow");

    const maxBotones = 7;
    let desde = Math.max(1, paginaActual - 3);
    let hasta = Math.min(totalPaginas, desde + maxBotones - 1);

    if ((hasta - desde + 1) < maxBotones) {
        desde = Math.max(1, hasta - maxBotones + 1);
    }

    if (desde > 1) {
        crearBtn("1", 1, paginaActual === 1);
        if (desde > 2) {
            const dots = document.createElement("span");
            dots.className = "stock-page-dots";
            dots.textContent = "…";
            cont.appendChild(dots);
        }
    }

    for (let i = desde; i <= hasta; i++) {
        crearBtn(String(i), i, i === paginaActual);
    }

    if (hasta < totalPaginas) {
        if (hasta < totalPaginas - 1) {
            const dots = document.createElement("span");
            dots.className = "stock-page-dots";
            dots.textContent = "…";
            cont.appendChild(dots);
        }
        crearBtn(String(totalPaginas), totalPaginas, paginaActual === totalPaginas);
    }

    crearBtn("›", Math.min(totalPaginas, paginaActual + 1), false, paginaActual === totalPaginas, "stock-page-arrow");
}

function scrollHastaTarjetaStock() {
    const cont = document.querySelector(".stock-card");
    if (!cont) return;

    const y = cont.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: "smooth" });
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
            if (typeof advertenciaModal === "function") {
                advertenciaModal("Tipo de ítem inválido.");
            }
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
                tipo === "P"
                    ? "stock-pill stock-pill-producto"
                    : tipo === "I"
                        ? "stock-pill stock-pill-insumo"
                        : "stock-pill stock-pill-generic"
            )
            .html(
                tipo === "P"
                    ? `<i class="fa fa-cube me-1"></i>Producto`
                    : `<i class="fa fa-wrench me-1"></i>Insumo`
            );

        const modalEl = document.getElementById("modalHistorialStock");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        if (!gridHistorial) {
            $("#grd_Historial tbody").html(`
                <tr>
                    <td colspan="6" class="text-center py-3">
                        Cargando historial...
                    </td>
                </tr>
            `);
        }

        const params = new URLSearchParams();
        params.append("tipoItem", tipo);
        if (tipo === "P" && idProducto != null) params.append("idProducto", idProducto);
        if (tipo === "I" && idInsumo != null) params.append("idInsumo", idInsumo);

        const resp = await fetch(`/Stock/HistorialItem?${params.toString()}`);
        if (!resp.ok) throw new Error("Error HTTP historial");

        const detalles = (await resp.json()) || [];

        const historial = detalles.map(det => ({
            Id: det.Id,
            IdMovimiento: det.IdMovimiento,
            Fecha: det.Fecha,
            TipoMovimiento: det.TipoMovimiento,
            Comentario: det.Comentario || "",
            Cantidad: Number(det.Cantidad || 0),
            EsEntrada: !!det.EsEntrada,
            EsAnulado: !!det.EsAnulado,
            TipoItem: det.TipoItem || null,
            IdProducto: det.IdProducto ?? null,
            IdInsumo: det.IdInsumo ?? null
        }));

        historial.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

        renderTablaHistorial(historial);
        recalcularResumenHistorial(historial);

    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") {
            errorModal("No se pudo cargar el historial de movimientos.");
        }
    }
}

/* ============================================================
   TABLA HISTORIAL (EN MODAL)
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
                            <span>${escaparHtml(tipoMov)}</span>
                            <button type="button"
                                    class="btn btn-xs btn-outline-light stock-btn-icon"
                                    title="Ver detalle completo del movimiento"
                                    onclick="verMovimientoCompleto(${row.IdMovimiento}, '${tipoItem}', ${idProd}, ${idInsu})">
                                <i class="fa fa-eye"></i>
                            </button>
                        </div>
                    `;
                }
            },
            {
                data: "Comentario",
                className: "align-middle",
                render: function (d) {
                    return escaparHtml(d || "");
                }
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
                        </span>
                    `;
                }
            },
            {
                data: null,
                className: "text-center align-middle",
                orderable: false,
                render: function (row) {
                    const idDet = row.Id;
                    return `
                        <div class="stock-actions d-inline-flex align-items-center">
                            <button type="button"
                                    class="btn btn-outline-danger"
                                    title="Eliminar SOLO este detalle"
                                    onclick="eliminarDetalleHistorial(${idDet})">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    `;
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
   RESUMEN HISTORIAL
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
   DETALLE COMPLETO DE MOVIMIENTO
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

        const mov = json.Movimiento || json;
        const detalles = json.Detalles || [];

        $("#movDetFecha").text(formatDateTimeAR(mov.Fecha));
        const tipoNombre = mov.TipoMovimientoNombre || `Tipo #${mov.IdTipoMovimiento}`;
        const suf = mov.EsAnulado ? " (ANULADO)" : "";

        $("#movDetTipo").text(tipoNombre + suf);
        $("#movDetComentario").text(mov.Comentario || "-");

        const cont = document.getElementById("movDetItems");
        cont.innerHTML = "";

        const tipoSel = (tipoItemSel || "").toUpperCase();
        const idProdSel = idProductoSel != null ? Number(idProductoSel) : null;
        const idInsuSel = idInsumoSel != null ? Number(idInsumoSel) : null;

        if (!detalles.length) {
            cont.innerHTML = `
                <div class="col-12">
                    <div class="stock-empty-state">
                        <div class="stock-empty-icon"><i class="fa fa-cubes"></i></div>
                        <div class="stock-empty-title">Sin ítems en este movimiento</div>
                        <div class="stock-empty-desc">No hay detalle disponible para mostrar.</div>
                    </div>
                </div>
            `;
        }

        detalles.forEach(d => {
            const tipo = (d.TipoItem || "").toUpperCase();
            const esProducto = tipo === "P";
            const idProd = d.IdProducto ?? null;
            const idInsu = d.IdInsumo ?? null;

            const nombre = d.NombreItem
                || d.IdProductoNavigation?.Nombre
                || d.IdInsumoNavigation?.Descripcion
                || "-";

            const cantidad = Number(d.Cantidad || 0);
            const costo = Number(d.CostoUnitario ?? 0);
            const subtotal = Number(d.SubTotal ?? (cantidad * costo));

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
                            <span class="fw-600">${escaparHtml(nombre)}</span>
                        </div>
                        <div class="text-end small text-muted-cc">
                            Cantidad<br>
                            <strong>${formatNumber(cantidad)}</strong>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between small mt-1">
                        <span>Costo unitario:
                            <strong>${formatMonedaSeguro(costo)}</strong>
                        </span>
                        <span>Subtotal:
                            <strong>${formatMonedaSeguro(subtotal)}</strong>
                        </span>
                    </div>
                </div>
            `;

            cont.appendChild(card);
        });

        const modalEl = document.getElementById("modalMovimientoDetalle");
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

    } catch (e) {
        console.error(e);
        errorModal?.("No se pudo cargar el detalle completo del movimiento.");
    }
}

function formatMonedaSeguro(n) {
    if (typeof window.formatMoneda === "function") {
        return window.formatMoneda(n);
    }

    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(n || 0));
}

/* ============================================================
   ELIMINAR DETALLE DESDE HISTORIAL
============================================================ */
async function eliminarDetalleHistorial(idDetalle) {
    try {
        let confirmado = true;

        if (typeof confirmarModal === "function") {
            confirmado = await confirmarModal(`
                ¿Seguro que desea <b style="color:#dc3545">ELIMINAR</b> este detalle del historial?
            `);
        } else {
            confirmado = confirm("¿Seguro que querés eliminar este movimiento del ítem?");
        }

        if (!confirmado) return;

        const resp = await fetch(`/Stock/EliminarDetalle?idDetalle=${idDetalle}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            throw new Error("No se pudo eliminar el detalle.");
        }

        const data = await resp.json();

        if (data.ok || data.valor) {
            if (typeof exitoModal === "function") {
                exitoModal("Detalle eliminado correctamente.");
            }

            await cargarHistorialActual();
            await cargarStock();
        } else {
            if (typeof errorModal === "function") {
                errorModal(data.mensaje || data.msg || "No se pudo eliminar el detalle.");
            }
        }

    } catch (e) {
        console.error(e);
        if (typeof errorModal === "function") {
            errorModal("Error al eliminar el detalle de stock.");
        }
    }
}