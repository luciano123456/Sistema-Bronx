using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;
using System.Text.Json.Serialization;
using System.Text.Json;

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
           INSERTAR
        ============================================================ */
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedido model)
        {
            try
            {
                var pedido = new Pedido
                {
                    Fecha = DateTime.Now,
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

                var pedidoDetalle = model.PedidosDetalles?
                    .Select(detalle => new PedidosDetalle
                    {
                        Id = detalle.Id,
                        Cantidad = detalle.Cantidad,
                        CostoUnitario = detalle.CostoUnitario ?? 0,
                        PrecioVenta = detalle.PrecioVenta ?? 0,
                        PorcIva = detalle.PorcIva ?? 0,
                        IdCategoria = detalle.IdCategoria,
                        IdColor = detalle.IdColor,
                        IdProducto = detalle.IdProducto,
                        PorcGanancia = detalle.PorcGanancia ?? 0,
                        Producto = detalle.Producto,
                        CantidadUsadaStock = detalle.CantidadUsadaStock ?? 0
                    }).ToList() ?? new();

                var pedidoDetalleProceso = model.PedidosDetalleProcesos?
                    .Select(p => new PedidosDetalleProceso
                    {
                        Id = p.Id,
                        IdDetalle = p.IdDetalle,
                        Cantidad = p.Cantidad,
                        IdCategoria = p.IdCategoria,
                        Comentarios = p.Comentarios,
                        Descripcion = p.Descripcion,
                        Especificacion = p.Especificacion,
                        IdColor = p.IdColor,
                        FechaActualizacion = DateTime.Now,
                        SubTotal = p.SubTotal ?? 0,
                        IdEstado = p.IdEstado,
                        IdTipo = p.IdTipo,
                        PrecioUnitario = p.PrecioUnitario ?? 0,
                        IdUnidadMedida = p.IdUnidadMedida,
                        IdProveedor = p.IdProveedor,
                        IdProducto = p.IdProducto,
                        IdInsumo = p.IdInsumo,
                        CantidadUsadaStock = p.CantidadUsadaStock ?? 0
                    }).ToList() ?? new();

                var ok = await _PedidosService.Insertar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                return !ok
                    ? BadRequest("Error al insertar el pedido.")
                    : Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al insertar el pedido: " + ex.Message);
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
                    return NotFound("El pedido no existe.");

                pedido.IdCliente = model.IdCliente;
                pedido.IdFormaPago = model.IdFormaPago;
                pedido.ImporteTotal = model.ImporteTotal ?? 0;
                pedido.ImporteAbonado = model.ImporteAbonado ?? 0;
                pedido.SubTotal = model.SubTotal ?? 0;
                pedido.PorcDescuento = model.PorcDescuento ?? 0;
                pedido.Saldo = model.Saldo ?? 0;
                pedido.Comentarios = model.Comentarios;
                pedido.Finalizado = (int)model.Finalizado;
                pedido.Facturado = (int)model.Facturado;
                pedido.NroFactura = model.NroFactura;
                pedido.CostoFinanciero = model.CostoFinanciero;
                pedido.CostoFinancieroPorc = model.CostoFinancieroPorc;

                var pedidoDetalle = model.PedidosDetalles?
                    .Select(detalle => new PedidosDetalle
                    {
                        Id = detalle.Id,
                        Cantidad = detalle.Cantidad,
                        CostoUnitario = detalle.CostoUnitario ?? 0,
                        PrecioVenta = detalle.PrecioVenta ?? 0,
                        PorcIva = detalle.PorcIva ?? 0,
                        IdCategoria = detalle.IdCategoria,
                        IdColor = detalle.IdColor,
                        IdProducto = detalle.IdProducto,
                        PorcGanancia = detalle.PorcGanancia ?? 0,
                        Producto = detalle.Producto,
                        CantidadUsadaStock = detalle.CantidadUsadaStock ?? 0
                    }).ToList() ?? new();

                var pedidoDetalleProceso = model.PedidosDetalleProcesos?
                    .Select(p => new PedidosDetalleProceso
                    {
                        Id = p.Id,
                        IdDetalle = p.IdDetalle,
                        Cantidad = p.Cantidad,
                        IdCategoria = p.IdCategoria,
                        Comentarios = p.Comentarios,
                        Descripcion = p.Descripcion,
                        Especificacion = p.Especificacion,
                        IdColor = p.IdColor,
                        FechaActualizacion = DateTime.Now,
                        SubTotal = p.SubTotal ?? 0,
                        IdEstado = p.IdEstado,
                        IdTipo = p.IdTipo,
                        PrecioUnitario = p.PrecioUnitario ?? 0,
                        IdUnidadMedida = p.IdUnidadMedida,
                        IdProveedor = p.IdProveedor,
                        IdProducto = p.IdProducto,
                        IdInsumo = p.IdInsumo,
                        CantidadUsadaStock = p.CantidadUsadaStock ?? 0
                    }).ToList() ?? new();

                var ok = await _PedidosService.Actualizar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                return !ok
                    ? BadRequest("Error al actualizar el pedido.")
                    : Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al actualizar el pedido: " + ex.Message);
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
                var det = new PedidosDetalleProceso
                {
                    Id = model.Id,
                    Cantidad = model.Cantidad,
                    Comentarios = model.Comentarios,
                    Descripcion = model.Descripcion,
                    Especificacion = model.Especificacion,
                    IdColor = model.IdColor,
                    FechaActualizacion = DateTime.Now,
                    IdEstado = model.IdEstado
                };

                var ok = await _PedidosService.ActualizarDetalleProceso(det);

                return !ok
                    ? BadRequest("Error al actualizar el detalle.")
                    : Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al actualizar el proceso: " + ex.Message);
            }
        }

        /* ============================================================
           LISTAR
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
                    SubTotal = c.SubTotal,
                    FormaPago = c.IdFormaPagoNavigation?.Nombre ?? "",
                    Saldo = c.Saldo,
                    Cliente = c.IdClienteNavigation?.Nombre ?? "",
                    PorcDescuento = c.PorcDescuento,
                    ImporteAbonado = c.ImporteAbonado,
                    ImporteTotal = c.ImporteTotal,
                    Comentarios = c.Comentarios,
                    CostoFinanciero = c.CostoFinanciero,
                    CostoFinancieroPorc = c.CostoFinancieroPorc,
                    Estado =
                        c.PedidosDetalleProcesos.Any() &&
                        c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.ToUpper() ?? "") == "FINALIZADO") &&
                        (c.Saldo ?? 0) == 0
                            ? "FINALIZADO"
                        : c.PedidosDetalleProcesos.Any() &&
                          c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.ToUpper() ?? "") == "ENTREGADO")
                            ? "ENTREGADO"
                        : c.PedidosDetalleProcesos.Any() &&
                          c.PedidosDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.ToUpper() ?? "") == "ENTREGAR")
                            ? "ENTREGAR"
                        : "EN PROCESO"
                }).ToList();

                return Ok(lista);
            }
            catch
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista.");
            }
        }

        /* ============================================================
           OBTENER DATOS PEDIDO
        ============================================================ */
        [HttpGet]
        public async Task<IActionResult> ObtenerDatosPedido(int idPedido)
        {
            if (idPedido <= 0)
                return Ok(new { });

            var pedido = await _PedidosService.ObtenerPedido(idPedido);

            var result = new Dictionary<string, object>();

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

            // detalle productos
            var pedidoDetalle = pedido.PedidosDetalles?
                .Select(detalle => new VMPedidoDetalle
                {
                    Cantidad = detalle.Cantidad,
                    CostoUnitario = detalle.CostoUnitario,
                    PrecioVenta = detalle.PrecioVenta,
                    PrecioVentaUnitario = detalle.Cantidad != 0 ? detalle.PrecioVenta / detalle.Cantidad : 0,
                    PorcIva = detalle.PorcIva,
                    IdCategoria = detalle.IdCategoria,
                    IdColor = detalle.IdColor,
                    IdProducto = detalle.IdProducto,
                    PorcGanancia = detalle.PorcGanancia,
                    IdPedido = detalle.IdPedido,
                    Id = detalle.Id,
                    Color = detalle.IdColorNavigation?.Nombre ?? "",
                    Nombre = !string.IsNullOrWhiteSpace(detalle.Producto) ? detalle.Producto : detalle.IdProductoNavigation?.Nombre,
                    Categoria = detalle.IdCategoriaNavigation?.Nombre ?? "",
                    IVA = (decimal)detalle.PrecioVenta * ((decimal)detalle.PorcIva / 100m),
                    Ganancia = (decimal)detalle.CostoUnitario * ((decimal)detalle.PorcGanancia / 100m),
                    CantidadUsadaStock = detalle.CantidadUsadaStock ?? 0
                })
                .ToList() ?? new();

            // detalle procesos
            var pedidoDetalleProceso = new List<VMPedidoDetalleProceso>();

            if (pedido.PedidosDetalleProcesos.Any())
            {
                // cantidades base desde productos/insumos
                var productoIds = pedido.PedidosDetalleProcesos
                    .Where(x => x.IdProducto.HasValue)
                    .Select(x => x.IdProducto.Value)
                    .Distinct()
                    .ToList();

                var cantidadesBase = new Dictionary<(int prod, int ins), decimal>();

                foreach (var prodId in productoIds)
                {
                    var insumos = await _ProductosService.ObtenerInsumos(prodId);
                    foreach (var ins in insumos)
                        cantidadesBase[(ins.IdProducto, ins.IdInsumo)] = ins.Cantidad;
                }

                pedidoDetalleProceso = pedido.PedidosDetalleProcesos
                    .Select(dp =>
                    {
                        cantidadesBase.TryGetValue(
                            (dp.IdProducto ?? 0, dp.IdInsumo ?? 0),
                            out decimal cantInicial
                        );

                        return new VMPedidoDetalleProceso
                        {
                            Cantidad = dp.Cantidad,
                            CantidadInicial = cantInicial,
                            IdCategoria = dp.IdCategoria,
                            Comentarios = dp.Comentarios,
                            Descripcion = dp.Descripcion,
                            Especificacion = dp.Especificacion,
                            IdColor = dp.IdColor,
                            FechaActualizacion = dp.FechaActualizacion,
                            SubTotal = dp.SubTotal,
                            IdEstado = dp.IdEstado,
                            IdTipo = dp.IdTipo,
                            PrecioUnitario = dp.PrecioUnitario,
                            IdUnidadMedida = dp.IdUnidadMedida,
                            IdProveedor = dp.IdProveedor,
                            IdProducto = dp.IdProducto,
                            IdInsumo = dp.IdInsumo,
                            Color = dp.IdColorNavigation?.Nombre,
                            Estado = dp.IdEstadoNavigation?.Nombre,
                            Insumo = dp.IdInsumoNavigation?.Descripcion,
                            Producto = dp.IdProductoNavigation?.Nombre,
                            Categoria = dp.IdCategoriaNavigation?.Nombre ?? "",
                            Tipo = dp.IdTipoNavigation?.Nombre,
                            IdPedido = dp.IdPedido,
                            IdDetalle = dp.IdDetalle,
                            Id = dp.Id,
                            Proveedor = dp.IdProveedorNavigation?.Nombre ?? "",
                            CantidadUsadaStock = dp.CantidadUsadaStock ?? 0
                        };
                    })
                    .ToList();
            }

            result.Add("pedido", pedidoJSON);
            result.Add("PedidoDetalle", pedidoDetalle);
            result.Add("PedidoDetalleProceso", pedidoDetalleProceso);

            var jsonOptions = new JsonSerializerOptions
            {
                ReferenceHandler = ReferenceHandler.Preserve
            };

            return Ok(JsonSerializer.Serialize(result, jsonOptions));
        }

        /* ============================================================
           ELIMINAR
        ============================================================ */
        [HttpDelete]
        public async Task<bool> Eliminar(int id)
        {
            try
            {
                return await _PedidosService.EliminarPedido(id);
            }
            catch
            {
                return false;
            }
        }

        public IActionResult Index() => View();

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
            return View(new ErrorViewModel
            {
                RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
            });
        }
    }
}
