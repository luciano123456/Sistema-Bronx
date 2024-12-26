using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using System.Diagnostics;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class UnidadesDeMedidasController : Controller
    {
        private readonly IUnidadDeMedidaService _UnidadesDeMedidaservice;

        public UnidadesDeMedidasController(IUnidadDeMedidaService UnidadesDeMedidaservice)
        {
            _UnidadesDeMedidaservice = UnidadesDeMedidaservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var UnidadesDeMedidas = await _UnidadesDeMedidaservice.ObtenerTodos();

            var lista = UnidadesDeMedidas.Select(c => new VMProductoUnidadDeMedida
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProductoUnidadDeMedida model)
        {
            var UnidadDeMedida = new UnidadesDeMedida
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _UnidadesDeMedidaservice.Insertar(UnidadDeMedida);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProductoUnidadDeMedida model)
        {
            var UnidadDeMedida = new UnidadesDeMedida
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _UnidadesDeMedidaservice.Actualizar(UnidadDeMedida);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _UnidadesDeMedidaservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var UnidadDeMedida = await _UnidadesDeMedidaservice.Obtener(id);

            if (UnidadDeMedida != null)
            {
                return StatusCode(StatusCodes.Status200OK, UnidadDeMedida);
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