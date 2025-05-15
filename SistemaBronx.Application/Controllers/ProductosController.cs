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
                    Nombre = c.Nombre,
                    PorcGanancia = (decimal)c.PorcGanancia,
                    PorcIva = c.PorcIva,
                    IdCategoria = c.IdCategoria,
                    CostoUnitario = c.CostoUnitario,
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

        [HttpGet]
        public async Task<IActionResult> ListaInsumosProducto(int IdProducto)
        {
            var Insumos = await _ProductosService.ObtenerInsumos(IdProducto);

            var lista = Insumos.Select(p => new VMProductoInsumo
            {
                Nombre = p.IdInsumoNavigation.Descripcion,
                Cantidad = p.Cantidad,
                IdInsumo = p.IdInsumo,
                IdProducto = p.IdProducto,
                CostoUnitario = (decimal)p.IdInsumoNavigation.PrecioVenta,
                SubTotal = (decimal)p.IdInsumoNavigation.PrecioVenta * p.Cantidad
            }).ToList();

            return Ok(lista);
        }




        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProducto model)
        {
            try
            {
                var producto = new Producto
                {
                    Id = model.Id,
                    PorcIva = model.PorcIva,
                    Nombre = model.Nombre,
                    IdCategoria = model.IdCategoria,
                    PorcGanancia = model.PorcGanancia,
                    CostoUnitario = model.CostoUnitario
                };

                List<ProductosInsumo> insumos = model.ProductosInsumos?.Select(insumo => new ProductosInsumo
                {
                    IdInsumo = insumo.IdInsumo,
                    Cantidad = insumo.Cantidad
                }).ToList() ?? new List<ProductosInsumo>();

                bool resultado = await _ProductosService.Insertar(producto, insumos);

                if (!resultado)
                    return BadRequest(new { mensaje = "Error al insertar el producto y sus insumos." });

                return Ok(new { valor = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Ocurrió un error inesperado.", error = ex.Message });
            }
        }


        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProducto model)
        {
            var Productos = new Producto
            {
                Id = model.Id,
                PorcIva = model.PorcIva,
                Nombre = model.Nombre,
                IdCategoria = model.IdCategoria,
                PorcGanancia = model.PorcGanancia,
            };

           

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
                    };
                    ProductosInsumo.Add(nuevoInsumo);
                }
            }

            bool respuesta = await _ProductosService.Actualizar(Productos, ProductosInsumo);


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
                    Nombre = model.Nombre,
                    IdCategoria = model.IdCategoria,
                    PorcGanancia = (decimal)model.PorcGanancia,
                    CostoUnitario = model.CostoUnitario,
                    Categoria = model.IdCategoriaNavigation.Nombre
                };

                var ProductosInsumos = await _ProductosService.ObtenerInsumos(id);


                var insumosJson = ProductosInsumos.Select(p => new VMProductoInsumo
                {
                    Nombre = p.IdInsumoNavigation.Descripcion,
                    Cantidad = p.Cantidad,
                    IdInsumo = p.IdInsumo,
                    IdProducto = p.IdProducto,
                    CostoUnitario = (decimal)p.IdInsumoNavigation.PrecioVenta,
                    SubTotal = (decimal)p.IdInsumoNavigation.PrecioVenta * p.Cantidad,
                    Categoria = p.IdInsumoNavigation.IdCategoriaNavigation.Nombre,
                    IdCategoria = p.IdInsumoNavigation.IdCategoriaNavigation.Id,
                    Color = "",
                    IdColor = 0,
                    IdEstado = 1,
                    Estado = "Pedir",
                    Especificacion = "",
                    Comentarios = "",
                    IdTipo = p.IdInsumoNavigation.IdTipo,
                    Tipo = p.IdInsumoNavigation.IdTipoNavigation.Nombre,
                    IdUnidadMedida = p.IdInsumoNavigation.IdUnidadMedida,
                    IdProveedor = (int)p.IdInsumoNavigation.IdProveedor
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