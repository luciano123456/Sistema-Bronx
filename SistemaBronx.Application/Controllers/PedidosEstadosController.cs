using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;

namespace SistemaBronx.Application.Controllers
{

    [Authorize]

    public class PedidosEstadosController : Controller
    {
        private readonly IPedidoEstadoService _PedidosEstadosService;

        public PedidosEstadosController(IPedidoEstadoService PedidosEstadosService)
        {
            _PedidosEstadosService = PedidosEstadosService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Estados = await _PedidosEstadosService.ObtenerTodos();

            var lista = Estados.Select(c => new VMPedidoEstado
            {
                Id = c.Id,
                Nombre = c.Nombre,

            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedidoEstado model)
        {
            var Estado = new PedidosEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosEstadosService.Insertar(Estado);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPedidoEstado model)
        {
            var Estado = new PedidosEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosEstadosService.Actualizar(Estado);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _PedidosEstadosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Estado = await _PedidosEstadosService.Obtener(id);

            if (Estado != null)
            {
                return StatusCode(StatusCodes.Status200OK, Estado);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}