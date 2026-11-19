using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using Microsoft.AspNetCore.Authorization;
using SistemaBronx.Models;
using System;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class FabricacionesController : Controller
    {
        private readonly IPedidoService _PedidosService;

        public FabricacionesController(IPedidoService PedidosService)
        {
            _PedidosService = PedidosService;
        }

        /// <summary>Misma lógica que PedidosController para calcular cantidad usada desde flags del VM.</summary>
        private static decimal ObtenerCantidadUsadaStockInsumo(VMPedidoDetalleProceso detalle)
        {
            if (detalle == null)
                return 0;

            var usaStock = detalle.UsaStock;
            var cantidadStock = detalle.CantidadStock ?? 0;

            if (!usaStock || cantidadStock <= 0)
                return 0;

            return cantidadStock;
        }

        public IActionResult Index()
        {
            return View();
        }

        // ⚠️ Nuevo: mismo endpoint "Lista" pero con parámetro (default = false)
        // Por defecto NO incluye finalizados.
        [HttpGet]
        public async Task<IActionResult> Lista(bool incluirFinalizados = false)
        {
            try
            {
                var detallesProcesos = await _PedidosService.ObtenerDetalleProcesosFiltrado(incluirFinalizados);

                var lista = detallesProcesos.Select(detalleProceso =>
                {
                    var cantUsada = detalleProceso.CantidadUsadaStock ?? 0;
                    return new VMPedidoDetalleProceso
                    {
                        Id = detalleProceso.Id,
                        IdProducto = detalleProceso.IdProducto,
                        IdInsumo = detalleProceso.IdInsumo,
                        Cantidad = detalleProceso.Cantidad,
                        Producto = detalleProceso.IdProductoNavigation.Nombre,
                        Insumo = detalleProceso.IdInsumoNavigation != null ? detalleProceso.IdInsumoNavigation.Descripcion : "",
                        IdColor = detalleProceso.IdColor,
                        IdPedido = detalleProceso.IdPedido,
                        Color = detalleProceso.IdColorNavigation != null ? detalleProceso.IdColorNavigation.Nombre : "",
                        Comentarios = detalleProceso.Comentarios,
                        Descripcion = detalleProceso.Descripcion,
                        Especificacion = detalleProceso.Especificacion,
                        IdEstado = detalleProceso.IdEstado,
                        Estado = detalleProceso.IdEstadoNavigation != null ? detalleProceso.IdEstadoNavigation.Nombre : "",
                        IdProveedor = detalleProceso.IdProveedor,
                        Proveedor = detalleProceso.IdProveedorNavigation != null ? detalleProceso.IdProveedorNavigation.Nombre : "",
                        Categoria = detalleProceso.IdInsumoNavigation?.IdCategoriaNavigation != null ? detalleProceso.IdInsumoNavigation.IdCategoriaNavigation.Nombre : "",
                        IdDetalle = detalleProceso.IdDetalle,
                        FechaActualizacion = detalleProceso.FechaActualizacion,
                        Cliente = detalleProceso.IdPedidoNavigation.IdClienteNavigation != null ? detalleProceso.IdPedidoNavigation.IdClienteNavigation.Nombre : "",
                        // Round-trip para PUT Fabricaciones/ActualizarLinea (sin resincronizar movimiento de stock del pedido)
                        CantidadUsadaStock = detalleProceso.CantidadUsadaStock,
                        UsaStock = cantUsada > 0,
                        CantidadStock = cantUsada > 0 ? cantUsada : null
                    };
                }).ToList();

                return Ok(lista);
            }
            catch
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista de pedidos");
            }
        }

        /// <summary>
        /// Actualización desde la grilla Fabricaciones (estado, color, comentarios, etc.).
        /// No ejecuta resincronización del movimiento de stock del pedido — evita fallos de validación de depósito al editar solo fabricación.
        /// </summary>
        [HttpPut]
        public async Task<IActionResult> ActualizarLinea([FromBody] VMPedidoDetalleProceso model)
        {
            try
            {
                if (model == null || model.Id <= 0)
                    return BadRequest(new { valor = false, msg = "No se recibieron datos del detalle." });

                var cantidadUsadaDesdeFlags = ObtenerCantidadUsadaStockInsumo(model);
                var cantidadUsadaStock = cantidadUsadaDesdeFlags;
                if (cantidadUsadaStock <= 0 && model.CantidadUsadaStock.HasValue && model.CantidadUsadaStock.Value > 0)
                    cantidadUsadaStock = model.CantidadUsadaStock.Value;

                var pedidoDetalleProceso = new PedidosDetalleProceso
                {
                    Id = model.Id,
                    Cantidad = model.Cantidad,
                    Comentarios = model.Comentarios,
                    Descripcion = model.Descripcion,
                    Especificacion = model.Especificacion,
                    IdColor = model.IdColor,
                    FechaActualizacion = DateTime.Now,
                    IdEstado = model.IdEstado,
                    CantidadUsadaStock = cantidadUsadaStock
                };

                var resultado = await _PedidosService.ActualizarDetalleProceso(pedidoDetalleProceso, resincronizarStockPedido: false);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al actualizar el detalle del pedido." });

                return Ok(new { valor = true, msg = "Detalle actualizado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al actualizar el detalle del pedido: " + ex.Message });
            }
        }
    }
}
