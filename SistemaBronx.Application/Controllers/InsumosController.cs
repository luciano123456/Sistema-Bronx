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
    public class InsumosController : Controller
    {
        private readonly IInsumoService _Insumoservice;
        private readonly IProvinciaService _provinciaService;
        private readonly IProveedorService _proveedorservice;

        public InsumosController(IInsumoService Insumoservice, IProvinciaService provinciaService, IProveedorService proveedorservice)
        {
            _Insumoservice = Insumoservice;
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
            var Insumos = await _Insumoservice.ObtenerTodos();

            var lista = Insumos.Select(c => new VMInsumo
            {
                Id = c.Id,
                Descripcion = c.Descripcion,
                IdTipo = c.IdTipo,
                IdCategoria = c.IdCategoria,
                IdUnidadMedida = c.IdUnidadMedida,
                IdProveedor = c.IdProveedor,
                Especificacion = c.Especificacion,
                PrecioCosto = c.PrecioCosto,
                PorcGanancia = c.PorcGanancia,
                PrecioVenta = c.PrecioVenta,
                Categoria = c.IdCategoriaNavigation.Nombre,
                Proveedor = c.IdProveedorNavigation.Nombre,
                UnidaddeMedida = c.IdUnidadMedidaNavigation.Nombre,
                Tipo = c.IdTipoNavigation.Nombre
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
        public async Task<IActionResult> Insertar([FromBody] VMInsumo model)
        {
            var insumo = new Insumo
            {
                Id = model.Id,
                Descripcion = model.Descripcion,
                IdTipo = model.IdTipo,
                IdCategoria = model.IdCategoria,
                IdUnidadMedida = model.IdUnidadMedida,
                IdProveedor =  model.IdProveedor,
                Especificacion = model.Especificacion,
                PrecioCosto = model.PrecioCosto,
                PorcGanancia = model.PorcGanancia,
                PrecioVenta = model.PrecioVenta,
            };

            bool respuesta = await _Insumoservice.Insertar(insumo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMInsumo model)
        {
            var insumo = new Insumo
            {
                Id = model.Id,
                Descripcion = model.Descripcion,
                IdTipo = model.IdTipo,
                IdCategoria = model.IdCategoria,
                IdUnidadMedida = model.IdUnidadMedida,
                IdProveedor = model.IdProveedor,
                Especificacion = model.Especificacion,
                PrecioCosto = model.PrecioCosto,
                PorcGanancia = model.PorcGanancia,
                PrecioVenta = model.PrecioVenta,
            };

            bool respuesta = await _Insumoservice.Actualizar(insumo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Insumoservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var InsumoResp = await _Insumoservice.Obtener(id);

            var insumo = new VMInsumo
            {
                Id = InsumoResp.Id,
                Descripcion = InsumoResp.Descripcion,
                IdTipo = InsumoResp.IdTipo,
                IdCategoria = InsumoResp.IdCategoria,
                IdUnidadMedida = InsumoResp.IdUnidadMedida,
                IdProveedor = InsumoResp.IdProveedor,
                Especificacion = InsumoResp.Especificacion,
                PrecioCosto = InsumoResp.PrecioCosto,
                PorcGanancia = InsumoResp.PorcGanancia,
                PrecioVenta = InsumoResp.PrecioVenta,
                Categoria = InsumoResp.IdCategoriaNavigation.Nombre,
                Proveedor = InsumoResp.IdProveedorNavigation.Nombre,
                UnidaddeMedida = InsumoResp.IdUnidadMedidaNavigation.Nombre,
                Tipo = InsumoResp.IdTipoNavigation.Nombre
            };


            if (insumo != null)
            {
                return StatusCode(StatusCodes.Status200OK, insumo);
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