using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using System.Diagnostics;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class PedidosController : Controller
    {
        private readonly IPedidoService _PedidosService;
        private readonly IProductoService _ProductosService;

        public PedidosController(IPedidoService PedidosService, IProductoService ProductosService)
        {
            _PedidosService = PedidosService;
            _ProductosService = ProductosService;
        }

        /* ============================================================
           HELPERS PRIVADOS
        ============================================================ */

        private static decimal ObtenerCantidadUsadaStockProducto(VMPedidoDetalle detalle)
        {
            if (detalle == null)
                return 0;

            var usaStock = detalle.UsaStockProducto;
            var cantidadStock = detalle.CantidadStockProducto ?? 0;

            if (!usaStock || cantidadStock <= 0)
                return 0;

            return cantidadStock;
        }

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

        private static decimal ObtenerCantidadUsadaStockProductoEntity(PedidosDetalle detalle)
        {
            if (detalle == null)
                return 0;

            return detalle.CantidadUsadaStock ?? 0;
        }

        private static decimal ObtenerCantidadUsadaStockInsumoEntity(PedidosDetalleProceso detalle)
        {
            if (detalle == null)
                return 0;

            return detalle.CantidadUsadaStock ?? 0;
        }

        private static List<PedidosDetalle> MapearDetallesProductoDesdeVm(VMPedido model)
        {
            var pedidoDetalle = new List<PedidosDetalle>();

            if (model?.PedidosDetalles != null && model.PedidosDetalles.Any())
            {
                pedidoDetalle = model.PedidosDetalles.Select(detalle => new PedidosDetalle
                {
                    Id = detalle.Id,
                    IdPedido = detalle.IdPedido,
                    Cantidad = detalle.Cantidad,
                    CostoUnitario = detalle.CostoUnitario ?? 0,
                    PrecioVenta = detalle.PrecioVenta ?? 0,
                    PorcIva = detalle.PorcIva ?? 0,
                    IdCategoria = detalle.IdCategoria,
                    IdColor = detalle.IdColor,
                    IdProducto = detalle.IdProducto,
                    PorcGanancia = detalle.PorcGanancia ?? 0,
                    Producto = !string.IsNullOrWhiteSpace(detalle.Producto)
    ? detalle.Producto
    : (detalle.IdProductoNavigation != null
        ? detalle.IdProductoNavigation.Nombre
        : ""),
                    CantidadUsadaStock = ObtenerCantidadUsadaStockProductoEntity(detalle)
                }).ToList();
            }

            return pedidoDetalle;
        }

        private static List<PedidosDetalleProceso> MapearDetallesProcesoDesdeVm(VMPedido model)
        {
            var pedidoDetalleProceso = new List<PedidosDetalleProceso>();

            if (model?.PedidosDetalleProcesos != null && model.PedidosDetalleProcesos.Any())
            {
                pedidoDetalleProceso = model.PedidosDetalleProcesos.Select(detalleProceso => new PedidosDetalleProceso
                {
                    Id = detalleProceso.Id,
                    IdDetalle = detalleProceso.IdDetalle,
                    IdPedido = detalleProceso.IdPedido,
                    Cantidad = detalleProceso.Cantidad,
                    IdCategoria = detalleProceso.IdCategoria,
                    Comentarios = detalleProceso.Comentarios,
                    Descripcion = detalleProceso.Descripcion,
                    Especificacion = detalleProceso.Especificacion,
                    IdColor = detalleProceso.IdColor,
                    FechaActualizacion = DateTime.Now,
                    SubTotal = detalleProceso.SubTotal ?? 0,
                    IdEstado = detalleProceso.IdEstado,
                    IdTipo = detalleProceso.IdTipo,
                    PrecioUnitario = detalleProceso.PrecioUnitario ?? 0,
                    IdUnidadMedida = detalleProceso.IdUnidadMedida,
                    IdProveedor = detalleProceso.IdProveedor,
                    IdProducto = detalleProceso.IdProducto,
                    IdInsumo = detalleProceso.IdInsumo,
                    CantidadUsadaStock = ObtenerCantidadUsadaStockInsumoEntity(detalleProceso)
                }).ToList();
            }

            return pedidoDetalleProceso;
        }

        /* ============================================================
           INSERTAR
        ============================================================ */

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedido model)
        {
            try
            {
                var pedido = new Pedido
                {
                    Fecha = model.Fecha != DateTime.MinValue ? model.Fecha : DateTime.Now,
                    IdCliente = model.IdCliente,
                    IdFormaPago = model.IdFormaPago,
                    ImporteTotal = model.ImporteTotal ?? 0,
                    ImporteAbonado = model.ImporteAbonado ?? 0,
                    SubTotal = model.SubTotal ?? 0,
                    PorcDescuento = model.PorcDescuento ?? 0,
                    Saldo = model.Saldo ?? 0,
                    Comentarios = model.Comentarios,
                    Finalizado = model.Finalizado,
                    Facturado = model.Facturado,
                    NroFactura = model.NroFactura,
                    CostoFinanciero = model.CostoFinanciero,
                    CostoFinancieroPorc = model.CostoFinancieroPorc
                };

                var pedidoDetalle = MapearDetallesProductoDesdeVm(model);
                var pedidoDetalleProceso = MapearDetallesProcesoDesdeVm(model);

                var validacion = await _PedidosService.ValidarStockPedido(
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!validacion.ok)
                {
                    return BadRequest(new
                    {
                        valor = false,
                        stock = false,
                        errores = validacion.errores,
                        msg = "Stock insuficiente para registrar el pedido."
                    });
                }

                var resultado = await _PedidosService.Insertar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al insertar el pedido y sus detalles." });

                return Ok(new { valor = true, msg = "Pedido registrado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al insertar el pedido: " + ex.Message });
            }
        }

        /* ============================================================
           ACTUALIZAR
        ============================================================ */

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPedido model)
        {
            try
            {
                var pedido = await _PedidosService.ObtenerPedido(model.Id);
                if (pedido == null)
                    return NotFound(new { valor = false, msg = "El pedido no existe." });

                pedido.IdCliente = model.IdCliente;
                pedido.IdFormaPago = model.IdFormaPago;
                pedido.ImporteTotal = model.ImporteTotal ?? 0;
                pedido.ImporteAbonado = model.ImporteAbonado ?? 0;
                pedido.SubTotal = model.SubTotal ?? 0;
                pedido.PorcDescuento = model.PorcDescuento ?? 0;
                pedido.Saldo = model.Saldo ?? 0;
                pedido.Comentarios = model.Comentarios;
                pedido.Finalizado = model.Finalizado ?? 0;
                pedido.Facturado = model.Facturado ?? 0;
                pedido.NroFactura = model.NroFactura;
                pedido.CostoFinanciero = model.CostoFinanciero;
                pedido.CostoFinancieroPorc = model.CostoFinancieroPorc;

                var pedidoDetalle = MapearDetallesProductoDesdeVm(model);
                var pedidoDetalleProceso = MapearDetallesProcesoDesdeVm(model);

                var validacion = await _PedidosService.ValidarStockPedido(
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!validacion.ok)
                {
                    return BadRequest(new
                    {
                        valor = false,
                        stock = false,
                        errores = validacion.errores,
                        msg = "Stock insuficiente para actualizar el pedido."
                    });
                }

                var resultado = await _PedidosService.Actualizar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al actualizar el pedido y sus detalles." });

                return Ok(new { valor = true, msg = "Pedido actualizado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al actualizar el pedido: " + ex.Message });
            }
        }

        /* ============================================================
           ACTUALIZAR DETALLE PROCESO
        ============================================================ */

        [HttpPut]
        public async Task<IActionResult> ActualizarDetalleProceso([FromBody] VMPedidoDetalleProceso model)
        {
            try
            {
                if (model == null)
                    return BadRequest(new { valor = false, msg = "No se recibieron datos del detalle." });

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
                    CantidadUsadaStock = ObtenerCantidadUsadaStockInsumo(model)
                };

                var resultado = await _PedidosService.ActualizarDetalleProceso(pedidoDetalleProceso);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al actualizar el detalle del pedido." });

                return Ok(new { valor = true, msg = "Detalle actualizado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al actualizar el detalle del pedido: " + ex.Message });
            }
        }

        /* ============================================================
           VALIDAR STOCK
        ============================================================ */

        [HttpPost]
        public async Task<IActionResult> ValidarStock([FromBody] VMPedido model)
        {
            try
            {
                var pedidoDetalle = MapearDetallesProductoDesdeVm(model);
                var pedidoDetalleProceso = MapearDetallesProcesoDesdeVm(model);

                var validacion = await _PedidosService.ValidarStockPedido(
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                return Ok(new
                {
                    ok = validacion.ok,
                    errores = validacion.errores
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    errores = new List<string> { "Error al validar stock: " + ex.Message }
                });
            }
        }

        /* ============================================================
           DISPONIBILIDAD STOCK
        ============================================================ */

        [HttpGet]
        public async Task<IActionResult> DisponibilidadStock(string tipoItem, int? idProducto, int? idInsumo, decimal cantidad, int? idColor = null)
        {
            try
            {
                var resp = await _PedidosService.ObtenerDisponibilidadStock(tipoItem, idProducto, idInsumo, cantidad, idColor);

                return Ok(new
                {
                    ok = resp.ok,
                    disponible = resp.disponible,
                    faltante = resp.faltante,
                    nombre = resp.nombre
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    ok = false,
                    disponible = 0,
                    faltante = cantidad,
                    nombre = "",
                    msg = ex.Message
                });
            }
        }

        /* ============================================================
           LISTA
        ============================================================ */

        [HttpGet]
        public async Task<IActionResult> Lista(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
        {
            try
            {
                var pedidos = await _PedidosService.ObtenerPedidos(FechaDesde, FechaHasta, IdCliente, Estado, Finalizado);

                var lista = pedidos.Select(c => new VMPedido
                {
                    Id = c.Id,
                    Fecha = c.Fecha,
                    Finalizado = c.Finalizado,
                    Facturado = c.Facturado,
                    NroFactura = c.NroFactura,
                    SubTotal = c.SubTotal,
                    FormaPago = c.IdFormaPagoNavigation?.Nombre ?? "",
                    Saldo = c.Saldo,
                    IdCliente = c.IdCliente,
                    IdFormaPago = c.IdFormaPago,
                    Cliente = c.IdClienteNavigation?.Nombre ?? "",
                    Telefono = c.IdClienteNavigation?.Telefono ?? "",
                    PorcDescuento = c.PorcDescuento,
                    ImporteAbonado = c.ImporteAbonado,
                    ImporteTotal = c.ImporteTotal,
                    Comentarios = c.Comentarios,
                    CostoFinanciero = c.CostoFinanciero,
                    CostoFinancieroPorc = c.CostoFinancieroPorc,
                    Estado =
                        c.PedidosDetalleProcesos.Any() &&
                        c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "FINALIZADO") &&
                        (c.Saldo ?? 0) == 0
                            ? "FINALIZADO"
                            : c.PedidosDetalleProcesos.Any() &&
                              c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "ENTREGADO")
                                ? "ENTREGADO"
                                : c.PedidosDetalleProcesos.Any() &&
                                  c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "ENTREGAR")
                                    ? "ENTREGAR"
                                    : "EN PROCESO"
                }).ToList();

                return Ok(lista);
            }
            catch
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista de pedidos");
            }
        }

        /* ============================================================
           OBTENER DATOS PEDIDO
        ============================================================ */

        [HttpGet]
        public async Task<IActionResult> ObtenerDatosPedido(int idPedido)
        {
            try
            {
                if (idPedido <= 0)
                    return Ok(new { });

                var pedido = await _PedidosService.ObtenerPedido(idPedido);

                if (pedido == null)
                    return NotFound(new { valor = false, msg = "No se encontró el pedido." });

                /* ============================================================
                   PEDIDO
                ============================================================ */
                var pedidoJSON = new VMPedido
                {
                    Id = pedido.Id,
                    Fecha = pedido.Fecha,
                    Finalizado = pedido.Finalizado,
                    Facturado = pedido.Facturado,
                    NroFactura = pedido.NroFactura,
                    SubTotal = pedido.SubTotal,
                    FormaPago = pedido.IdFormaPagoNavigation?.Nombre ?? "",
                    Saldo = pedido.Saldo,
                    IdCliente = pedido.IdCliente,
                    IdFormaPago = pedido.IdFormaPago,
                    Cliente = pedido.IdClienteNavigation?.Nombre ?? "",
                    Telefono = pedido.IdClienteNavigation?.Telefono ?? "",
                    PorcDescuento = pedido.PorcDescuento,
                    ImporteAbonado = pedido.ImporteAbonado,
                    ImporteTotal = pedido.ImporteTotal,
                    Comentarios = pedido.Comentarios,
                    CostoFinanciero = pedido.CostoFinanciero,
                    CostoFinancieroPorc = pedido.CostoFinancieroPorc,
                    Estado = "Pendiente"
                };

                /* ============================================================
                   DETALLE PRODUCTOS
                ============================================================ */
                List<VMPedidoDetalle> pedidoDetalle = new();

                if (pedido.PedidosDetalles != null && pedido.PedidosDetalles.Any())
                {
                    pedidoDetalle = pedido.PedidosDetalles.Select(detalle =>
                    {
                        var cantidadUsadaStock = detalle.CantidadUsadaStock ?? 0;
                        var stockProducto = detalle.StockDisponibleDeposito;

                        return new VMPedidoDetalle
                        {
                            Id = detalle.Id,
                            IdPedido = detalle.IdPedido,
                            IdProducto = detalle.IdProducto,
                            Cantidad = detalle.Cantidad,
                            CostoUnitario = detalle.CostoUnitario,
                            PrecioVenta = detalle.PrecioVenta,
                            PrecioVentaUnitario = (detalle.Cantidad ?? 0) != 0
                                ? ((detalle.PrecioVenta ?? 0) / (detalle.Cantidad ?? 1))
                                : 0,
                            PorcIva = detalle.PorcIva,
                            IdCategoria = detalle.IdCategoria,
                            IdColor = detalle.IdColor,
                            PorcGanancia = detalle.PorcGanancia,
                            Color = detalle.IdColorNavigation?.Nombre ?? "",
                            Nombre = !string.IsNullOrWhiteSpace(detalle.Producto)
                                ? detalle.Producto
                                : (detalle.IdProductoNavigation?.Nombre ?? ""),
                            Producto = !string.IsNullOrWhiteSpace(detalle.Producto)
                                ? detalle.Producto
                                : (detalle.IdProductoNavigation?.Nombre ?? ""),
                            Categoria = detalle.IdCategoriaNavigation?.Nombre ?? "",
                            IVA = (detalle.PrecioVenta ?? 0) * ((detalle.PorcIva ?? 0) / 100m),
                            Ganancia = (detalle.CostoUnitario ?? 0) * ((detalle.PorcGanancia ?? 0) / 100m),

                            // 🔥 EXACTO PARA TU JS
                            UsaStockProducto = cantidadUsadaStock > 0,
                            CantidadStockProducto = cantidadUsadaStock,
                            Stock = stockProducto
                        };
                    }).ToList();
                }

                /* ============================================================
                   DETALLE PROCESOS (INSUMOS)
                ============================================================ */
                List<VMPedidoDetalleProceso> pedidoDetalleProceso = new();

                if (pedido.PedidosDetalleProcesos != null && pedido.PedidosDetalleProcesos.Any())
                {
                    var cantidadProductoPorDetalle = (pedido.PedidosDetalles ?? Enumerable.Empty<PedidosDetalle>())
                        .Where(d => d.Id > 0)
                        .ToDictionary(d => d.Id, d => (decimal)Math.Max(1m, d.Cantidad ?? 1m));

                    pedidoDetalleProceso = pedido.PedidosDetalleProcesos.Select(detalleProceso =>
                    {
                        var cantidadUsadaStock = detalleProceso.CantidadUsadaStock ?? 0;
                        var stockInsumo = detalleProceso.StockDisponibleDeposito;
                        var cantLinea = detalleProceso.Cantidad ?? 0m;
                        decimal qProd = 1m;
                        if (detalleProceso.IdDetalle.HasValue &&
                            cantidadProductoPorDetalle.TryGetValue(detalleProceso.IdDetalle.Value, out var qDet))
                        {
                            qProd = qDet;
                        }

                        var cantidadInicial = qProd > 0 ? cantLinea / qProd : cantLinea;

                        return new VMPedidoDetalleProceso
                        {
                            Id = detalleProceso.Id,
                            IdPedido = detalleProceso.IdPedido,
                            IdDetalle = detalleProceso.IdDetalle,
                            IdProducto = detalleProceso.IdProducto,
                            IdInsumo = detalleProceso.IdInsumo,
                            Cantidad = detalleProceso.Cantidad,
                            CantidadInicial = cantidadInicial,
                            IdCategoria = detalleProceso.IdCategoria,
                            Comentarios = detalleProceso.Comentarios,
                            Descripcion = detalleProceso.Descripcion,
                            Especificacion = detalleProceso.Especificacion,
                            IdColor = detalleProceso.IdColor,
                            FechaActualizacion = detalleProceso.FechaActualizacion,
                            SubTotal = detalleProceso.SubTotal,
                            IdEstado = detalleProceso.IdEstado,
                            IdTipo = detalleProceso.IdTipo,
                            PrecioUnitario = detalleProceso.PrecioUnitario,
                            IdUnidadMedida = detalleProceso.IdUnidadMedida,
                            IdProveedor = detalleProceso.IdProveedor,
                            Color = detalleProceso.IdColorNavigation?.Nombre,
                            Estado = detalleProceso.IdEstadoNavigation?.Nombre,
                            Insumo = detalleProceso.IdInsumoNavigation?.Descripcion,
                            Nombre = detalleProceso.IdInsumoNavigation?.Descripcion,
                            Producto = detalleProceso.IdProductoNavigation?.Nombre,
                            Categoria = detalleProceso.IdCategoriaNavigation?.Nombre ?? "",
                            Tipo = detalleProceso.IdTipoNavigation?.Nombre,
                            Proveedor = detalleProceso.IdProveedorNavigation?.Nombre ?? "",

                            // 🔥 EXACTO PARA TU JS
                            UsaStock = cantidadUsadaStock > 0,
                            CantidadStock = cantidadUsadaStock,
                            Stock = stockInsumo,
                            StockDisponible = stockInsumo
                        };
                    }).ToList();
                }

                /* ============================================================
                   RESULT FINAL
                ============================================================ */
                var result = new Dictionary<string, object>
        {
            { "pedido", pedidoJSON },
            { "PedidoDetalle", pedidoDetalle },
            { "PedidoDetalleProceso", pedidoDetalleProceso }
        };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    valor = false,
                    msg = "Error al obtener los datos del pedido: " + ex.Message
                });
            }
        }

        /* ============================================================
           ELIMINAR INSUMO
        ============================================================ */

        [HttpDelete]
        public async Task<IActionResult> EliminarInsumo(int idPedido, int idInsumo)
        {
            try
            {
                var resultado = await _PedidosService.EliminarInsumo(idPedido, idInsumo);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "No se pudo eliminar el insumo del pedido." });

                return Ok(new { valor = true, msg = "Insumo eliminado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al eliminar el insumo: " + ex.Message });
            }
        }

        /* ============================================================
           ELIMINAR PRODUCTO
        ============================================================ */

        [HttpDelete]
        public async Task<IActionResult> EliminarProducto(int idPedido, int idProducto)
        {
            try
            {
                var resultado = await _PedidosService.EliminarProducto(idPedido, idProducto);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "No se pudo eliminar el producto del pedido." });

                return Ok(new { valor = true, msg = "Producto eliminado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al eliminar el producto: " + ex.Message });
            }
        }

        /* ============================================================
           ELIMINAR PEDIDO
        ============================================================ */

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            try
            {
                var resultado = await _PedidosService.EliminarPedido(id);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "No se pudo eliminar el pedido." });

                return Ok(new { valor = true, msg = "Pedido eliminado correctamente." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al eliminar el pedido: " + ex.Message });
            }
        }

        /* ============================================================
           VISTAS
        ============================================================ */

        public IActionResult Index()
        {
            return View();
        }

        public async Task<IActionResult> NuevoModif(int? id)
        {
            if (id.HasValue)
                ViewBag.Data = id;
            else
                ViewBag.Error = "No se encontró el pedido.";

            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}