using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class StockController : Controller
    {
        private readonly IStockService _svc;
        private readonly IProductoService _svcProductos;

        public StockController(IStockService svc, IProductoService svcProductos)
        {
            _svc = svc;
            _svcProductos = svcProductos;
        }

        public IActionResult Index() => View();
        public IActionResult NuevoModif() => View();

        /* =====================================================
           SALDOS
        ===================================================== */
        [HttpGet]
        public async Task<IActionResult> Saldos()
        {
            var saldos = await _svc.ObtenerSaldos();

            var plano = saldos.Select(s => new
            {
                s.TipoItem,
                s.IdProducto,
                Producto = s.IdProductoNavigation?.Nombre,
                s.IdInsumo,
                Insumo = s.IdInsumoNavigation?.Descripcion,
                s.CantidadActual,
                Fecha = s.FechaUltMovimiento.ToString("dd-MM-yyyy HH:mm")
            });

            return Json(plano);
        }

        [HttpPut]
        public async Task<IActionResult> Restaurar(int id)
        {
            var ok = await _svc.RestaurarMovimiento(id);
            return Json(new
            {
                valor = ok,
                msg = ok ? null : "No se pudo restaurar."
            });
        }

        /* =====================================================
           HISTORIAL POR ITEM
        ===================================================== */
        [HttpGet]
        public async Task<IActionResult> HistorialItem(string tipoItem, int? idProducto, int? idInsumo)
        {
            if (string.IsNullOrWhiteSpace(tipoItem))
                return Json(new List<VMStockViewModels.VMStockMovimientoDetalle>());

            var movimientos = await _svc.ObtenerMovimientosItem(tipoItem.ToUpper(), idProducto, idInsumo);

            var vm = movimientos.OrderBy(m => m.Fecha)
                .SelectMany(m =>
                    m.StockMovimientosDetalles
                        .Where(d => d.TipoItem == tipoItem.ToUpper() &&
                                    d.IdProducto == idProducto &&
                                    d.IdInsumo == idInsumo)
                        .Select(d => new VMStockViewModels.VMStockMovimientoDetalle
                        {
                            Id = d.Id,
                            TipoItem = d.TipoItem,
                            IdProducto = d.IdProducto,
                            IdInsumo = d.IdInsumo,
                            IdMovimiento = d.IdMovimiento,
                            Cantidad = (m.IdTipoMovimientoNavigation?.EsEntrada ?? false) ? d.Cantidad : -d.Cantidad,
                            NombreItem = d.IdProductoNavigation != null
                                ? d.IdProductoNavigation.Nombre
                                : d.IdInsumoNavigation?.Descripcion,
                            Fecha = m.Fecha,
                            TipoMovimiento = m.IdTipoMovimientoNavigation?.Nombre ?? "",
                            Comentario = m.Comentario,
                            EsEntrada = m.IdTipoMovimientoNavigation?.EsEntrada ?? false,
                            EsAnulado = m.EsAnulado
                        })
                ).ToList();

            return Json(vm);
        }

        /* =====================================================
           OBTENER UN MOVIMIENTO
        ===================================================== */
        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var mov = await _svc.ObtenerMovimiento(id);
            if (mov == null) return Json(null);

            var dto = new
            {
                mov.Id,
                mov.IdTipoMovimiento,
                TipoMovimientoNombre = mov.IdTipoMovimientoNavigation?.Nombre,
                mov.Comentario,
                mov.Fecha,
                mov.EsAnulado,
                Detalles = mov.StockMovimientosDetalles.Select(d => new
                {
                    d.Id,
                    d.IdMovimiento,
                    d.TipoItem,
                    d.IdProducto,
                    d.IdInsumo,
                    Cantidad = d.Cantidad,
                    CostoUnitario = d.CostoUnitario,
                    NombreItem = d.IdProductoNavigation != null
                        ? d.IdProductoNavigation.Nombre
                        : d.IdInsumoNavigation?.Descripcion
                })
            };

            return Json(dto);
        }

        /* =====================================================
           REGISTRAR
        ===================================================== */
        [HttpPost]
        public async Task<IActionResult> Registrar([FromBody] StockMovimiento model)
        {
            try
            {
                if (model == null)
                    return Json(new { valor = false, msg = "Modelo vacío" });

                var usuario = await SessionHelper.GetUsuarioSesion(HttpContext);
                if (usuario == null)
                    return Json(new { valor = false, msg = "Sesión expirada" });

                model.IdUsuario = usuario.Id;
                model.Fecha = DateTime.Now;
                model.FechaAlta = DateTime.Now;

                var detalles = model.StockMovimientosDetalles?.ToList() ?? new();

                var ok = await _svc.RegistrarMovimiento(model, detalles);

                return Json(new { valor = ok, msg = ok ? null : "No se pudo registrar el movimiento." });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }

        /* =====================================================
           ELIMINAR DETALLE
        ===================================================== */
        [HttpDelete]
        public async Task<IActionResult> EliminarDetalle(int idDetalle)
        {
            var ok = await _svc.EliminarDetalleMovimiento(idDetalle);

            return !ok
                ? NotFound(new { ok = false, mensaje = "No se pudo eliminar el detalle." })
                : Ok(new { ok = true });
        }

        /* =====================================================
           MODIFICAR
        ===================================================== */
        [HttpPut]
        public async Task<IActionResult> Modificar([FromBody] StockMovimiento model)
        {
            try
            {
                if (model == null)
                    return Json(new { valor = false, msg = "Modelo vacío" });

                var usuario = await SessionHelper.GetUsuarioSesion(HttpContext);
                if (usuario == null)
                    return Json(new { valor = false, msg = "Sesión expirada" });

                model.IdUsuario = usuario.Id;

                var detalles = model.StockMovimientosDetalles?.ToList() ?? new();

                var ok = await _svc.ModificarMovimiento(model, detalles);

                return Json(new { valor = ok, msg = ok ? null : "No se pudo modificar el movimiento." });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }

        /* =====================================================
           ANULAR
        ===================================================== */
        [HttpPut]
        public async Task<IActionResult> Anular(int id)
        {
            var ok = await _svc.AnularMovimiento(id);
            return Json(new { valor = ok });
        }

        /* =====================================================
           ELIMINAR
        ===================================================== */
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _svc.EliminarMovimiento(id);
            return Json(new { valor = ok });
        }

        /* =====================================================
           DETALLES DISPONIBLES (para pedidos)
        ===================================================== */
        [HttpGet("disponibles")]
        public async Task<IActionResult> GetDetallesDisponibles(string tipoItem, int? idProducto, int? idInsumo)
        {
            var detalles = await _svc.ObtenerDetallesDisponibles(tipoItem, idProducto, idInsumo);
            var result = new List<object>();

            foreach (var d in detalles)
            {
                var consumido = await _svc.ObtenerCantidadConsumida(d.Id);

                result.Add(new
                {
                    d.Id,
                    d.IdMovimiento,
                    d.Cantidad,
                    Disponible = d.Cantidad - consumido,
                    d.CostoUnitario,
                    Fecha = d.IdMovimientoNavigation?.Fecha
                });
            }

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerStockProducto(int idProducto)
        {
            if (idProducto <= 0)
                return BadRequest("IdProducto inválido.");

            // Buscamos detalles de movimientos donde TipoItem = P y coincida IdProducto
            var detalles = await _svc.ObtenerDetallesDisponibles("P", idProducto, null);

            var result = new List<object>();

            foreach (var d in detalles)
            {
                var consumido = await _svc.ObtenerCantidadConsumida(d.Id);

                result.Add(new
                {
                    d.Id,
                    d.IdMovimiento,
                    d.Cantidad,
                    Consumido = consumido,
                    Disponible = d.Cantidad - consumido,
                    d.CostoUnitario,
                    Fecha = d.IdMovimientoNavigation?.Fecha
                });
            }

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerStockInsumo(int idInsumo)
        {
            if (idInsumo <= 0)
                return BadRequest("IdInsumo inválido.");

            var detalles = await _svc.ObtenerDetallesDisponibles("I", null, idInsumo);

            var result = new List<object>();

            foreach (var d in detalles)
            {
                var consumido = await _svc.ObtenerCantidadConsumida(d.Id);

                result.Add(new
                {
                    d.Id,
                    d.IdMovimiento,
                    d.Cantidad,
                    Consumido = consumido,
                    Disponible = d.Cantidad - consumido,
                    d.CostoUnitario,
                    Fecha = d.IdMovimientoNavigation?.Fecha
                });
            }

            return Ok(result);
        }

        // =====================================================
        // STOCK INSUMOS DE UN PRODUCTO (para pedidos)
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> ObtenerStockInsumosDelProducto(int idProducto)
        {
            if (idProducto <= 0)
                return BadRequest("IdProducto inválido.");

            // 1) Traemos la composición del producto (tus insumos reales)
            var insumos = await _svcProductos.ObtenerInsumos(idProducto);
            if (insumos == null)
                return Ok(new List<object>());

            var result = new List<object>();

            foreach (var ins in insumos)
            {
                // 2) Traemos el stock del insumo
                var detallesStock = await _svc.ObtenerDetallesDisponibles("I", null, ins.IdInsumo);

                decimal totalDisponible = 0m;
                var detallesFmt = new List<object>();

                foreach (var det in detallesStock)
                {
                    var consumido = await _svc.ObtenerCantidadConsumida(det.Id);
                    var disponible = det.Cantidad - consumido;

                    totalDisponible += disponible;

                    detallesFmt.Add(new
                    {
                        det.Id,
                        det.IdMovimiento,
                        det.Cantidad,
                        Consumido = consumido,
                        Disponible = disponible,
                        det.CostoUnitario,
                        Fecha = det.IdMovimientoNavigation?.Fecha
                    });
                }

                // 3) Sino existe nombre del insumo, lo construimos
                var nombreInsumo = ins.IdInsumoNavigation != null
                    ? ins.IdInsumoNavigation.Descripcion
                    : "";

                // 4) Cada insumo del producto con su stock disponible
                result.Add(new
                {
                    IdInsumo = ins.IdInsumo,
                    Insumo = nombreInsumo,
                    CantidadNecesaria = ins.Cantidad,
                    StockTotalDisponible = totalDisponible,
                    Detalles = detallesFmt
                });
            }

            return Ok(result);
        }




    }
}
