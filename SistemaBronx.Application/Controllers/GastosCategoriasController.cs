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

    public class GastosCategoriasController : Controller
    {
        private readonly IGastoCategoriaService _GastosCategoriasService;

        public GastosCategoriasController(IGastoCategoriaService GastosCategoriasService)
        {
            _GastosCategoriasService = GastosCategoriasService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Categorias = await _GastosCategoriasService.ObtenerTodos();

            var lista = Categorias.Select(c => new VMGenericModelConfCombo
            {
                Id = c.Id,
                IdCombo = c.IdTipo != null ? (int)c.IdTipo : 0,
                NombreCombo = c.IdTipoNavigation != null ? c.IdTipoNavigation.Nombre : null,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModelConfCombo model)
        {
            var Categoria = new GastosCategoria
            {
                Id = model.Id,
                IdTipo = model.IdCombo,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosCategoriasService.Insertar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModelConfCombo model)
        {
            var Categoria = new GastosCategoria
            {
                Id = model.Id,
                IdTipo = model.IdCombo,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosCategoriasService.Actualizar(Categoria);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _GastosCategoriasService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }


        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var resultBase = await _GastosCategoriasService.Obtener(id);

            var result = new VMGenericModelConfCombo
            {
                Id = resultBase.Id,
                Nombre = resultBase.Nombre,
                IdCombo = resultBase.IdTipo != null ? (int)resultBase.IdTipo : 0,
                NombreCombo = resultBase.IdTipoNavigation != null ? resultBase.IdTipoNavigation.Nombre : null,
            };

            if (result != null)
            {
                return StatusCode(StatusCodes.Status200OK, result);
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