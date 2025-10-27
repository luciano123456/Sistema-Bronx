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
    public class FormasdePagoController : Controller
    {
        private readonly IFormasdePagoService _FormasdepagoService;

        public FormasdePagoController(IFormasdePagoService FormasdePagoService)
        {
            _FormasdepagoService = FormasdePagoService;
        }

        public IActionResult Index() => View();

        // GET: /FormasdePago/Lista
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var formas = await _FormasdepagoService.ObtenerTodos();

            var lista = formas.Select(f => new VmFormasdePago
            {
                Id = f.Id,
                Nombre = f.Nombre,
                CostoFinanciero = f.CostoFinanciero
            }).ToList();

            return Ok(lista);
        }

        // POST: /FormasdePago/Insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VmFormasdePago model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entidad = new FormasdePago
            {
                Id = model.Id,
                Nombre = model.Nombre,
                CostoFinanciero = model.CostoFinanciero  
            };

            bool respuesta = await _FormasdepagoService.Insertar(entidad);
            return Ok(new { valor = respuesta });
        }

        // PUT: /FormasdePago/Actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VmFormasdePago model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var entidad = new FormasdePago
            {
                Id = model.Id,
                Nombre = model.Nombre,
                CostoFinanciero = model.CostoFinanciero 
            };

            bool respuesta = await _FormasdepagoService.Actualizar(entidad);
            return Ok(new { valor = respuesta });
        }

        // DELETE: /FormasdePago/Eliminar?id=#
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _FormasdepagoService.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        // GET: /FormasdePago/EditarInfo?id=#
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var f = await _FormasdepagoService.Obtener(id);
            if (f == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VmFormasdePago
            {
                Id = f.Id,
                Nombre = f.Nombre,
                CostoFinanciero = f.CostoFinanciero 
            };

            return StatusCode(StatusCodes.Status200OK, vm);
        }

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
            => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
