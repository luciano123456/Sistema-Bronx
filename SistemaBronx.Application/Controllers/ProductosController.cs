using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;
using System.Text.Json.Serialization;
using System.Text.Json;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class ProductosController : Controller
    {
        private readonly IProductoService _ProductosService;

        public ProductosController(IProductoService ProductosService)
        {
            _ProductosService = ProductosService;
        }

        public IActionResult Index()
        {
            return View();
        }


        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            try
            {
                var Productos = await _ProductosService.ObtenerTodos();

                var lista = Productos.Select(c => new VMProducto
                {
                    Id = c.Id,
                    Codigo = c.Codigo,
                    Descripcion = c.Descripcion,
                    PorcGanancia = c.PorcGanancia,
                    PorcIva = c.PorcIva,
                    IdCategoria = c.IdCategoria,
                    IdColor = c.IdColor,
                    CostoUnitario = c.CostoUnitario,
                    Color = c.IdColorNavigation.Nombre,
                    Categoria = c.IdCategoriaNavigation.Nombre
                }).ToList();

                return Ok(lista);
            }
            catch (Exception ex)
            {
                return BadRequest(ex);
            }
        }



        [HttpGet]
        public async Task<IActionResult> ListaCategorias()
        {
            var Productos = await _ProductosService.ObtenerCategorias();

            var lista = Productos.Select(c => new VMProductoCategoria
            {
                Id = c.Id,
                Nombre = c.Nombre
            }).ToList();

            return Ok(lista);
        }



        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProducto model)
        {
            var Productos = new Producto
            {
                Id = model.Id,
                PorcIva = model.PorcIva,
                Codigo = model.Codigo,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                IdColor = model.IdColor,
                PorcGanancia = model.PorcGanancia,

            };

            bool respuesta = await _ProductosService.Insertar(Productos);

            List<ProductosInsumo> pedidosInsumo = new List<ProductosInsumo>();

            // Agregar los pagos de clientes
            if (model.ProductosInsumos != null && model.ProductosInsumos.Any())
            {
                foreach (var insumo in model.ProductosInsumos)
                {
                    var nuevoInsumo = new ProductosInsumo
                    {
                        IdProducto = Productos.Id,
                        IdInsumo = insumo.IdInsumo,
                        Cantidad = insumo.Cantidad,
                        CostoUnitario = insumo.CostoUnitario,
                        SubTotal = insumo.SubTotal,
                    };
                    pedidosInsumo.Add(nuevoInsumo);
                }
            }

            bool respInsumos = await _ProductosService.InsertarInsumos(pedidosInsumo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProducto model)
        {
            var Productos = new Producto
            {
                Id = model.Id,
                PorcIva = model.PorcIva,
                Codigo = model.Codigo,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                IdColor = model.IdColor,
                PorcGanancia = model.PorcGanancia,
            };

            bool respuesta = await _ProductosService.Actualizar(Productos);

            List<ProductosInsumo> ProductosInsumo = new List<ProductosInsumo>();

            // Agregar los pagos de clientes
            if (model.ProductosInsumos != null && model.ProductosInsumos.Any())
            {
                foreach (var insumo in model.ProductosInsumos)
                {
                    var nuevoInsumo = new ProductosInsumo
                    {
                        Cantidad = insumo.Cantidad,
                        IdInsumo = insumo.IdInsumo,
                        IdProducto = insumo.IdProducto,
                        CostoUnitario = insumo.CostoUnitario,
                        SubTotal = insumo.SubTotal,
                    };
                    ProductosInsumo.Add(nuevoInsumo);
                }
            }

            bool respproductos = await _ProductosService.InsertarInsumos(ProductosInsumo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _ProductosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            Dictionary<string, object> result = new Dictionary<string, object>();

            if (id > 0)
            {

                var model = await _ProductosService.Obtener(id);

                var Producto = new VMProducto
                {
                    Id = model.Id,
                    PorcIva = model.PorcIva,
                    Codigo = model.Codigo,
                    Descripcion = model.Descripcion,
                    IdCategoria = model.IdCategoria,
                    IdColor = model.IdColor,
                    PorcGanancia = model.PorcGanancia,
                };

                var ProductosInsumos = await _ProductosService.ObtenerInsumos(id);


                var insumosJson = ProductosInsumos.Select(p => new VMProductoInsumo
                {
                    Id = p.Id,

                    Cantidad = p.Cantidad,
                    IdInsumo = p.IdInsumo,
                    IdProducto = p.IdProducto,
                    CostoUnitario = p.CostoUnitario,
                    SubTotal = p.SubTotal,
                }).ToList();



                result.Add("Producto", Producto);
                result.Add("Insumos", insumosJson);

                // Serialize with ReferenceHandler.Preserve to handle circular references
                var jsonOptions = new JsonSerializerOptions
                {
                    ReferenceHandler = ReferenceHandler.Preserve
                };

                return Ok(System.Text.Json.JsonSerializer.Serialize(result, jsonOptions));
            }

            return Ok(new { });
        }





        public async Task<IActionResult> NuevoModif(int? id)
        {
            if (id != null)
            {
                ViewBag.data = id;
            }
            return View();
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