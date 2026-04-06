using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;

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

                List<PedidosDetalle> pedidoDetalle = new();
                List<PedidosDetalleProceso> pedidoDetalleProceso = new();

                if (model.PedidosDetalles != null && model.PedidosDetalles.Any())
                {
                    pedidoDetalle = model.PedidosDetalles.Select(detalle => new PedidosDetalle
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
                        Producto = detalle.Producto
                    }).ToList();
                }

                if (model.PedidosDetalleProcesos != null && model.PedidosDetalleProcesos.Any())
                {
                    pedidoDetalleProceso = model.PedidosDetalleProcesos.Select(detalleProceso => new PedidosDetalleProceso
                    {
                        Id = detalleProceso.Id,
                        IdDetalle = detalleProceso.IdDetalle,
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
                        IdInsumo = detalleProceso.IdInsumo
                    }).ToList();
                }

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
                        errores = validacion.errores
                    });
                }

                var resultado = await _PedidosService.Insertar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al insertar el pedido y sus detalles." });

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al insertar el pedido: " + ex.Message });
            }
        }

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

                List<PedidosDetalle> pedidoDetalle = new();
                List<PedidosDetalleProceso> pedidoDetalleProceso = new();

                if (model.PedidosDetalles != null && model.PedidosDetalles.Any())
                {
                    pedidoDetalle = model.PedidosDetalles.Select(detalle => new PedidosDetalle
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
                        Producto = detalle.Producto
                    }).ToList();
                }

                if (model.PedidosDetalleProcesos != null && model.PedidosDetalleProcesos.Any())
                {
                    pedidoDetalleProceso = model.PedidosDetalleProcesos.Select(detalleProceso => new PedidosDetalleProceso
                    {
                        Id = detalleProceso.Id,
                        IdDetalle = detalleProceso.IdDetalle,
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
                        IdInsumo = detalleProceso.IdInsumo
                    }).ToList();
                }

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
                        errores = validacion.errores
                    });
                }

                var resultado = await _PedidosService.Actualizar(
                    pedido,
                    pedidoDetalle.AsQueryable(),
                    pedidoDetalleProceso.AsQueryable()
                );

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al actualizar el pedido y sus detalles." });

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al actualizar el pedido: " + ex.Message });
            }
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarDetalleProceso([FromBody] VMPedidoDetalleProceso model)
        {
            try
            {
                var pedidoDetalleProceso = new PedidosDetalleProceso();

                if (model != null)
                {
                    pedidoDetalleProceso.Cantidad = model.Cantidad;
                    pedidoDetalleProceso.Id = model.Id;
                    pedidoDetalleProceso.Comentarios = model.Comentarios;
                    pedidoDetalleProceso.Descripcion = model.Descripcion;
                    pedidoDetalleProceso.Especificacion = model.Especificacion;
                    pedidoDetalleProceso.IdColor = model.IdColor;
                    pedidoDetalleProceso.FechaActualizacion = DateTime.Now;
                    pedidoDetalleProceso.IdEstado = model.IdEstado;
                }

                var resultado = await _PedidosService.ActualizarDetalleProceso(pedidoDetalleProceso);

                if (!resultado)
                    return BadRequest(new { valor = false, msg = "Error al actualizar el detalle del pedido." });

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { valor = false, msg = "Error al actualizar el pedido: " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ValidarStock([FromBody] VMPedido model)
        {
            try
            {
                List<PedidosDetalle> pedidoDetalle = new();
                List<PedidosDetalleProceso> pedidoDetalleProceso = new();

                if (model.PedidosDetalles != null && model.PedidosDetalles.Any())
                {
                    pedidoDetalle = model.PedidosDetalles.Select(detalle => new PedidosDetalle
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
                        Producto = detalle.Producto
                    }).ToList();
                }

                if (model.PedidosDetalleProcesos != null && model.PedidosDetalleProcesos.Any())
                {
                    pedidoDetalleProceso = model.PedidosDetalleProcesos.Select(detalleProceso => new PedidosDetalleProceso
                    {
                        Id = detalleProceso.Id,
                        IdDetalle = detalleProceso.IdDetalle,
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
                        IdInsumo = detalleProceso.IdInsumo
                    }).ToList();
                }

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

        [HttpGet]
        public async Task<IActionResult> DisponibilidadStock(string tipoItem, int? idProducto, int? idInsumo, decimal cantidad)
        {
            try
            {
                var resp = await _PedidosService.ObtenerDisponibilidadStock(tipoItem, idProducto, idInsumo, cantidad);

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

        [HttpGet]
        public async Task<IActionResult> ObtenerDatosPedido(int idPedido)
        {
            var result = new Dictionary<string, object>();

            if (idPedido <= 0)
                return Ok(new { });

            var pedido = await _PedidosService.ObtenerPedido(idPedido);

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

            List<VMPedidoDetalle> pedidoDetalle = new();
            if (pedido.PedidosDetalles != null && pedido.PedidosDetalles.Any())
            {
                pedidoDetalle = pedido.PedidosDetalles.Select(detalle => new VMPedidoDetalle
                {
                    Cantidad = detalle.Cantidad,
                    CostoUnitario = detalle.CostoUnitario,
                    PrecioVenta = detalle.PrecioVenta,
                    PrecioVentaUnitario = detalle.Cantidad != 0 ? (detalle.PrecioVenta / detalle.Cantidad) : 0,
                    PorcIva = detalle.PorcIva,
                    IdCategoria = detalle.IdCategoria,
                    IdColor = detalle.IdColor,
                    IdProducto = detalle.IdProducto,
                    PorcGanancia = detalle.PorcGanancia,
                    IdPedido = detalle.IdPedido,
                    Id = detalle.Id,
                    Color = detalle.IdColorNavigation?.Nombre ?? "",
                    Nombre = !string.IsNullOrWhiteSpace(detalle.Producto) ? detalle.Producto : (detalle.IdProductoNavigation?.Nombre ?? ""),
                    Categoria = detalle.IdCategoriaNavigation?.Nombre ?? "",
                    IVA = (decimal)detalle.PrecioVenta * ((decimal)detalle.PorcIva / 100m),
                    Ganancia = (decimal)detalle.CostoUnitario * ((decimal)detalle.PorcGanancia / 100m)
                }).ToList();
            }

            List<VMPedidoDetalleProceso> pedidoDetalleProceso = new();

            if (pedido.PedidosDetalleProcesos != null && pedido.PedidosDetalleProcesos.Any())
            {
                var productoIds = pedido.PedidosDetalleProcesos
                    .Where(x => x.IdProducto.HasValue)
                    .Select(x => x.IdProducto!.Value)
                    .Distinct()
                    .ToList();

                var cantidadesBase = new Dictionary<(int prod, int ins), decimal>();
                foreach (var pid in productoIds)
                {
                    var insumos = await _ProductosService.ObtenerInsumos(pid);
                    foreach (var i in insumos)
                        cantidadesBase[(i.IdProducto, i.IdInsumo)] = i.Cantidad;
                }

                pedidoDetalleProceso = pedido.PedidosDetalleProcesos.Select(detalleProceso =>
                {
                    decimal cantInicial = 0m;
                    if (detalleProceso.IdProducto.HasValue && detalleProceso.IdInsumo.HasValue)
                    {
                        cantidadesBase.TryGetValue(
                            (detalleProceso.IdProducto.Value, detalleProceso.IdInsumo.Value),
                            out cantInicial
                        );
                    }

                    return new VMPedidoDetalleProceso
                    {
                        Cantidad = detalleProceso.Cantidad,
                        CantidadInicial = cantInicial,
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
                        IdProducto = detalleProceso.IdProducto,
                        IdInsumo = detalleProceso.IdInsumo,
                        Color = detalleProceso.IdColorNavigation?.Nombre,
                        Estado = detalleProceso.IdEstadoNavigation?.Nombre,
                        Insumo = detalleProceso.IdInsumoNavigation?.Descripcion,
                        Producto = detalleProceso.IdProductoNavigation?.Nombre,
                        Categoria = detalleProceso.IdCategoriaNavigation?.Nombre ?? "",
                        Tipo = detalleProceso.IdTipoNavigation?.Nombre,
                        IdPedido = detalleProceso.IdPedido,
                        IdDetalle = detalleProceso.IdDetalle,
                        Id = detalleProceso.Id,
                        Proveedor = detalleProceso.IdProveedorNavigation?.Nombre ?? ""
                    };
                }).ToList();
            }

            result.Add("pedido", pedidoJSON);
            result.Add("PedidoDetalle", pedidoDetalle);
            result.Add("PedidoDetalleProceso", pedidoDetalleProceso);

            var jsonOptions = new JsonSerializerOptions
            {
                ReferenceHandler = ReferenceHandler.Preserve
            };

            return Ok(System.Text.Json.JsonSerializer.Serialize(result, jsonOptions));
        }

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

        public IActionResult Index()
        {
            return View();
        }

        public async Task<IActionResult> NuevoModif(int? id)
        {
            if (id.HasValue)
            {
                ViewBag.Data = id;
            }
            else
            {
                ViewBag.Error = "No se encontró el pedido.";
            }

            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}