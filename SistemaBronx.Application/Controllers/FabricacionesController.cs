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

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            try
            {
                var detallesProcesos = await _PedidosService.ObtenerDetalleProcesos();

                var lista = detallesProcesos.Select(detalleProceso => new VMPedidoDetalleProceso
                {
                    Id = detalleProceso.Id, // Si el ID existe, actualizarlo; si no, insertarlo
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
                    IdDetalle = detalleProceso.IdDetalle
                }).ToList();

                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest("Ha ocurrido un error al mostrar la lista de pedidos");
            }
        }

    }
}