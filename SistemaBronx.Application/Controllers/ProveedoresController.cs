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
    public class ProveedoresController : Controller
    {
        private readonly IProveedorService _ProveedorService;
        private readonly IProvinciaService _provinciaService;

        public ProveedoresController(IProveedorService ProveedorService)
        {
            _ProveedorService = ProveedorService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Proveedores = await _ProveedorService.ObtenerTodos();

            var lista = Proveedores.Select(c => new VMProveedor
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Apodo = c.Apodo,
                Ubicacion = c.Ubicacion,
                Telefono = c.Telefono,
                Cbu = c.Cbu,
                Cuit = c.Cuit
            }).ToList();

            return Ok(lista);
        }



        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProveedor model)
        {
            var Proveedor = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Apodo = model.Apodo,
                Ubicacion = model.Ubicacion,
                Telefono = model.Telefono,
                Cbu = model.Cbu,
                Cuit = model.Cuit
            };

            bool respuesta = await _ProveedorService.Insertar(Proveedor);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProveedor model)
        {
            var Proveedor = new Proveedor
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Apodo = model.Apodo,
                Ubicacion = model.Ubicacion,
                Telefono = model.Telefono,
                Cbu = model.Cbu,
                Cuit = model.Cuit
            };

            bool respuesta = await _ProveedorService.Actualizar(Proveedor);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _ProveedorService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Proveedor = await _ProveedorService.Obtener(id);

            if (Proveedor != null)
            {
                return StatusCode(StatusCodes.Status200OK, Proveedor);
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