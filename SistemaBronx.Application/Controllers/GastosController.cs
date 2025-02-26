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
    public class GastosController : Controller
    {
        private readonly IGastoService _GastoService;
        private readonly IFormasdePagoService _FormadePagoService;
        private readonly IGastoCategoriaService _GastoCategoriaService;

        public GastosController(IGastoService GastoService, IFormasdePagoService FormadePagoservice, IGastoCategoriaService GastoCategoriaService)
        {
            _GastoService = GastoService;
            _FormadePagoService = FormadePagoservice;
            _GastoCategoriaService = GastoCategoriaService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(DateTime FechaDesde, DateTime FechaHasta, int Categoria, int Formadepago)
        {
            var Gastos = await _GastoService.ObtenerTodos(FechaDesde, FechaHasta, Categoria, Formadepago);

            var lista = Gastos.Select(c => new VMGasto
            {
                Id = c.Id,
                Iva = c.Iva,
                ImporteTotal = c.ImporteTotal,
                Comentarios = c.Comentarios,
                ImporteAbonado = c.ImporteAbonado,
                Fecha = c.Fecha,
                IdCategoria = c.IdCategoria,
                IdFormadePago = c.IdFormadePago,
                Saldo = c.Saldo,
                SubtotalNeto = c.SubtotalNeto,
                FormaPago = c.IdFormadePagoNavigation.Nombre,
                Categoria = c.IdCategoriaNavigation.Nombre

            }).ToList();

            return Ok(lista);
        }



        [HttpGet]
        public async Task<IActionResult> ListaGastos()
        {
            var provincias = await _GastoCategoriaService.ObtenerTodos();

            var lista = provincias.Select(c => new VMProvincia
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpGet]
        public async Task<IActionResult> ListaFormasdePago()
        {
            var provincias = await _FormadePagoService.ObtenerTodos();

            var lista = provincias.Select(c => new VMProvincia
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }



        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGasto model)
        {
            var Gasto = new Gasto
            {
                Id = model.Id,
                Saldo = model.Saldo,
                Comentarios = model.Comentarios,
                Fecha = model.Fecha,
                IdCategoria = model.IdCategoria,
                IdFormadePago = model.IdFormadePago,
                ImporteAbonado = model.ImporteAbonado,
                ImporteTotal = model.ImporteTotal,
                SubtotalNeto = model.SubtotalNeto,
                Iva = model.Iva,
            };

            bool respuesta = await _GastoService.Insertar(Gasto);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGasto model)
        {
            var Gasto = new Gasto
            {
                Id = model.Id,
                Saldo = model.Saldo,
                Comentarios = model.Comentarios,
                Fecha = model.Fecha,
                IdCategoria = model.IdCategoria,
                IdFormadePago = model.IdFormadePago,
                ImporteAbonado = model.ImporteAbonado,
                ImporteTotal = model.ImporteTotal,
                SubtotalNeto = model.SubtotalNeto,
                Iva = model.Iva,
            };

            bool respuesta = await _GastoService.Actualizar(Gasto);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _GastoService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Gasto = await _GastoService.Obtener(id);

            if (Gasto != null)
            {
                return StatusCode(StatusCodes.Status200OK, Gasto);
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