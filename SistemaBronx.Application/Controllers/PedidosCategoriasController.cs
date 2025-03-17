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

    public class PedidosCategoriasController : Controller
    {
        private readonly IPedidoCategoriaService _PedidosCategoriasService;

        public PedidosCategoriasController(IPedidoCategoriaService PedidosCategoriasService)
        {
            _PedidosCategoriasService = PedidosCategoriasService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Categorias = await _PedidosCategoriasService.ObtenerTodos();

            var lista = Categorias.Select(c => new VMPedidoCategoria
            {
                Id = c.Id,
                Nombre = c.Nombre,

            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedidoCategoria model)
        {
            var Categoria = new PedidosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosCategoriasService.Insertar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPedidoCategoria model)
        {
            var Categoria = new PedidosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosCategoriasService.Actualizar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _PedidosCategoriasService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Categoria = await _PedidosCategoriasService.Obtener(id);

            if (Categoria != null)
            {
                return StatusCode(StatusCodes.Status200OK, Categoria);
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