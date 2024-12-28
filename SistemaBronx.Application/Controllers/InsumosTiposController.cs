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

    public class InsumosTiposController : Controller
    {
        private readonly IInsumosTipoService _Tiposervice;

        public InsumosTiposController(IInsumosTipoService Tiposervice)
        {
            _Tiposervice = Tiposervice;
        }


        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Tipos = await _Tiposervice.ObtenerTodos();

            var lista = Tipos.Select(c => new VMInsumoTipo
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMInsumoTipo model)
        {
            var Tipo = new InsumosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Tiposervice.Insertar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMInsumoTipo model)
        {
            var Tipo = new InsumosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _Tiposervice.Actualizar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Tiposervice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Tipo = await _Tiposervice.Obtener(id);

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