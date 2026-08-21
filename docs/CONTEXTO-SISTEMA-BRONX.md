# Sistema Bronx — contexto para trabajo continuo

Documento vivo: resume arquitectura, convenciones y lecciones aprendidas para sesiones futuras (Cursor / desarrollo diario).

---

## Qué es

- **Stack:** ASP.NET Core **6** (MVC + Razor), **Entity Framework Core 7**, **SQL Server**.
- **Tipo de app:** Intranet **server-rendered** (vistas Razor, DataTables, jQuery, Select2). No hay API REST separada; los controladores devuelven vistas y a veces JSON.
- **Solución:** [Sistema Bronx.sln](../Sistema%20Bronx.sln) — proyectos:
  - **SistemaBronx.Application** — host web (`Program.cs`, controladores, vistas, `wwwroot`, composición DI).
  - **SistemaBronx.BLL** — servicios (`Service/`).
  - **SistemaBronx.DAL** — EF Core (`SistemaBronxContext`, `Repository/`).
  - **SistemaBronx.Models** — entidades.

**Referencias:** La web referencia BLL y Models; el código usa tipos DAL vía referencia transitiva (BLL → DAL). `Program.cs` registra muchos repositorios/servicios como `Scoped`.

---

## Punto de entrada y layout

- **Arranque:** `SistemaBronx.Application/Program.cs` (minimal hosting, sin `Startup.cs`).
- **Layout:** `Views/Shared/_Layout.cshtml` carga **jQuery**, **Bootstrap**, **`~/js/site.js`** y luego **`@RenderSectionAsync("Scripts")`**.
- **Importante:** No volver a incluir `site.js` dentro de `@section Scripts` de una vista si el layout ya lo carga — provoca **doble ejecución** y errores (p. ej. `formatoMoneda` redeclarado). Se corrigió quitando el duplicado en `Pedidos/NuevoModif.cshtml` y `Cotizaciones/NuevoModif.cshtml`.

---

## Autenticación

- Cookies (`AddAuthentication` + `AddCookie`), claims; hash de contraseña con `PasswordHasher<User>`; no flujo completo ASP.NET Identity (UserManager/SignInManager).
- Rutas por defecto: `{controller=Pedidos}/{action=Index}/{id?}`.

---

## Datos

- **Contexto:** `SistemaBronx.DAL/DataContext/SistemaBronxContext.cs` (muchas entidades: pedidos, cotizaciones, stock, insumos, etc.).
- **Cadena:** `ConnectionStrings:SistemaDB` en `appsettings.json` (revisar secretos en producción).

---

## Módulo Pedidos (muy usado)

| Área | Ruta principal |
|------|----------------|
| Lista | `Views/Pedidos/Index.cshtml` + `wwwroot/js/Pedidos.js` |
| Alta / edición | `Views/Pedidos/NuevoModif.cshtml` + `wwwroot/js/PedidosNuevoModif.js` |

**Lógica clave en JS (pedidos):**

