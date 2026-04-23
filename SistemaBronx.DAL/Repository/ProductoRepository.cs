using Microsoft.EntityFrameworkCore;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using SistemaBronx.DAL.DataContext;
using Microsoft.Data.SqlClient;
using System.Data;

namespace SistemaBronx.DAL.Repository
{
    public class ProductoRepository : IProductoRepository<Producto>
    {

        private readonly SistemaBronxContext _dbcontext;

        public ProductoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        public async Task<decimal> ObtenerStockSaldoProductoAsync(int idProducto, int? idColorFiltro = null)
        {
            var q = _dbcontext.StockSaldos.Where(s => s.TipoItem == "P" && s.IdProducto == idProducto);
            if (idColorFiltro.HasValue)
                q = q.Where(s => (s.IdColor ?? 0) == idColorFiltro.Value);
            return await q.SumAsync(s => (decimal?)s.CantidadActual) ?? 0m;
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                Models.Producto model = _dbcontext.Productos.First(c => c.Id == id);
                _dbcontext.Productos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(Producto model, List<ProductosInsumo> insumos)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // Insertar el producto
                _dbcontext.Productos.Add(model);
                await _dbcontext.SaveChangesAsync();

                if (insumos != null && insumos.Any())
                {
                    foreach (var p in insumos)
                    {
                        p.IdProducto = model.Id; // Asignar el ID del producto recién insertado

                        var insumoExistente = await _dbcontext.ProductosInsumos
                            .FirstOrDefaultAsync(x => x.IdProducto == p.IdProducto && x.IdInsumo == p.IdInsumo);

                        if (insumoExistente != null)
                        {
                            insumoExistente.Cantidad = p.Cantidad;
                        }
                        else
                        {
                            _dbcontext.ProductosInsumos.Add(p);
                        }
                    }

                    var insumosIdsModelo = insumos.Select(p => p.IdProducto).Distinct().ToList();
                    var insumosAEliminar = await _dbcontext.ProductosInsumos
                        .Where(x => insumosIdsModelo.Contains(x.IdProducto)
                                && !insumos.Select(p => p.IdInsumo).Contains(x.IdInsumo)
                                && x.Id != 0)
                        .ToListAsync();

                    _dbcontext.ProductosInsumos.RemoveRange(insumosAEliminar);
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> Actualizar(Producto model, List<ProductosInsumo> insumos)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // Obtener el producto existente
                var productoExistente = await _dbcontext.Productos
                    .Include(p => p.ProductosInsumos)
                    .FirstOrDefaultAsync(p => p.Id == model.Id);

                if (productoExistente == null)
                {
                    // Manejar el caso donde el producto no existe
                    return false;
                }

                // Actualizar las propiedades del producto
                productoExistente.Nombre = model.Nombre;
                productoExistente.PorcGanancia = model.PorcGanancia;
                productoExistente.PorcIva = model.PorcIva;
                productoExistente.IdCategoria = model.IdCategoria;
                // Actualiza otras propiedades según sea necesario

                // Actualizar los insumos asociados
                if (insumos != null && insumos.Any())
                {
                    // Obtener los Ids de los insumos enviados en el modelo
                    var insumosIdsModelo = insumos.Select(i => i.IdInsumo).ToList();

                    // Identificar insumos para eliminar
                    var insumosAEliminar = productoExistente.ProductosInsumos
                        .Where(pi => !insumosIdsModelo.Contains(pi.IdInsumo))
                        .ToList();

                    // Eliminar insumos que ya no están asociados
                    foreach (var insumo in insumosAEliminar)
                    {
                        _dbcontext.ProductosInsumos.Remove(insumo);
                    }

                    // Actualizar o agregar insumos
                    foreach (var insumoModel in insumos)
                    {
                        var insumoExistente = productoExistente.ProductosInsumos
                            .FirstOrDefault(pi => pi.IdInsumo == insumoModel.IdInsumo);

                        if (insumoExistente != null)
                        {
                            // Actualizar cantidad del insumo existente
                            insumoExistente.Cantidad = insumoModel.Cantidad;
                        }
                        else
                        {
                            // Agregar nuevo insumo
                            var nuevoInsumo = new ProductosInsumo
                            {
                                IdProducto = model.Id,
                                IdInsumo = insumoModel.IdInsumo,
                                Cantidad = insumoModel.Cantidad
                            };
                            productoExistente.ProductosInsumos.Add(nuevoInsumo);
                        }
                    }
                }
                else
                {
                    // Si no se proporcionaron insumos, eliminar todos los asociados
                    _dbcontext.ProductosInsumos.RemoveRange(productoExistente.ProductosInsumos);
                }

                // Guardar cambios en la base de datos
                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }


        public async Task<Producto> Obtener(int id)
        {
            try
            {
                Producto producto = null;

                // Crear el comando para ejecutar el procedimiento almacenado
                using (var command = _dbcontext.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = "ObtenerProductoConCostoId";
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.Add(new SqlParameter("@Id", id));

                    _dbcontext.Database.OpenConnection();

                    // Ejecutar el comando y leer los resultados
                    using (var result = await command.ExecuteReaderAsync())
                    {
                        if (await result.ReadAsync())
                        {
                            producto = new Producto
                            {
                                Id = result.GetInt32(result.GetOrdinal("Id")),
                                Nombre = result.GetString(result.GetOrdinal("Nombre")),
                                PorcGanancia = result.IsDBNull(result.GetOrdinal("PorcGanancia")) ? (decimal?)null : result.GetDecimal(result.GetOrdinal("PorcGanancia")),
                                PorcIva = result.IsDBNull(result.GetOrdinal("PorcIva")) ? (decimal?)null : result.GetDecimal(result.GetOrdinal("PorcIva")),
                                IdCategoria = result.IsDBNull(result.GetOrdinal("IdCategoria")) ? (int?)null : result.GetInt32(result.GetOrdinal("IdCategoria")),
                                CostoUnitario = result.GetDecimal(result.GetOrdinal("CostoUnitario")),
                                Stock = result.GetDecimal(result.GetOrdinal("Stock")),
                                IdCategoriaNavigation = new ProductosCategoria
                                {
                                    Id = result.GetInt32(result.GetOrdinal("CategoriaId")),
                                    Nombre = result.GetString(result.GetOrdinal("CategoriaNombre"))
                                }
                            };
                        }
                    }
                }

                if (producto != null)
                    producto.Stock = await ObtenerStockSaldoProductoAsync(producto.Id, null);

                return producto;
            }
            catch (Exception ex)
            {
                // Manejo de errores
                throw new Exception("Error al obtener el producto con costo y su categoría", ex);
            }
            finally
            {
                _dbcontext.Database.CloseConnection();
            }
        }




        public async Task<List<Producto>> ObtenerTodos()
        {
            try
            {
                var productos = new List<Producto>();

                // Ejecutar el procedimiento almacenado y leer los resultados
                using (var command = _dbcontext.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = "ObtenerProductosConCosto";
                    command.CommandType = CommandType.StoredProcedure;

                    _dbcontext.Database.OpenConnection();

                    using (var result = await command.ExecuteReaderAsync())
                    {
                        while (await result.ReadAsync())
                        {
                            var producto = new Producto
                            {
                                Id = result.GetInt32(result.GetOrdinal("Id")),
                                Nombre = result.GetString(result.GetOrdinal("Nombre")),
                                PorcGanancia = result.IsDBNull(result.GetOrdinal("PorcGanancia")) ? (decimal?)null : result.GetDecimal(result.GetOrdinal("PorcGanancia")),
                                PorcIva = result.IsDBNull(result.GetOrdinal("PorcIva")) ? (decimal?)null : result.GetDecimal(result.GetOrdinal("PorcIva")),
                                IdCategoria = result.IsDBNull(result.GetOrdinal("IdCategoria")) ? (int?)null : result.GetInt32(result.GetOrdinal("IdCategoria")),
                                CostoUnitario = result.GetDecimal(result.GetOrdinal("CostoUnitario")),
                                Stock = result.GetDecimal(result.GetOrdinal("Stock")),
                                IdCategoriaNavigation = new ProductosCategoria
                                {
                                    Id = result.GetInt32(result.GetOrdinal("CategoriaId")),
                                    Nombre = result.GetString(result.GetOrdinal("CategoriaNombre"))
                                }
                            };

                            productos.Add(producto);
                        }
                    }
                }

                if (productos.Count > 0)
                {
                    var ids = productos.Select(p => p.Id).ToList();
                    var sums = await _dbcontext.StockSaldos
                        .Where(s => s.TipoItem == "P" && s.IdProducto.HasValue && ids.Contains(s.IdProducto.Value))
                        .GroupBy(s => s.IdProducto!.Value)
                        .Select(g => new { Id = g.Key, Total = g.Sum(x => x.CantidadActual) })
                        .ToDictionaryAsync(x => x.Id, x => x.Total);
                    foreach (var p in productos)
                        p.Stock = sums.TryGetValue(p.Id, out var t) ? t : 0m;
                }

                return productos;
            }
            catch (Exception ex)
            {
                // Manejo de errores
                throw new Exception("Error al obtener los productos con costo y sus categorías", ex);
            }
        }





        public async Task<IQueryable<ProductosCategoria>> ObtenerCategorias()
        {
            try
            {
                IQueryable<ProductosCategoria> query = _dbcontext.ProductosCategorias;
                return await Task.FromResult(query);
            }
            catch (Exception ex)
            {
                return null;
            }
        }



        public async Task<bool> ActualizarInsumos(List<ProductosInsumo> insumos)
        {
            try
            {
                foreach (ProductosInsumo p in insumos)
                {
                    _dbcontext.ProductosInsumos.Update(p);
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }


        public async Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto, int? idColorFiltro = null)
        {
            try
            {
                var productos = await _dbcontext.ProductosInsumos
                    .Include(c => c.IdInsumoNavigation)
                        .ThenInclude(i => i.IdCategoriaNavigation)
                    .Include(c => c.IdInsumoNavigation)
                        .ThenInclude(i => i.IdTipoNavigation)
                    .Include(c => c.IdInsumoNavigation)
                        .ThenInclude(i => i.IdProveedorNavigation)
                    .Where(c => c.IdProducto == idProducto)
                    .ToListAsync();

                var idsInsumos = productos
                    .Where(x => x.IdInsumoNavigation != null)
                    .Select(x => x.IdInsumoNavigation.Id)
                    .Distinct()
                    .ToList();

                var qSaldo = _dbcontext.StockSaldos
                    .Where(s => s.TipoItem == "I" && s.IdInsumo.HasValue && idsInsumos.Contains(s.IdInsumo.Value));

                if (idColorFiltro.HasValue)
                    qSaldo = qSaldo.Where(s => (s.IdColor ?? 0) == idColorFiltro.Value);

                var stocksPorInsumo = await qSaldo
                    .GroupBy(s => s.IdInsumo!.Value)
                    .Select(g => new { IdInsumo = g.Key, Total = g.Sum(x => x.CantidadActual) })
                    .ToDictionaryAsync(x => x.IdInsumo, x => x.Total);

                foreach (var item in productos)
                {
                    var insumo = item.IdInsumoNavigation;
                    if (insumo == null) continue;
                    insumo.Stock = stocksPorInsumo.TryGetValue(insumo.Id, out var st) ? st : 0m;
                }

                return productos;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        public async Task<bool> ActualizarSoloProducto(Producto model)
        {
            try
            {
                var productoExistente = await _dbcontext.Productos
                    .FirstOrDefaultAsync(p => p.Id == model.Id);

                if (productoExistente == null)
                    return false;

                // Solo campos de cabecera / configuración
                productoExistente.Nombre = model.Nombre;
                productoExistente.IdCategoria = model.IdCategoria;
                productoExistente.PorcGanancia = model.PorcGanancia;
                productoExistente.PorcIva = model.PorcIva;

                // Si querés que la edición en línea también pueda modificar el costo unitario:
                // (si no, borrá esta línea)
                productoExistente.CostoUnitario = model.CostoUnitario;

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>
        /// Catálogo modal pedidos: PT por producto×color con saldo tipo P &gt; 0; fabricación = una fila por producto
        /// cuya suma de saldos PT en todos los colores es 0 (el color no va en el listado).
        /// </summary>
        public async Task<CatalogoPedidoModalResult> ObtenerCatalogoPedidoModalAsync()
        {
            var productosRaw = await ObtenerTodos();
            var productos = productosRaw
                .GroupBy(p => p.Id)
                .Select(g => g.First())
                .ToList();

            var colores = (await _dbcontext.Colores
                .AsNoTracking()
                .Where(c => c.Id > 0)
                .OrderBy(c => c.Nombre)
                .ToListAsync())
                .GroupBy(c => c.Id)
                .Select(g => g.First())
                .ToList();

            var saldos = await _dbcontext.StockSaldos
                .AsNoTracking()
                .Where(s => s.TipoItem == "P" && s.IdProducto != null)
                .Select(s => new { IdProducto = s.IdProducto!.Value, IdColor = s.IdColor ?? 0, s.CantidadActual })
                .ToListAsync();

            var map = saldos
                .GroupBy(x => (x.IdProducto, x.IdColor))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.CantidadActual));

            var conStock = new List<ProductoCatalogoPedidoLinea>();
            var fabricacion = new List<ProductoCatalogoPedidoLinea>();

            foreach (var p in productos)
            {
                decimal sumaPt = 0m;
                foreach (var c in colores)
                {
                    var st = map.TryGetValue((p.Id, c.Id), out var v) ? v : 0m;
                    sumaPt += st;
                    if (st > 0m)
                    {
                        conStock.Add(new ProductoCatalogoPedidoLinea
                        {
                            Id = p.Id,
                            Nombre = p.Nombre,
                            IdCategoria = p.IdCategoria ?? 0,
                            Categoria = p.IdCategoriaNavigation?.Nombre ?? "",
                            PorcGanancia = p.PorcGanancia ?? 0m,
                            PorcIva = p.PorcIva,
                            CostoUnitario = p.CostoUnitario,
                            IdColor = c.Id,
                            Color = c.Nombre,
                            Stock = st
                        });
                    }
                }

                if (sumaPt <= 0m)
                {
                    fabricacion.Add(new ProductoCatalogoPedidoLinea
                    {
                        Id = p.Id,
                        Nombre = p.Nombre,
                        IdCategoria = p.IdCategoria ?? 0,
                        Categoria = p.IdCategoriaNavigation?.Nombre ?? "",
                        PorcGanancia = p.PorcGanancia ?? 0m,
                        PorcIva = p.PorcIva,
                        CostoUnitario = p.CostoUnitario,
                        IdColor = 0,
                        Color = "\u2014",
                        Stock = 0m
                    });
                }
            }

            var conStockDistinct = conStock
                .GroupBy(x => new { x.Id, x.IdColor })
                .Select(g => g.First())
                .ToList();

            return new CatalogoPedidoModalResult
            {
                LineasConStock = conStockDistinct,
                LineasFabricacion = fabricacion
            };
        }


    }
}
