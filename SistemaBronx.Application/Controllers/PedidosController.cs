using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class PedidosController : Controller
    {

        private readonly IPedidoService _pedidoservice;

        public PedidosController(IPedidoService pedidoservice)
        {
            _pedidoservice = pedidoservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult NuevoModif()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPedido(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPedido(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPagosClientes(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPagosClientes(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerPagosaProveedores(int idPedido)
        {
            var result = await _pedidoservice.ObtenerPagosaProveedores(idPedido);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerDatosPedido(int idPedido)
        {
            Dictionary<string, object> result = new Dictionary<string, object>();

            var pedido = await _pedidoservice.ObtenerPedido(idPedido);
            var pagosaProveedores = await _pedidoservice.ObtenerPagosaProveedores(idPedido);
            var pagosClientes = await _pedidoservice.ObtenerPagosClientes(idPedido);
            var productos = await _pedidoservice.ObtenerProductosPedido(idPedido);

            result.Add("pedido", pedido);
            result.Add("pagosaProveedores", pagosaProveedores);
            result.Add("pagosClientes", pagosClientes);
            result.Add("productos", productos);

            return Ok(result);
        }




    }
}
