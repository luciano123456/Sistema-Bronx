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

    public class ProductosCategoriasController : Controller
    {
        private readonly IProductoService _Categoriaservice;

        public ProductosCategoriasController(IProductoService Categoriaservice)
        {
            _Categoriaservice = Categoriaservice;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Categorias = await _Categoriaservice.ObtenerCategorias();

            var lista = Categorias.Select(c => new VMProductoCategoria
            {
                Id = c.Id,
                Nombre = c.Nombre,
            
            }).ToList();

            return Ok(lista);
        }


        
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}