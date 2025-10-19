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

    public class GastosTiposController : Controller
    {
        private readonly IGastoTipoService _GastosTiposService;

        public GastosTiposController(IGastoTipoService GastosTiposService)
        {
            _GastosTiposService = GastosTiposService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Tipos = await _GastosTiposService.ObtenerTodos();

            var lista = Tipos.Select(c => new VMGastoTipo
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGastoTipo model)
        {
            var Tipo = new GastosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosTiposService.Insertar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGastoTipo model)
        {
            var Tipo = new GastosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _GastosTiposService.Actualizar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _GastosTiposService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Tipo = await _GastosTiposService.Obtener(id);

            if (Tipo != null)
            {
                return StatusCode(StatusCodes.Status200OK, Tipo);
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