- **`CantidadInicial`** = cantidad de insumo **por 1 unidad de producto** en el pedido. La cantidad de línea = `CantidadInicial × cantidad de producto a fabricar` (o cantidad pedida menos stock de producto usado).
- Al **cargar un pedido guardado**, el API `GET /Pedidos/ObtenerDatosPedido` debe exponer coherencia entre detalle de producto e insumos; se añadió cálculo de `CantidadInicial` en el servidor y enriquecimiento en cliente (`enriquecerInsumosConCantidadInicial`).
- **No usar** shorthand erróneo: `{ ...row, CantidadInicial }` busca una variable `CantidadInicial`; debe ser `{ ...row, CantidadInicial: cantidadInicial }` si la variable local es `cantidadInicial`.
- **Formato números:** `formatNumber` en `site.js` devuelve **moneda** (`$`). Para cantidades de insumo/producto sin símbolo usar **`formatCantidadPedido`** definida en `PedidosNuevoModif.js`. Las respuestas JSON de `ObtenerDatosPedido` suelen traer **camelCase** (`usaStockProducto`, `cantidadStockProducto`, `idDetalle`); el JS de pedidos normaliza lectura con helpers (`usaStockProductoDesdeFilaPedido`, etc.) para que edición y guardado no pierdan flags de stock. En **«Editar producto»**, el checkbox/cantidad de stock PT del modal debe aplicarse **antes** de `setPedidoModalPane` (que dispara `controlarUsoStockInsumos`) y de armar la grilla de insumos, para que `productoTerminadoUsaStockEnModal()` y los badges «USA STOCK PRODUCTO» coincidan con la línea del pedido.
- **Stock en pedido:** el alta/actualización **no bloquea** por saldo insuficiente en depósito. Los saldos de insumo en modal usan `GET /Productos/EditarInfo?id=&idColor=`: sin `idColor` suma todos los colores; `idColor=0` solo sin color; con color **N** suma saldo de ese color **más** stock sin color (0/null). Al descontar depósito (`PedidoRepository` / `StockRepository`), si la línea tiene color y no hay fila exacta, se consume la fila **sin color**. En **movimientos de stock** (modal ítems), PT, insumo suelto y líneas BOM pueden ir **sin color** (`IdColor` null en movimiento). **PT del depósito en pedido:** `PedidosController.AnularStockInsumoSiProductoTerminadoUsaDeposito` solo anula `CantidadUsadaStock` de insumos cuando el PT cubre **toda** la cantidad del detalle (`CantidadUsadaStock >= Cantidad`); con PT parcial se generan salidas de insumo y de producto según corresponda. Al persistir `StockMovimientosDetalle` tras aplicar saldo, `IdColor` del detalle se alinea al **saldo** tocado (p. ej. sin color) para que el historial por ítem (`HistorialItem`, filtro por color) muestre la salida. **`idColor=0` en historial:** `HistorialItem` y `ObtenerMovimientosItem` listan **todas** las variantes de color del ítem (no solo `IdColor` null/0), para no ocultar salidas guardadas con color en el detalle.
- **Pedido → movimiento sin líneas:** al **actualizar** un pedido, si hay cambios de stock pero la lista de salidas construida queda vacía (el pedido ya no descuenta del depósito), `PedidoRepository.Actualizar` llama a `LimpiarMovimientoStockPedidoAsync` para no dejar una cabecera `StockMovimientos` sin `StockMovimientosDetalle`.
- **Actualizar pedido (persistencia de líneas):** `PedidoRepository.Actualizar` **no** hace `RemoveRange` de todos los detalles/procesos. Sincroniza por `Id`: **UPDATE** si `Id > 0` existe en BD, **INSERT** si es nuevo (mapea `IdDetalle` temporal del front con `idMappingDetalle` tras insertar productos), **DELETE** solo filas/procesos que ya no vienen en el payload (con limpieza de `PedidosDetalleStocks` / `PedidosDetalleProcesosStocks`). El front en edición debe enviar `Id` en productos e insumos (`PedidosNuevoModif.js` → `guardarCambios`).
- **Modal «Editar producto» (insumos):** si la línea ya tiene cantidad tomada del depósito **guardada en BD** al abrir el modal (`_insumoCantidadStockDesdeDb` > 0), el saldo mostrado puede ser 0 porque ya se consumió; no usar eso como «sin saldo» (checkbox rojo). `controlarUsoStockInsumos` **no** debe anular esas filas; UI: checkbox verde fijo solo en ese caso (`chk-insumo-stock-pedido`). Si el usuario **tilda** usar stock antes de guardar, el checkbox sigue habilitado para destildar. Resaltado de fila: barra vertical solo en la **primera** columna (`td:first-child`).
- **Producto terminado del depósito en pedido guardado:** si `CantidadStockProducto` > 0, al **Editar** se permite cambiar datos del **producto** (cantidad, precios, color); los **insumos del modal** son solo lectura con badge/checkbox **USA STOCK PRODUCTO** (`_pedModalStockPtPersistido`, `productoTerminadoUsaStockEnModal`). En la pestaña **Procesos e Insumos**, badge celeste **USA STOCK PRODUCTO** (`badgeStockResumenLineaInsumoPedido`). La grilla modal de producto debe pintar checkbox/cant. PT desde fila + `aplicarControlesStockPtGrillaModalProducto` (no dejar `value="0"` fijo en el render). El saldo en modal puede ser 0 tras el descuento; no recortar la cantidad PT guardada con el stock «actual».
- **Modal añadir producto (PT del depósito):** la columna informativa «Cant. stock» en insumos (`txt-cant-stock-insumo-via-pt`) calcula con `cantidadInformativaInsumoCubiertoPorProductoTerminado`: **CantidadInicial × cantidad del producto en el modal** (alineado con la columna **Cantidad** de la fila), no × la «Cant. stock PT» del producto terminado.

