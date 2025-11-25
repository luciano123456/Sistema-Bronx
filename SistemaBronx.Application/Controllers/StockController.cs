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

        public StockController(IStockService svc)
        {
            _svc = svc;
        }

        // =====================================================
        // INDEX
        // =====================================================
        public IActionResult Index() => View();
        public IActionResult NuevoModif() => View();


        // =====================================================
        // SALDOS (GRID PRINCIPAL)
        // =====================================================
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
            return Json(new { valor = ok });
        }

        // =====================================================
        // HISTORIAL POR ÍTEM
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> HistorialItem(string tipoItem, int? idProducto, int? idInsumo)
        {
            if (string.IsNullOrWhiteSpace(tipoItem))
                return Json(new List<VMStockViewModels.VMStockMovimientoDetalle>());

            tipoItem = tipoItem.ToUpper();

            var movimientos = await _svc.ObtenerMovimientosItem(tipoItem, idProducto, idInsumo);

            var vm = movimientos
                .OrderBy(m => m.Fecha)
                .SelectMany(m =>
                    m.StockMovimientosDetalles
                        .Where(d =>
                            d.TipoItem == tipoItem &&
                            d.IdProducto == idProducto &&
                            d.IdInsumo == idInsumo)
                        .Select(d => new VMStockViewModels.VMStockMovimientoDetalle
                        {
                            Id = d.Id,
                            TipoItem = d.TipoItem,
                            IdProducto = d.IdProducto,
                            IdInsumo = d.IdInsumo,
                            IdMovimiento = d.IdMovimiento,

                            // Cantidad firmada: + si entrada, - si salida
                            Cantidad = (m.IdTipoMovimientoNavigation?.EsEntrada ?? false)
                                ? d.Cantidad
                                : -d.Cantidad,

                            NombreItem = d.IdProductoNavigation != null
                                ? d.IdProductoNavigation.Nombre
                                : d.IdInsumoNavigation != null
                                    ? d.IdInsumoNavigation.Descripcion
                                    : string.Empty,

                            // Campos extra para el historial
                            Fecha = m.Fecha,
                            TipoMovimiento = m.IdTipoMovimientoNavigation != null
                                ? m.IdTipoMovimientoNavigation.Nombre
                                : string.Empty,
                            Comentario = m.Comentario,
                            EsEntrada = m.IdTipoMovimientoNavigation?.EsEntrada ?? false,
                            EsAnulado = m.EsAnulado
                        })
                )
                .ToList();

            return Json(vm);
        }


        // =====================================================
        // OBTENER UN MOVIMIENTO
        // =====================================================
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

                Detalles = mov.StockMovimientosDetalles.Select(d => new {
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


        // =====================================================
        // REGISTRAR
        // =====================================================
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

                var detalles = model.StockMovimientosDetalles?.ToList() ?? new List<StockMovimientosDetalle>();

                bool ok = await _svc.RegistrarMovimiento(model, detalles);

                return Json(new { valor = ok });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarDetalle(int idDetalle)
        {
            var ok = await _svc.EliminarDetalleMovimiento(idDetalle);

            if (!ok)
                return NotFound(new { ok = false, mensaje = "No se pudo eliminar el detalle (no existe o el movimiento está anulado)." });

            return Ok(new { ok = true });
        }


        // =====================================================
        // MODIFICAR
        // =====================================================
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

                var detalles = model.StockMovimientosDetalles?.ToList() ?? new List<StockMovimientosDetalle>();

                bool ok = await _svc.ModificarMovimiento(model, detalles);

                return Json(new { valor = ok });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }


        // =====================================================
        // ANULAR
        // =====================================================
        [HttpPut]
        public async Task<IActionResult> Anular(int id)
        {
            bool ok = await _svc.AnularMovimiento(id);
            return Json(new { valor = ok });
        }



        // =====================================================
        // ELIMINAR
        // =====================================================
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool ok = await _svc.EliminarMovimiento(id);
            return Json(new { valor = ok });
        }
    }
}
