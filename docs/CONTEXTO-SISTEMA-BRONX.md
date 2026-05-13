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
- **Formato números:** `formatNumber` en `site.js` devuelve **moneda** (`$`). Para cantidades de insumo/producto sin símbolo usar **`formatCantidadPedido`** definida en `PedidosNuevoModif.js`.
- Estados de insumo (PEDIR / ENTREGAR): se resuelven por nombre desde `/PedidosEstados/Lista` (caché en cliente).

**Backend relacionado:** `SistemaBronx.Application/Controllers/PedidosController.cs` — `ObtenerDatosPedido` arma `VMPedidoDetalleProceso` incluyendo `CantidadInicial` cuando aplica.

---

## Stock

- Listado / movimientos: `Stock.js`, `StockNuevoModif.js`, vistas bajo `Views/Stock/`.
- Tipos de movimiento: se filtra el tipo "PEDIDO" en combos; en **nuevo** movimiento se puede preseleccionar un tipo cuyo nombre contenga **"INGRES"** (ingreso).
- En el modal **Añadir ítems**, si el tipo de fila es **Producto**, el usuario elige **producto terminado** (`TipoItem = P`) o **insumos del producto** (lista desde `GET /Productos/ListaInsumosProducto?IdProducto=…`). En modo ficha: **checkbox por insumo + campo cantidad por línea** (cada uno puede ser distinto); al confirmar, **una línea de detalle por cada insumo tildado** con su cantidad, `TipoItem = I` y costo del catálogo.
- Los combos de insumo en ese modal usan **Select2** con columna **Proveedor** (dato ya expuesto en `GET /Insumos/Lista`), **matcher** que busca por nombre o proveedor, cabecera tipo tabla en el desplegable y **foco automático** en el campo de búsqueda al abrir (`StockNuevoModif.js` + `Stock.css` v2.1+). **No usar `dropdownCssClass`** con `select2.min.js` (build sin “full”): dispara el adaptador `compat/dropdownCss` y falla en runtime; en su lugar se aplica la clase `stock-s2-ins-dropdown` en `select2:open`, o cargar `select2.full.min.js`.
- Modal **Añadir ítems** (`StockModalItems.css` + markup en `Stock/NuevoModif.cshtml`): **sin** `modal-dialog-scrollable` (chocaba con Select2 y el foco); una sola zona `.stock-mx-scroll` con `overscroll-behavior: contain`; `dropdownParent` de Select2 = **`document.body`** + `z-index` alto; `Modal` con **`focus: false`** y `focus({ preventScroll: true })` en el buscador para evitar que el scroll “salte” arriba.

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
| 2026 | Modal pedido (`#productoModal`): tres segmentos PT / Fabricación / Insumos; catálogo `GET /Productos/CatalogoPedidoModal` (producto×color, stock por `StockSaldos` tipo P); PT lista `Stock>0`, Fab `Stock<=0`; insumos compartidos; línea fabricación no usa stock de producto terminado (`_pedModalLineaEsFabricacion`). |

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
