using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models.Analisis;

namespace SistemaBronx.Application.Controllers
{
    /// <summary>
    /// Análisis de datos. Todo se calcula en código (BLL) a partir de consultas EF Core; ya no hay stored procedures.
    /// Las reglas de IVA / costo financiero / neto replican el Excel "ANALISIS BRONX" (ver <see cref="ReglasAnalisis"/>).
    /// </summary>
    [Authorize]
    public class AnalisisDatosController : Controller
    {
        private readonly IAnalisisDatosService _service;
        private readonly ILogger<AnalisisDatosController> _logger;

        public AnalisisDatosController(IAnalisisDatosService service, ILogger<AnalisisDatosController> logger)
        {
            _service = service;
            _logger = logger;
        }

        public IActionResult Index() => View();

        /// <summary>Años, rango de fechas con datos y formas de pago (chips del filtro).</summary>
        [HttpGet]
        public Task<IActionResult> Meta(CancellationToken ct)
            => Ejecutar(async () => Ok(await _service.ObtenerMetaAsync(ct)));

        /// <summary>Tablero completo: KPIs, series, medios de pago, productos, categorías, clientes y gastos.</summary>
        [HttpGet]
        public Task<IActionResult> Datos(DateTime? desde, DateTime? hasta, int? idCliente, int? idFormaPago, CancellationToken ct)
            => Ejecutar(async () => Ok(await _service.ObtenerDashboardAsync(ArmarFiltro(desde, hasta, idCliente, idFormaPago), ct)));

        /// <summary>Detalle de ventas con las columnas del Excel (abonado, IVA, costo financiero, ganancia neta).</summary>
        [HttpGet]
        public Task<IActionResult> Ventas(DateTime? desde, DateTime? hasta, int? idCliente, int? idFormaPago, CancellationToken ct)
            => Ejecutar(async () => Ok(await _service.ObtenerVentasDetalleAsync(ArmarFiltro(desde, hasta, idCliente, idFormaPago), ct)));

        /// <summary>Líneas de producto de un pedido (fila expandible de la tabla de ventas).</summary>
        [HttpGet]
        public Task<IActionResult> VentaDetalle(int id, CancellationToken ct)
            => Ejecutar(async () =>
            {
                var detalle = await _service.ObtenerDetallePedidoAsync(id, ct);
                return detalle == null ? NotFound("No se encontró el pedido.") : Ok(detalle);
            });

        /// <summary>Detalle de gastos con las columnas del Excel (importe total, neto).</summary>
        [HttpGet]
        public Task<IActionResult> Gastos(DateTime? desde, DateTime? hasta, int? idFormaPago, CancellationToken ct)
            => Ejecutar(async () => Ok(await _service.ObtenerGastosDetalleAsync(ArmarFiltro(desde, hasta, null, idFormaPago), ct)));

        // ------------------------------------------------------------------ helpers
        private static AnalisisFiltro ArmarFiltro(DateTime? desde, DateTime? hasta, int? idCliente, int? idFormaPago)
        {
            var fin = (hasta ?? DateTime.Today).Date;
            var ini = (desde ?? fin.AddDays(-29)).Date;
            return new AnalisisFiltro { Desde = ini, Hasta = fin, IdCliente = idCliente, IdFormaPago = idFormaPago };
        }

        private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
        {
            try
            {
                return await accion();
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499); // el usuario cambió de filtro y el navegador canceló la consulta
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en AnalisisDatos/{Accion}", ControllerContext.ActionDescriptor.ActionName);
                return BadRequest("Ha ocurrido un error al obtener el análisis de datos. " + ex.Message);
            }
        }
    }
}