**Backend relacionado:** `SistemaBronx.Application/Controllers/PedidosController.cs` — `ObtenerDatosPedido` arma `VMPedidoDetalleProceso` incluyendo `CantidadInicial` cuando aplica. `IPedidoService.ObtenerPedido` / repositorio devuelven tupla `(Pedido, Dictionary<int,decimal> stockDepósito por línea de detalle producto, Dictionary<int,decimal> stockDepósito por línea de proceso insumo)`; las entidades `PedidosDetalle` / `PedidosDetalleProceso` **no** llevan `StockDisponibleDeposito` (solo columnas persistidas + navegación). **Catálogo modal PT** (`ProductosController.CatalogoPedidoModal` / `ProductoRepository.ObtenerCatalogoPedidoModalAsync`): además de cada color del maestro, se incluye la clave **IdColor 0** desde `StockSaldos` (PT con `IdColor` null/0) para que aparezcan en «Productos terminados» igual que el criterio de insumos.

---

## Stock

- **Index (`Stock.js`):** grilla `GET /Stock/Saldos`; columnas Tipo, Ítem, **Proveedor** (solo insumos, desde `Insumo.IdProveedorNavigation`; productos vacío), Color, Stock, Último movimiento; por defecto solo `CantidadActual > 0`; interruptor **Ver agotados** incluye saldos ≤ 0 (solo ítems con fila en `StockSaldos`, o sea con historial de movimientos). El botón **Historial** usa clase `js-stock-historial` y **delegación** `$(document).on("click", …)` con `data-*` (nombre/color en `encodeURIComponent`) para evitar `onclick` con comillas rotas; `cargarHistorialActual` valida `idProducto`/`idInsumo` numérico antes de llamar a `HistorialItem`. `StockController.HistorialItem` y `StockRepository.ObtenerMovimientosItem` devuelven lista vacía si falta el id del ítem.
- Listado / movimientos: `Stock.js`, `StockNuevoModif.js`, vistas bajo `Views/Stock/`.
- Tipos de movimiento: se filtra el tipo "PEDIDO" en combos; en **nuevo** movimiento se puede preseleccionar un tipo cuyo nombre contenga **"INGRES"** (ingreso).
- En el modal **Añadir ítems**, si el tipo de fila es **Producto**, el usuario elige **producto terminado** (`TipoItem = P`) o **insumos del producto** (lista desde `GET /Productos/ListaInsumosProducto?IdProducto=…`). En modo ficha: campo **Cantidad de producto** (multiplicador) y **checkbox por insumo**; la cantidad por línea = **Cantidad en ficha × cantidad de producto** (editable por línea después). Al confirmar, **una línea de detalle por cada insumo tildado** con su cantidad, `TipoItem = I` y costo del catálogo.
- Los combos de insumo en ese modal usan **Select2** con columna **Proveedor** (dato ya expuesto en `GET /Insumos/Lista`), **matcher** que busca por nombre o proveedor, cabecera tipo tabla en el desplegable y **foco automático** en el campo de búsqueda al abrir (`StockNuevoModif.js` + `Stock.css` v2.1+). **No usar `dropdownCssClass`** con `select2.min.js` (build sin “full”): dispara el adaptador `compat/dropdownCss` y falla en runtime; en su lugar se aplica la clase `stock-s2-ins-dropdown` en `select2:open`, o cargar `select2.full.min.js`.
- Modal **Añadir ítems** (`StockModalItems.css` + markup en `Stock/NuevoModif.cshtml`): **sin** `modal-dialog-scrollable` (chocaba con Select2 y el foco); una sola zona `.stock-mx-scroll` con `overscroll-behavior: contain`; `dropdownParent` de Select2 = **`document.body`** + `z-index` alto; `Modal` con **`focus: false`** y `focus({ preventScroll: true })` en el buscador para evitar que el scroll “salte” arriba. Modo **Producto → Insumos del producto**: arriba de la lista, **Cantidad de producto** (`aplicarFactorCantidadBom`) y **Color de insumos** (`aplicarColorGlobalBom` + `.stock-bom-factor-color`) propagan cantidad/color a todas las líneas BOM; sigue existiendo cambio masivo por línea con Ctrl+clic en varias filas.

