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

    public class ColoresController : Controller
    {
        private readonly IColorService _Coloreservice;

        public ColoresController(IColorService Coloreservice)
        {
            _Coloreservice = Coloreservice;
        }


        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Colores = await _Coloreservice.ObtenerTodos();

            var lista = Colores.Select(c => new VMColor
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMColor model)
        {
            var color = new Color
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Coloreservice.Insertar(color);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMColor model)
        {
            var color = new Color
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Coloreservice.Actualizar(color);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Coloreservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var color = await _Coloreservice.Obtener(id);

            if (color != null)
            {
                return StatusCode(StatusCodes.Status200OK, color);
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