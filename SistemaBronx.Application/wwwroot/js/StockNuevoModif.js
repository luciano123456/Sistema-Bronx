// ============================== StockNuevoModif.js ==============================
let gridDetalle = null;
let DETALLES = [];
let TEMP_ID_SEQ = 1;

let CATALOGO_PRODUCTOS = [];
let CATALOGO_INSUMOS = [];

let STOCK_MODAL_ROW_SEQ = 1;

/** Select2 dentro de modales: anclar al body evita saltos de scroll y recortes. */
function stockModalSelect2Parent() {
    return $(document.body);
}

function stockSelect2Instancia($select) {
    return $select.data("select2");
}

function stockSelect2Dropdown($select) {
    const inst = stockSelect2Instancia($select);
    return inst && inst.$dropdown ? inst.$dropdown : $();
}

/* ========================================================================
   SELECT2 INSUMOS (proveedor + búsqueda + foco)
======================================================================== */
function normalizarTextoBusqueda(s) {
    return String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function stockFormatInsumoResult(data) {
    if (data.loading) {
        return data.text;
    }
    if (!data.id) {
        return data.text;
    }
    const prov = (data.element && data.element.getAttribute("data-proveedor")) || "";
    const row = document.createElement("div");
    row.className = "stock-s2-ins-row";
    const nom = document.createElement("span");
    nom.className = "stock-s2-ins-nom";
    nom.textContent = data.text || "";
    const pv = document.createElement("span");
    pv.className = "stock-s2-ins-prov";
    pv.textContent = prov || "—";
    row.appendChild(nom);
    row.appendChild(pv);
    return $(row);
}

function stockFormatInsumoSelection(data) {
    if (!data.id) {
        return data.text;
    }
    const prov = (data.element && data.element.getAttribute("data-proveedor")) || "";
    const wrap = document.createElement("span");
    wrap.className = "stock-s2-ins-sel";
    wrap.appendChild(document.createTextNode(data.text || ""));
    if (prov) {
        const sep = document.createElement("span");
        sep.className = "stock-s2-ins-sel-sep";
        sep.textContent = " · ";
        const p = document.createElement("span");
        p.className = "stock-s2-ins-sel-prov";
        p.textContent = prov;
        wrap.appendChild(sep);
        wrap.appendChild(p);
    }
    return $(wrap);
}

function stockMatcherInsumo(params, data) {
    if ($.trim(params.term || "") === "") {
        return data;
    }
    if (typeof data.text === "undefined" || data.text === "") {
        return null;
    }
    const t = normalizarTextoBusqueda(params.term);
    const nom = normalizarTextoBusqueda(data.text);
    const prov = normalizarTextoBusqueda(
        (data.element && data.element.getAttribute("data-proveedor")) || ""
    );
    if (!t) {
        return data;
    }
    if (nom.indexOf(t) !== -1 || prov.indexOf(t) !== -1) {
        return data;
    }
    return null;
}

function stockInsumoDropdownAgregarCabecera() {
    const $dd = $(".select2-dropdown.stock-s2-ins-dropdown").first();
    if (!$dd.length) {
        return;
    }
    const $results = $dd.find(".select2-results");
    if (!$results.length || $results.find(".stock-s2-ins-head").length) {
        return;
    }
    const head = $(`
        <div class="stock-s2-ins-head">
            <span class="stock-s2-ins-head-nom">Insumo</span>
            <span class="stock-s2-ins-head-prov">Proveedor</span>
        </div>`);
    $results.prepend(head);
}

function stockInsumoSelect2Options($row) {
    /* No usar dropdownCssClass: con select2.min.js (sin .full) Select2 intenta cargar compat/dropdownCss y revienta. */
    return {
        dropdownParent: stockModalSelect2Parent(),
        placeholder: "Buscar insumo o proveedor…",
        allowClear: true,
        width: "100%",
        minimumResultsForSearch: 0,
        templateResult: stockFormatInsumoResult,
        templateSelection: stockFormatInsumoSelection,
        matcher: stockMatcherInsumo,
        language: {
            noResults: function () {
                return "Sin coincidencias";
            },
            searching: function () {
                return "Buscando…";
            }
        }
    };
}

function enlazarSelect2InsumoStock($select, $row) {
    $select.off("change.modal").on("change.modal", () => actualizarCostoSubFila($row));
    $select.off("select2:open.stockins").on("select2:open.stockins", function () {
        const $self = $(this);
        setTimeout(function () {
            stockSelect2Dropdown($self).addClass("stock-s2-ins-dropdown");
            stockInsumoDropdownAgregarCabecera();
            const el = document.querySelector(".select2-container--open .select2-search__field");
            if (el && typeof el.focus === "function") {
                try {
                    el.focus({ preventScroll: true });
                } catch (_e) {
                    el.focus();
                }
            }
        }, 0);
    });
    $select.off("select2:close.stockins").on("select2:close.stockins", function () {
        stockSelect2Dropdown($(this)).removeClass("stock-s2-ins-dropdown");
    });
}

function llenarSelectInsumosConMeta($sel, placeholder) {
    $sel.empty();
    $sel.append(new Option(placeholder, ""));
    (CATALOGO_INSUMOS || []).forEach(x => {
        const opt = new Option(x.Nombre, x.Id);
        opt.setAttribute("data-proveedor", x.Proveedor || "");
        $sel.append(opt);
    });
}

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

        const listaTipos = (data || [])
            .filter(t => (t.Nombre || "").toUpperCase() !== "PEDIDO"); // 🔥 FILTRO

        listaTipos.forEach(t => {
            $sel.append(new Option(t.Nombre, t.Id));
        });

        const idMov = Number($("#IdMovimiento").val() || 0);
        if (idMov <= 0) {
            const ingreso = listaTipos.find(t => (t.Nombre || "").toUpperCase().includes("INGRES"));
            if (ingreso) {
                $sel.val(String(ingreso.Id)).trigger("change");
            }
        }

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
                CostoUnitario: parseNumeroAR(p.CostoUnitario || 0)
            }));
        }

        // Insumos
        let rIns = await fetch("/Insumos/Lista");
        if (rIns.ok) {
            const dataI = await rIns.json();
            CATALOGO_INSUMOS = (dataI || []).map(i => ({
                Id: i.Id,
                Nombre: i.Descripcion,
                Proveedor: (i.Proveedor || "").trim(),
                CostoUnitario: parseNumeroAR(i.PrecioCosto || 0)
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

            const costo = parseNumeroAR(d.CostoUnitario);
            const cantidad = Number(d.Cantidad || 0);
            const subtotal = parseNumeroAR(cantidad) * parseNumeroAR(costo);

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

    const el = document.getElementById("modalItems");
    const modal = bootstrap.Modal.getOrCreateInstance(el, { focus: false });
    modal.show();
}

function agregarFilaModal() {
    const rowUid = STOCK_MODAL_ROW_SEQ++;
    const tr = $(`
        <tr class="stock-mx-tr stock-modal-fila" data-stock-row="${rowUid}">
            <td class="stock-mx-td-tipo">
                <select class="form-select form-select-sm stock-input stock-tipo-select stock-mx-tipo" data-field="Tipo">
                    <option value="I">Insumo</option>
                    <option value="P">Producto</option>
                </select>
            </td>
            <td class="stock-mx-td-item stock-modal-item-cell"></td>
            <td class="stock-mx-td-qty">
                <input type="number"
                       class="form-control form-control-sm stock-input stock-mx-input stock-mx-cant-simple text-center"
                       data-field="Cantidad"
                       min="0.001" step="0.001" value="1" />
                <div class="stock-mx-cant-bom-note d-none small text-center stock-mx-cant-bom-hint">
                    Cantidad<br /><span class="stock-mx-cant-bom-hint-sub">por insumo →</span>
                </div>
            </td>
            <td class="stock-mx-td-money">
                <input type="text"
                       class="form-control form-control-sm stock-input stock-mx-input text-end"
                       data-field="Costo"
                       readonly />
            </td>
            <td class="stock-mx-td-money">
                <input type="text"
                       class="form-control form-control-sm stock-input stock-mx-input text-end"
                       data-field="Subtotal"
                       readonly />
            </td>
            <td class="stock-mx-td-actions text-center">
                <button type="button" class="btn btn-sm stock-mx-btn-remove"
                        onclick="eliminarFilaModal(this)" title="Quitar fila">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>`);

    $("#tbodyModalItems").append(tr);
    inicializarFilaModal(tr);
}

function destruirSelect2En($root) {
    $root.find("select").each(function () {
        const $s = $(this);
        if ($s.data("select2")) {
            $s.select2("destroy");
        }
    });
}

function nombreModoProductoRadio($row) {
    const uid = $row.data("stock-row") || "0";
    return `modo_prod_${uid}`;
}

function renderHtmlCeldaItem(tipoChar, rowUid) {
    const nameRadio = `modo_prod_${rowUid}`;
    if (tipoChar === "I") {
        return `
            <div class="stock-item-panel stock-item-panel--insumo">
                <span class="stock-field-label">Insumo</span>
                <select class="form-select form-select-sm stock-input stock-insumo-item-select stock-select-searchable"
                        data-field="Item" title="Insumo">
                    <option value="">Seleccioná o buscá…</option>
                </select>
            </div>`;
    }
    return `
        <div class="stock-item-panel stock-item-panel--producto">
            <span class="stock-field-label">Producto</span>
            <select class="form-select form-select-sm stock-input stock-prod-select stock-select-prod"
                    data-field="Producto" title="Producto">
                <option value="">Seleccioná producto…</option>
            </select>
            <div class="stock-prod-modo-block">
                <span class="stock-field-label stock-field-label--sub">¿Qué stock movés?</span>
                <div class="stock-modo-segmented" role="radiogroup" aria-label="Tipo de stock del producto">
                    <div class="stock-modo-slot">
                        <input class="stock-modo-input stock-modo-prod-radio" type="radio" name="${nameRadio}" id="${nameRadio}_T" value="T" checked />
                        <label class="stock-modo-pill" for="${nameRadio}_T" title="Stock del producto terminado">
                            <i class="fa fa-cube"></i> Producto terminado
                        </label>
                    </div>
                    <div class="stock-modo-slot">
                        <input class="stock-modo-input stock-modo-prod-radio" type="radio" name="${nameRadio}" id="${nameRadio}_B" value="B" />
                        <label class="stock-modo-pill" for="${nameRadio}_B" title="Uno o varios insumos de la ficha del producto">
                            <i class="fa fa-wrench"></i> Insumos del producto
                        </label>
                    </div>
                </div>
            </div>
            <div class="stock-bom-wrap d-none">
                <span class="stock-field-label stock-field-label--sub">Insumos de la ficha</span>
                <div class="stock-bom-actions d-none">
                    <button type="button" class="btn btn-link btn-sm p-0 stock-bom-marcar-todos">Marcar todos</button>
                    <span class="stock-bom-actions-sep">·</span>
                    <button type="button" class="btn btn-link btn-sm p-0 stock-bom-desmarcar-todos">Quitar todos</button>
                </div>
                <div class="stock-bom-check-list"></div>
                <div class="stock-bom-vacio small d-none mt-2">
                    <i class="fa fa-info-circle me-1"></i> Este producto no tiene insumos cargados en la ficha.
                </div>
            </div>
        </div>`;
}

function llenarSelectBasico($sel, lista, placeholder) {
    $sel.empty();
    $sel.append(new Option(placeholder, ""));
    lista.forEach(x => $sel.append(new Option(x.Nombre, x.Id)));
}

/** Lista de checkboxes: uno o varios insumos de la ficha del producto. */
async function renderBomCheckList($row, idProducto) {
    const $list = $row.find(".stock-bom-check-list");
    const $vacío = $row.find(".stock-bom-vacio");
    const $actions = $row.find(".stock-bom-actions");

    $list.empty();
    $vacío.addClass("d-none");
    $actions.addClass("d-none");

    if (!idProducto) {
        return;
    }

    try {
        const resp = await fetch(`/Productos/ListaInsumosProducto?IdProducto=${idProducto}`);
        if (!resp.ok) {
            throw new Error("insumos");
        }
        const lista = await resp.json();
        const arr = lista || [];
        if (!arr.length) {
            $vacío.removeClass("d-none");
            return;
        }

        $actions.removeClass("d-none");

        const uid = String($row.data("stock-row") || "0");

        arr.forEach(x => {
            const idIns = Number(x.IdInsumo || 0);
            if (!idIns) {
                return;
            }
            const cat = CATALOGO_INSUMOS.find(c => Number(c.Id) === idIns);
            const nom = String((x.Nombre || cat?.Nombre || "Insumo")).trim();
            const prov = (cat && cat.Proveedor) ? String(cat.Proveedor).trim() : "";
            const chkId = `stock-bom-chk-${uid}-${idIns}`;

            const $line = $("<div>").addClass("stock-bom-line");
            const $chk = $("<input>", {
                type: "checkbox",
                class: "stock-bom-chk",
                id: chkId,
                value: String(idIns)
            });
            const $hit = $("<label>", { for: chkId, class: "stock-bom-line-hit" });
            $hit.append(
                $("<span>").addClass("stock-bom-line-nom").text(nom),
                $("<span>").addClass("stock-bom-line-prov").text(prov || "—")
            );

            const $qtyWrap = $("<div>").addClass("stock-bom-line-qty-wrap");
            $qtyWrap.append(
                $("<span>").addClass("stock-bom-line-qty-lbl").text("Cant."),
                $("<input>", {
                    type: "number",
                    class: "form-control form-control-sm stock-input stock-bom-qty text-center",
                    min: "0.001",
                    step: "0.001",
                    value: "1"
                })
            );

            $line.append($chk, $hit, $qtyWrap);
            $list.append($line);
        });

        const baseCant = Number($row.find('[data-field="Cantidad"]').val() || 0) || 1;
        $row.find(".stock-bom-qty").val(String(baseCant));
        $row.find(".stock-bom-chk").prop("checked", true);
        syncEstadoCantidadesBom($row);
    } catch (e) {
        console.error(e);
        advertenciaModal?.("No se pudieron cargar los insumos del producto.");
    }
}

async function prepararBomSegunContexto($row, idProducto) {
    if (modoProductoSeleccionado($row) === "B" && idProducto > 0) {
        await renderBomCheckList($row, idProducto);
    } else {
        await renderBomCheckList($row, 0);
    }
}

/**
 * Líneas que esta fila del modal aportará al movimiento (BOM: una por insumo tildado, cada uno con su cantidad).
 */
function obtenerLineasConfirmacionDesdeFilaModal($row) {
    const tipoCol = $row.find('[data-field="Tipo"]').val();

    if (tipoCol === "I") {
        const cantidad = Number($row.find('[data-field="Cantidad"]').val() || 0);
        if (cantidad <= 0) {
            return [];
        }
        const id = Number($row.find(".stock-insumo-item-select").val() || 0);
        const item = CATALOGO_INSUMOS.find(x => x.Id === id);
        if (!id || !item) {
            return [];
        }
        return [{
            tipoItem: "I",
            idProducto: null,
            idInsumo: id,
            costo: item.CostoUnitario,
            nombre: item.Nombre,
            cantidad
        }];
    }

    const idProd = Number($row.find(".stock-prod-select").val() || 0);
    const prod = CATALOGO_PRODUCTOS.find(x => x.Id === idProd);
    if (!idProd || !prod) {
        return [];
    }

    if (modoProductoSeleccionado($row) === "T") {
        const cantidad = Number($row.find('[data-field="Cantidad"]').val() || 0);
        if (cantidad <= 0) {
            return [];
        }
        return [{
            tipoItem: "P",
            idProducto: idProd,
            idInsumo: null,
            costo: prod.CostoUnitario,
            nombre: prod.Nombre,
            cantidad
        }];
    }

    const lineasBom = [];
    $row.find(".stock-bom-line").each(function () {
        const $line = $(this);
        if (!$line.find(".stock-bom-chk").is(":checked")) {
            return;
        }
        const id = Number($line.find(".stock-bom-chk").val() || 0);
        const cantidad = Number($line.find(".stock-bom-qty").val() || 0);
        if (!id || cantidad <= 0) {
            return;
        }
        const cat = CATALOGO_INSUMOS.find(c => Number(c.Id) === id);
        if (!cat) {
            return;
        }
        lineasBom.push({
            tipoItem: "I",
            idProducto: null,
            idInsumo: id,
            costo: cat.CostoUnitario,
            nombre: cat.Nombre,
            cantidad
        });
    });
    return lineasBom;
}

function modoProductoSeleccionado($row) {
    const nameRadio = nombreModoProductoRadio($row);
    const v = $row.find(`input[name="${nameRadio}"]:checked`).val();
    return v === "B" ? "B" : "T";
}

function esCantidadPorBomInsumos($row) {
    return $row.find('[data-field="Tipo"]').val() === "P" && modoProductoSeleccionado($row) === "B";
}

function actualizarUIModoCantidadColumna($row) {
    const $inp = $row.find('[data-field="Cantidad"]');
    const $note = $row.find(".stock-mx-cant-bom-note");
    if (esCantidadPorBomInsumos($row)) {
        $inp.addClass("d-none");
        $note.removeClass("d-none");
    } else {
        $inp.removeClass("d-none");
        $note.addClass("d-none");
    }
}

function syncEstadoCantidadesBom($row) {
    $row.find(".stock-bom-line").each(function () {
        const $line = $(this);
        const on = $line.find(".stock-bom-chk").is(":checked");
        $line.find(".stock-bom-qty").prop("disabled", !on);
        $line.toggleClass("stock-bom-line--off", !on);
    });
}

function actualizarVisibilidadBom($row) {
    const tipo = $row.find('[data-field="Tipo"]').val();
    const $wrap = $row.find(".stock-bom-wrap");
    if (tipo !== "P") {
        $wrap.addClass("d-none");
        actualizarUIModoCantidadColumna($row);
        return;
    }
    const modo = modoProductoSeleccionado($row);
    if (modo === "B") {
        $wrap.removeClass("d-none");
    } else {
        $wrap.addClass("d-none");
    }
    actualizarUIModoCantidadColumna($row);
    syncEstadoCantidadesBom($row);
}

function actualizarCostoSubFila($row) {
    const $costo = $row.find('[data-field="Costo"]');
    const $sub = $row.find('[data-field="Subtotal"]');
    const lineas = obtenerLineasConfirmacionDesdeFilaModal($row);

    if (!lineas.length) {
        $costo.val(formatMoneda(0));
        $sub.val(formatMoneda(0));
        return;
    }

    const total = lineas.reduce((s, L) => s + parseNumeroAR(L.costo) * parseNumeroAR(L.cantidad), 0);

    if (lineas.length === 1) {
        $costo.val(formatMoneda(lineas[0].costo));
    } else {
        $costo.val(`${lineas.length} ítems`);
    }

    $sub.val(formatMoneda(round2(total)));
}

function inicializarFilaModal($row) {
    const $tipo = $row.find('[data-field="Tipo"]');
    const $cell = $row.find(".stock-modal-item-cell");
    const $cant = $row.find('[data-field="Cantidad"]');
    const rowUid = $row.data("stock-row") || STOCK_MODAL_ROW_SEQ++;

    function montarCeldaItem(tipoChar) {
        destruirSelect2En($cell);
        $cell.html(renderHtmlCeldaItem(tipoChar, rowUid));

        if (tipoChar === "I") {
            const $ins = $row.find(".stock-insumo-item-select");
            llenarSelectInsumosConMeta($ins, "Seleccioná o buscá…");
            if ($ins.data("select2")) {
                $ins.select2("destroy");
            }
            $ins.select2(stockInsumoSelect2Options($row));
            enlazarSelect2InsumoStock($ins, $row);
        } else {
            const $prod = $row.find(".stock-prod-select");
            llenarSelectBasico($prod, CATALOGO_PRODUCTOS, "Seleccioná producto…");
            $prod.select2({
                dropdownParent: stockModalSelect2Parent(),
                placeholder: "Buscar producto…",
                allowClear: true,
                width: "100%",
                minimumResultsForSearch: 0
            });
            $prod.off("select2:open.stockprod").on("select2:open.stockprod", function () {
                setTimeout(function () {
                    const el = document.querySelector(".select2-container--open .select2-search__field");
                    if (el && typeof el.focus === "function") {
                        try {
                            el.focus({ preventScroll: true });
                        } catch (_e) {
                            el.focus();
                        }
                    }
                }, 0);
            });

            void prepararBomSegunContexto($row, 0);

            $prod.off("change.modal").on("change.modal", async function () {
                const idP = Number($(this).val() || 0);
                await prepararBomSegunContexto($row, idP);
                actualizarVisibilidadBom($row);
                actualizarCostoSubFila($row);
            });

            $row.find(".stock-modo-prod-radio").off("change.modal").on("change.modal", async function () {
                actualizarVisibilidadBom($row);
                const idP = Number($prod.val() || 0);
                await prepararBomSegunContexto($row, idP);
                actualizarCostoSubFila($row);
            });

            $row.off("change.bomchk").on("change.bomchk", ".stock-bom-chk", function () {
                syncEstadoCantidadesBom($row);
                actualizarCostoSubFila($row);
            });
            $row.off("input.bomqty").on("input.bomqty", ".stock-bom-qty", () => actualizarCostoSubFila($row));
            $row.off("click.bomall").on("click.bomall", ".stock-bom-marcar-todos", function (e) {
                e.preventDefault();
                $row.find(".stock-bom-chk").prop("checked", true);
                syncEstadoCantidadesBom($row);
                actualizarCostoSubFila($row);
            });
            $row.off("click.bomnone").on("click.bomnone", ".stock-bom-desmarcar-todos", function (e) {
                e.preventDefault();
                $row.find(".stock-bom-chk").prop("checked", false);
                syncEstadoCantidadesBom($row);
                actualizarCostoSubFila($row);
            });
        }

        actualizarVisibilidadBom($row);
        actualizarCostoSubFila($row);
    }

    $tipo.off("change.modal").on("change.modal", function () {
        montarCeldaItem($(this).val());
    });

    $cant.off("input.modal").on("input.modal", () => actualizarCostoSubFila($row));

    montarCeldaItem($tipo.val());
}

function eliminarFilaModal(btn) {
    const $tr = $(btn).closest("tr");
    destruirSelect2En($tr);
    $tr.remove();
}

function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
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
        const lineas = obtenerLineasConfirmacionDesdeFilaModal($row);
        if (!lineas.length) {
            return;
        }

        lineas.forEach(function (L) {
            const tipoItem = L.tipoItem;
            const cantidad = L.cantidad;
            const costo = L.costo;

            let existente = DETALLES.find(d =>
                d.TipoItem === tipoItem &&
                ((tipoItem === "P" && d.IdProducto === L.idProducto) ||
                    (tipoItem === "I" && d.IdInsumo === L.idInsumo))
            );

            if (existente) {
                existente.Cantidad = Number(existente.Cantidad || 0) + cantidad;
                existente.SubTotal = round2(
                    parseNumeroAR(existente.CostoUnitario) * parseNumeroAR(existente.Cantidad)
                );
            } else {
                DETALLES.push({
                    TempId: TEMP_ID_SEQ++,
                    Id: 0,
                    IdMovimiento: Number($("#IdMovimiento").val() || 0),
                    TipoItem: tipoItem,
                    IdProducto: L.idProducto,
                    IdInsumo: L.idInsumo,
                    Cantidad: cantidad,
                    CostoUnitario: costo,
                    SubTotal: round2(parseNumeroAR(cantidad) * parseNumeroAR(costo)),
                    NombreItem: L.nombre || ""
                });
            }

            agregados++;
        });
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
    det.SubTotal = round2(parseNumeroAR(det.CostoUnitario) * parseNumeroAR(nuevaCant));

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


function parseNumeroAR(valor) {
    if (!valor) return 0;

    if (typeof valor === "number") return valor;

    return Number(
        valor
            .toString()
            .replace(/\./g, "")   // elimina miles
            .replace(",", ".")    // convierte decimal
    ) || 0;
}