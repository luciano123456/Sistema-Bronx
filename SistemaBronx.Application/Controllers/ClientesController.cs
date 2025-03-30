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
    public class ClientesController : Controller
    {
        private readonly IClienteService _clienteService;
        private readonly IProvinciaService _provinciaService;
        private readonly IProveedorService _proveedorservice;

        public ClientesController(IClienteService clienteService, IProvinciaService provinciaService, IProveedorService proveedorservice)
        {
            _clienteService = clienteService;
            _provinciaService = provinciaService;
            _proveedorservice = proveedorservice;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var clientes = await _clienteService.ObtenerTodos();

            var lista = clientes.Select(c => new VMCliente
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdProvincia = c.IdProvincia,
                Provincia = c.IdProvinciaNavigation.Nombre,
                Localidad = c.Localidad,
                Dni = c.Dni,
                Saldo = c.Saldo,
                SaldoAfavor = c.SaldoAfavor
            }).ToList();

            return Ok(lista);
        }



        [HttpGet]
        public async Task<IActionResult> ListaProvincias()
        {
            var provincias = await _provinciaService.ObtenerTodos();

            var lista = provincias.Select(c => new VMProvincia
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCliente model)
        {
            var cliente = new Cliente
            {
                Id = model.Id,
                Saldo = model.Saldo,
                SaldoAfavor = model.SaldoAfavor,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Localidad = model.Localidad,
                IdProvincia = model.IdProvincia,
                Direccion = model.Direccion,
                Dni = model.Dni
            };

            int respuesta = await _clienteService.Insertar(cliente);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCliente model)
        {
            var cliente = new Cliente
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Localidad = model.Localidad,
                IdProvincia = model.IdProvincia,
                Direccion = model.Direccion,
                Dni = model.Dni
            };

            bool respuesta = await _clienteService.Actualizar(cliente);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _clienteService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var cliente = await _clienteService.Obtener(id);

            if (cliente != null)
            {
                return StatusCode(StatusCodes.Status200OK, cliente);
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