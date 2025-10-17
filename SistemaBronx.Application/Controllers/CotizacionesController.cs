using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;
using System.Linq.Expressions;
using System.Text.Json.Serialization;
using System.Text.Json;
using AspNetCoreGeneratedDocument;

namespace SistemaBronx.Application.Controllers
{

    [Authorize]

    public class CotizacionesController : Controller
    {
        private readonly ICotizacioneservice _CotizacionesService;
        private readonly IProductoService _ProductosService;

        public CotizacionesController(ICotizacioneservice CotizacionesService, IProductoService ProductosService)
        {
            _CotizacionesService = CotizacionesService;
            _ProductosService = ProductosService;
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCotizacion model)
        {
            try
            {
                var Cotizacion = new Cotizacion
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
                    Finalizado = model.Finalizado

                };

                List<CotizacionesDetalle> CotizacionDetalle = new List<CotizacionesDetalle>();
                List<CotizacionesDetalleProceso> CotizacionDetalleProceso = new List<CotizacionesDetalleProceso>();

                if (model.CotizacionesDetalles != null && model.CotizacionesDetalles.Any())
                {
                    CotizacionDetalle = model.CotizacionesDetalles.Select(detalle => new CotizacionesDetalle
                    {
                        Id = detalle.Id, // Si el ID existe, actualizarlo; si no, insertarlo
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

                // Actualizar Detalles de Insumos
                if (model.CotizacionesDetalleProcesos != null && model.CotizacionesDetalleProcesos.Any())
                {
                    CotizacionDetalleProceso = model.CotizacionesDetalleProcesos.Select(detalleProceso => new CotizacionesDetalleProceso
                    {
                        Id = detalleProceso.Id, // Si el ID existe, actualizarlo; si no, insertarlo
                        IdDetalle = detalleProceso.IdDetalle, // Si el ID existe, actualizarlo; si no, insertarlo
                        Cantidad = detalleProceso.Cantidad,
                        IdCategoria = detalleProceso.IdCategoria,
                        Comentarios = detalleProceso.Comentarios,
                        Descripcion = detalleProceso.Descripcion,
                        Especificacion = detalleProceso.Especificacion,
                        IdColor = detalleProceso.IdColor,
                        FechaActualizacion = DateTime.Now, // Se actualiza la fecha de modificación
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

                // Llamar al servicio con la transacción
                var resultado = await _CotizacionesService.Insertar(Cotizacion, CotizacionDetalle.AsQueryable(), CotizacionDetalleProceso.AsQueryable());


                if (!resultado)
                    return BadRequest("Error al insertar la Cotizacion y sus detalles");

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al insertar el Cotizacion: " + ex.Message);
            }
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCotizacion model)
        {
            try
            {
                // Buscar el Cotizacion existente
                var Cotizacion = await _CotizacionesService.ObtenerCotizacion(model.Id);
                if (Cotizacion == null)
                {
                    return NotFound("El Cotizacion no existe.");
                }

                // Actualizar los datos del Cotizacion
                Cotizacion.IdCliente = model.IdCliente;
                Cotizacion.IdFormaPago = model.IdFormaPago;
                Cotizacion.ImporteTotal = model.ImporteTotal ?? 0;
                Cotizacion.ImporteAbonado = model.ImporteAbonado ?? 0;
                Cotizacion.SubTotal = model.SubTotal ?? 0;
                Cotizacion.PorcDescuento = model.PorcDescuento ?? 0;
                Cotizacion.Saldo = model.Saldo ?? 0;
                Cotizacion.Comentarios = model.Comentarios;
                Cotizacion.Finalizado = (int)model.Finalizado;

                // Actualizar Detalles de Productos
                List<CotizacionesDetalle> CotizacionDetalle = new List<CotizacionesDetalle>();
                List<CotizacionesDetalleProceso> CotizacionDetalleProceso = new List<CotizacionesDetalleProceso>();

                if (model.CotizacionesDetalles != null && model.CotizacionesDetalles.Any())
                {
                    CotizacionDetalle = model.CotizacionesDetalles.Select(detalle => new CotizacionesDetalle
                    {
                        Id = detalle.Id, // Si el ID existe, actualizarlo; si no, insertarlo
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

                // Actualizar Detalles de Insumos
                if (model.CotizacionesDetalleProcesos != null && model.CotizacionesDetalleProcesos.Any())
                {
                    CotizacionDetalleProceso = model.CotizacionesDetalleProcesos.Select(detalleProceso => new CotizacionesDetalleProceso
                    {
                        Id = detalleProceso.Id, // Si el ID existe, actualizarlo; si no, insertarlo
                        IdDetalle = detalleProceso.IdDetalle, // Si el ID existe, actualizarlo; si no, insertarlo
                        Cantidad = detalleProceso.Cantidad,
                        IdCategoria = detalleProceso.IdCategoria,
                        Comentarios = detalleProceso.Comentarios,
                        Descripcion = detalleProceso.Descripcion,
                        Especificacion = detalleProceso.Especificacion,
                        IdColor = detalleProceso.IdColor,
                        FechaActualizacion = DateTime.Now, // Se actualiza la fecha de modificación
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

                // Llamar al servicio para actualizar los datos en la base de datos
                var resultado = await _CotizacionesService.Actualizar(Cotizacion, CotizacionDetalle.AsQueryable(), CotizacionDetalleProceso.AsQueryable());

                if (!resultado)
                {
                    return BadRequest("Error al actualizar el Cotizacion y sus detalles");
                }

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al actualizar el Cotizacion: " + ex.Message);
            }
        }


        [HttpPut]
        public async Task<IActionResult> ActualizarDetalleProceso([FromBody] VMCotizacionDetalleProceso model)
        {
            try
            {

                CotizacionesDetalleProceso CotizacionDetalleProceso = new CotizacionesDetalleProceso();

                if (model != null)
                {


                    CotizacionDetalleProceso.Cantidad = model.Cantidad;
                    CotizacionDetalleProceso.Id = model.Id;
                    CotizacionDetalleProceso.Comentarios = model.Comentarios;
                    CotizacionDetalleProceso.Descripcion = model.Descripcion;
                    CotizacionDetalleProceso.Especificacion = model.Especificacion;
                    CotizacionDetalleProceso.IdColor = model.IdColor;
                    CotizacionDetalleProceso.FechaActualizacion = DateTime.Now; // Se actualiza la fecha de modificación
                    CotizacionDetalleProceso.IdEstado = model.IdEstado;
                }

                // Llamar al servicio para actualizar los datos en la base de datos
                var resultado = await _CotizacionesService.ActualizarDetalleProceso(CotizacionDetalleProceso);

                if (!resultado)
                {
                    return BadRequest("Error al actualizar el Cotizacion y sus detalles");
                }

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return BadRequest("Error al actualizar el Cotizacion: " + ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> Lista(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
        {
            try
            {
                var Cotizaciones = await _CotizacionesService.ObtenerCotizaciones(FechaDesde, FechaHasta, IdCliente, Estado, Finalizado);

                var lista = Cotizaciones.Select(c => new VMCotizacion
                {
                    Id = c.Id,
                    Fecha = c.Fecha,
                    Finalizado = c.Finalizado,
                    SubTotal = c.SubTotal,
                    FormaPago = c.IdFormaPagoNavigation?.Nombre ?? "",
                    Saldo = c.Saldo,
                    Cliente = c.IdClienteNavigation?.Nombre ?? "",
                    PorcDescuento = c.PorcDescuento,
                    ImporteAbonado = c.ImporteAbonado,
                    ImporteTotal = c.ImporteTotal,
                    Comentarios = c.Comentarios,
                    Estado =
    c.CotizacionesDetalleProcesos.Any() &&
    c.CotizacionesDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "FINALIZADO") &&
    (c.Saldo ?? 0) == 0
        ? "FINALIZADO"
    : c.CotizacionesDetalleProcesos.Any() &&
      c.CotizacionesDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "ENTREGADO")
        ? "ENTREGADO"
    : c.CotizacionesDetalleProcesos.Any() &&
      c.CotizacionesDetalleProcesos.All(p => (p.IdEstadoNavigation?.Nombre?.Trim().ToUpper() ?? "") == "ENTREGAR")
        ? "ENTREGAR"
    : "EN PROCESO"



                }).ToList();


                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista de Cotizaciones");
            }
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerDatosCotizacion(int idCotizacion)
        {
            var result = new Dictionary<string, object>();

            if (idCotizacion <= 0)
                return Ok(new { });

            var Cotizacion = await _CotizacionesService.ObtenerCotizacion(idCotizacion);

            var CotizacionJSON = new VMCotizacion
            {
                Id = Cotizacion.Id,
                Fecha = Cotizacion.Fecha,
                Finalizado = Cotizacion.Finalizado,
                SubTotal = Cotizacion.SubTotal,
                FormaPago = Cotizacion.IdFormaPagoNavigation?.Nombre ?? "",
                Saldo = Cotizacion.Saldo,
                IdCliente = Cotizacion.IdCliente,
                IdFormaPago = Cotizacion.IdFormaPago,
                Cliente = Cotizacion.IdClienteNavigation?.Nombre ?? "",
                Telefono = Cotizacion.IdClienteNavigation?.Telefono ?? "",
                PorcDescuento = Cotizacion.PorcDescuento,
                ImporteAbonado = Cotizacion.ImporteAbonado,
                ImporteTotal = Cotizacion.ImporteTotal,
                Comentarios = Cotizacion.Comentarios,
                Estado = "Pendiente",
            };

            // ---------------- Detalle ----------------
            List<VMCotizacionDetalle> CotizacionDetalle = new();
            if (Cotizacion.CotizacionesDetalles != null && Cotizacion.CotizacionesDetalles.Any())
            {
                CotizacionDetalle = Cotizacion.CotizacionesDetalles.Select(detalle => new VMCotizacionDetalle
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
                    IdCotizacion = detalle.IdCotizacion,
                    Id = detalle.Id,
                    Color = detalle.IdColorNavigation?.Nombre ?? "",
                    Nombre = !string.IsNullOrWhiteSpace(detalle.Producto) ? detalle.Producto : (detalle.IdProductoNavigation?.Nombre ?? ""),
                    Categoria = detalle.IdCategoriaNavigation?.Nombre ?? "",
                    IVA = (decimal)detalle.PrecioVenta * ((decimal)detalle.PorcIva / 100m),
                    Ganancia = (decimal)detalle.CostoUnitario * ((decimal)detalle.PorcGanancia / 100m)
                }).ToList();
            }

            // ---------------- Procesos ----------------
            List<VMCotizacionDetalleProceso> CotizacionDetalleProceso = new();

            if (Cotizacion.CotizacionesDetalleProcesos != null && Cotizacion.CotizacionesDetalleProcesos.Any())
            {
                // 1) Pre-cargar insumos por producto (evita N+1)
                var productoIds = Cotizacion.CotizacionesDetalleProcesos
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

                // 2) Map a VM
                CotizacionDetalleProceso = Cotizacion.CotizacionesDetalleProcesos.Select(detalleProceso =>
                {
                    decimal cantInicial = 0m;
                    if (detalleProceso.IdProducto.HasValue && detalleProceso.IdInsumo.HasValue)
                    {
                        cantidadesBase.TryGetValue(
                            (detalleProceso.IdProducto.Value, detalleProceso.IdInsumo.Value),
                            out cantInicial
                        );
                    }

                    return new VMCotizacionDetalleProceso
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
                        IdCotizacion = detalleProceso.IdCotizacion,
                        IdDetalle = detalleProceso.IdDetalle,
                        Id = detalleProceso.Id,
                        Proveedor = detalleProceso.IdProveedorNavigation?.Nombre ?? ""
                    };
                }).ToList();
            }

            result.Add("Cotizacion", CotizacionJSON);
            result.Add("CotizacionDetalle", CotizacionDetalle);
            result.Add("CotizacionDetalleProceso", CotizacionDetalleProceso);

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
                var resp = await _CotizacionesService.EliminarCotizacion(id);

                return true;
            }
            catch (Exception ex)
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
                // Maneja el caso en el que no se encuentra el Cotizacion
                ViewBag.Error = "No se encontró el Cotizacion.";
            }

            // Retorna la vista
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarComoPedido(int id)
        {
            try
            {
                if (id <= 0)
                    return BadRequest("Id de cotización inválido.");

                // eliminarCotizacion: true → borra la cotización al convertir
                var idPedido = await _CotizacionesService.TransformarCotizacionEnPedidoAsync(id, eliminarCotizacion: true);

                if (idPedido <= 0)
                    return BadRequest("No se pudo crear el pedido a partir de la cotización.");

                return Json(new { ok = true, idPedido });
            }
            catch (Exception ex)
            {
                Response.StatusCode = 400;
                return Content(ex.Message);
            }
        }


        //public IActionResult NuevoModif()
        //{
        //    return View();
        //}


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}