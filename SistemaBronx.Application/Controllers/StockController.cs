using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        public IActionResult Index()
        {
            return View();
        }

        // =====================================================
        // LISTA MOVIMIENTOS
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var lista = await _svc.ObtenerMovimientos();

            var plano = lista.Select(m => new
            {
                m.Id,
                Fecha = m.Fecha.ToString("yyyy-MM-dd HH:mm"),
                TipoMovimiento = m.IdTipoMovimientoNavigation?.Nombre,
                m.Comentario,
                CantidadItems = m.StockMovimientosDetalles?.Count ?? 0,
                m.EsAnulado
            });

            return Json(plano);
        }

        // =====================================================
        // NUEVO / MODIFICAR
        // =====================================================
        [HttpGet]
        public IActionResult NuevoModif(int? id)
        {
            ViewBag.IdMovimiento = id ?? 0;
            return View();
        }

        // =====================================================
        // OBTENER MOVIMIENTO POR ID
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var mov = await _svc.ObtenerMovimiento(id);
            if (mov == null)
                return Json(null);

            return Json(new
            {
                Movimiento = mov,
                Detalles = mov.StockMovimientosDetalles?.ToList()
            });
        }

        // =====================================================
        // REGISTRAR NUEVO MOVIMIENTO
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

                var detalles = model.StockMovimientosDetalles?.ToList() ?? new List<StockMovimientosDetalle>();

              
                model.Fecha = DateTime.Now;
                model.FechaAlta = DateTime.Now;
                model.IdUsuario = usuario.Id;

                var ok = await _svc.RegistrarMovimiento(model, detalles);

                return Json(new { valor = ok });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }

        // =====================================================
        // MODIFICAR MOVIMIENTO
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

                var ok = await _svc.ModificarMovimiento(model, detalles);

                return Json(new { valor = ok });
            }
            catch (Exception ex)
            {
                return Json(new { valor = false, msg = ex.Message });
            }
        }

        // =====================================================
        // ANULAR MOVIMIENTO
        // =====================================================
        [HttpPut]
        public async Task<IActionResult> Anular(int id)
        {
            var ok = await _svc.AnularMovimiento(id);
            return Json(new { valor = ok });
        }

        // =====================================================
        // ELIMINAR MOVIMIENTO
        // =====================================================
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _svc.EliminarMovimiento(id);
            return Json(new { valor = ok });
        }

        // =====================================================
        // LISTA DE SALDOS
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> Saldos()
        {
            var saldos = await _svc.ObtenerSaldos();

            var plano = saldos.Select(s => new
            {
                s.Id,
                s.TipoItem,
                s.IdProducto,
                Producto = s.IdProductoNavigation?.Nombre,
                s.IdInsumo,
                Insumo = s.IdInsumoNavigation?.Descripcion,
                s.CantidadActual,
                Fecha = s.FechaUltMovimiento.ToString("yyyy-MM-dd HH:mm")
            });

            return Json(plano);
        }

        // =====================================================
        // OBTENER SALDO INDIVIDUAL
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> ObtenerSaldo(string tipoItem, int? idProducto, int? idInsumo)
        {
            var saldo = await _svc.ObtenerSaldoItem(tipoItem, idProducto, idInsumo);
            return Json(saldo);
        }
    }
}
