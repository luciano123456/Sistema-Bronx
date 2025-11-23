// ============================== Stock.js ==============================
let gridMovimientos = null;
let gridSaldos = null;

/* ============================================================
   ON LOAD
============================================================ */
$(document).ready(async () => {
    await cargarMovimientos();
    await cargarSaldos();
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
   LISTA MOVIMIENTOS
============================================================ */
async function cargarMovimientos() {
    const resp = await fetch("/Stock/Lista");
    const data = await resp.json();
    renderTablaMovimientos(data);
}

function renderTablaMovimientos(data) {
    if (gridMovimientos) {
        gridMovimientos.clear().rows.add(data).draw();
        return;
    }

    gridMovimientos = $("#grd_Movimientos").DataTable({
        data,
        pageLength: 50,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: "Id",
                render: id => `
                    <div class="acciones-menu" data-id="${id}">
                        <button class="btn btn-sm btnacciones" onclick="toggleAcciones(${id})">
                            <i class="fa fa-ellipsis-v"></i>
                        </button>
                        <div class="acciones-dropdown" style="display:none;">
                            <button class="btn btn-sm btneditar" onclick="editarMovimiento(${id})">
                                <i class="fa fa-pencil-square-o text-success"></i> Editar
                            </button>
                            <button class="btn btn-sm btneliminar" onclick="anularMovimiento(${id})">
                                <i class="fa fa-ban text-warning"></i> Anular
                            </button>
                            <button class="btn btn-sm btneliminar" onclick="eliminarMovimiento(${id})">
                                <i class="fa fa-trash-o text-danger"></i> Eliminar
                            </button>
                        </div>
                    </div>`
            },
            { data: "Fecha" },
            { data: "TipoMovimiento" },
            { data: "Comentario" },
            { data: "CantidadItems" },
            {
                data: "EsAnulado",
                render: v => v ? "<span class='text-danger fw-bold'>SI</span>" : "NO"
            }
        ],
        dom: "Bfrtip",
        buttons: [
            {
                extend: "excelHtml5",
                text: "Exportar Excel",
                filename: "Stock_Movimientos",
                exportOptions: { columns: [1, 2, 3, 4, 5] }
            }
        ]
    });
}

/* ============================================================
   TABLA SALDOS
============================================================ */
async function cargarSaldos() {
    const resp = await fetch("/Stock/Saldos");
    const data = await resp.json();
    renderTablaSaldos(data);
}

function renderTablaSaldos(data) {
    if (gridSaldos) {
        gridSaldos.clear().rows.add(data).draw();
        return;
    }

    gridSaldos = $("#grd_Saldos").DataTable({
        data,
        pageLength: 50,
        scrollX: true,
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            { data: "TipoItem" },
            { data: "IdProducto" },
            { data: "Producto" },
            { data: "IdInsumo" },
            { data: "Insumo" },
            { data: "CantidadActual" },
            { data: "Fecha" }
        ],
        dom: "Bfrtip",
        buttons: [
            {
                extend: "excelHtml5",
                text: "Exportar Excel",
                filename: "Stock_Saldos"
            }
        ]
    });
}

/* ============================================================
   ACCIONES (3 puntitos)
============================================================ */
function toggleAcciones(id) {
    $(".acciones-dropdown").hide();
    const $menu = $(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    $menu.toggle();
}

/* ============================================================
   ANULAR / ELIMINAR
============================================================ */
async function anularMovimiento(id) {
    if (!confirm("¿Desea ANULAR este movimiento?")) return;

    const resp = await fetch("/Stock/Anular?id=" + id, { method: "PUT" });
    const json = await resp.json();

    if (json.valor) {
        exitoModal?.("Movimiento anulado");
        cargarMovimientos();
        cargarSaldos();
    } else {
        errorModal?.("Error al anular");
    }
}

async function eliminarMovimiento(id) {
    if (!confirm("¿Desea ELIMINAR este movimiento?")) return;

    const resp = await fetch("/Stock/Eliminar?id=" + id, { method: "DELETE" });
    const json = await resp.json();

    if (json.valor) {
        exitoModal?.("Movimiento eliminado");
        cargarMovimientos();
        cargarSaldos();
    } else {
        errorModal?.("Error al eliminar");
    }
}
