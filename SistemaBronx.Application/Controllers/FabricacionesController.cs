using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using Microsoft.AspNetCore.Authorization;

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

                var lista = detallesProcesos.Select(detalleProceso => new VMPedidoDetalleProceso
                {
                    Id = detalleProceso.Id,
                    Cantidad = detalleProceso.Cantidad,
                    Producto = detalleProceso.IdProductoNavigation.Nombre,
                    Insumo = detalleProceso.IdInsumoNavigation != null ? detalleProceso.IdInsumoNavigation.Descripcion : "",
                    IdColor = detalleProceso.IdColor,
                    IdPedido = detalleProceso.IdPedido,
                    Color = detalleProceso.IdColorNavigation != null ? detalleProceso.IdColorNavigation.Nombre : "",
                    Comentarios = detalleProceso.Comentarios,
                    Descripcion = detalleProceso.Descripcion,
                    IdEstado = detalleProceso.IdEstado,
                    Estado = detalleProceso.IdEstadoNavigation != null ? detalleProceso.IdEstadoNavigation.Nombre : "",
                    IdProveedor = detalleProceso.IdProveedor,
                    Proveedor = detalleProceso.IdProveedorNavigation != null ? detalleProceso.IdProveedorNavigation.Nombre : "",
                    Categoria = detalleProceso.IdInsumoNavigation.IdCategoriaNavigation != null ? detalleProceso.IdInsumoNavigation.IdCategoriaNavigation.Nombre : "",
                    IdDetalle = detalleProceso.IdDetalle,
                    FechaActualizacion = detalleProceso.FechaActualizacion,
                    Cliente = detalleProceso.IdPedidoNavigation.IdClienteNavigation != null ? detalleProceso.IdPedidoNavigation.IdClienteNavigation.Nombre : "",
                }).ToList();

                return Ok(lista);
            }
            catch
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista de pedidos");
            }
        }
    }
}
