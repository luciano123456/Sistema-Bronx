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

    public class CategoriasController : Controller
    {
        private readonly ICategoriaService _Categoriaservice;

        public CategoriasController(ICategoriaService Categoriaservice)
        {
            _Categoriaservice = Categoriaservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Categorias = await _Categoriaservice.ObtenerTodos();

            var lista = Categorias.Select(c => new VMProductoCategoria
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProductoCategoria model)
        {
            var Categoria = new ProductosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Categoriaservice.Insertar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProductoCategoria model)
        {
            var Categoria = new ProductosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Categoriaservice.Actualizar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Categoriaservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Categoria = await _Categoriaservice.Obtener(id);

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