---

## Fabricaciones

- Vista `Fabricaciones/Index` + `Fabricaciones.js`: edición en línea guarda con **`PUT /Fabricaciones/ActualizarLinea`** (misma entidad que pedidos pero **sin** `ResincronizarStockPedidoDesdeDbAsync`, para no validar depósito al cambiar solo estado/fabricación). El `PUT /Pedidos/ActualizarDetalleProceso` sigue usándose desde **Pedidos** y sí resincroniza stock. La lista `Fabricaciones/Lista` devuelve VM con `UsaStock` / `CantidadStock` / `CantidadUsadaStock` / `Especificacion` para no pisar la línea al guardar.

---

## `site.js` (helpers globales)

- `formatNumber` — formato tipo moneda con `$`.
- `formatoMoneda` — `Intl.NumberFormat` en `window` para no fallar si `site.js` se cargara más de una vez (patrón defensivo).
- `convertirMonedaAFloat`, modales de error/advertencia, utilidades DataTables/exportación, etc.

---

## Deuda técnica conocida (referencia)

- Repositorios muy grandes (p. ej. `PedidoRepository.cs`).
- Namespaces `TuProyecto.*` en módulo Análisis de datos vs `SistemaBronx.*`.
- `AddControllersWithViews()` duplicado en `Program.cs` (revisar si sigue igual).
- Sin tests automatizados visibles en la solución; configuración sensible en `appsettings`.

---

## Convenciones para el asistente

1. **Leer** el código cercano antes de cambiar; respetar estilo existente.
2. **No duplicar** scripts del layout en secciones `Scripts` sin motivo.
3. **Cuidado** con object shorthand en JS: el nombre a la derecha debe existir como variable.
4. **Pedidos:** siempre distinguir cantidad por unidad (`CantidadInicial`) vs cantidad de línea total.
5. Tras cambios en JS de pedidos, probar: nuevo pedido, editar cantidad de producto, insumos con/sin stock.

---

## Historial de decisiones (bitácora corta)

| Fecha (contexto) | Tema |
|------------------|------|
| 2026 | Análisis de arquitectura en capas; riesgos (secretos, static files, etc.). |
| 2026 | Pedidos: badges TIENE STOCK / USA STOCK; auto cantidad al usar stock de insumo; defaults PEDIR/ENTREGAR; cantidades sin `$`; corrección `CantidadInicial` al editar; `ObtenerDatosPedido` con `CantidadInicial`. |
| 2026 | Fix JS: `CantidadInicial` shorthand; `formatoMoneda` + quitar `site.js` duplicado en vistas NuevoModif; `site.js` idempotente para `formatoMoneda`. |
| 2026 | Modal pedido (`#productoModal`): PT / Fabricación / Insumos; `GET /Productos/CatalogoPedidoModal` — PT = producto×color con stock P &gt; 0; **Fabricación = todos los productos** (una fila, `Stock` = suma PT informativa); en solapa Fabricación se fuerza flujo por insumos (`_pedModalLineaEsFabricacion`); `EditarInfo` con `idColor` numérico (incluye **0 = sin color**) o sin query (suma colores); cache `id_sinFiltroColor` vs `id_0` vs `id_N`; al cambiar color en grilla modal se reconsulta `EditarInfo` y se actualiza `Stock` por fila. |

---

## Archivos frecuentes

- `SistemaBronx.Application/Program.cs`
- `SistemaBronx.Application/Controllers/PedidosController.cs`
- `SistemaBronx.Application/wwwroot/js/PedidosNuevoModif.js`
- `SistemaBronx.Application/wwwroot/js/site.js`
- `SistemaBronx.DAL/DataContext/SistemaBronxContext.cs`
- `SistemaBronx.Application/Views/Shared/_Layout.cshtml`

---

*Última actualización: documento creado para trabajo diario continuo; ampliar este archivo cuando cambie dominio o convenciones.*
