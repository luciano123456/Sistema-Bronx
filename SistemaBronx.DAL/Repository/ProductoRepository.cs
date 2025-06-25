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
                                IdCategoriaNavigation = new ProductosCategoria
                                {
                                    Id = result.GetInt32(result.GetOrdinal("CategoriaId")),
                                    Nombre = result.GetString(result.GetOrdinal("CategoriaNombre"))
                                }
                            };
                        }
                    }
                }

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


        public async Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto)
        {
            try
            {

                List<ProductosInsumo> productos = _dbcontext.ProductosInsumos
                    .Include(c => c.IdInsumoNavigation)
                    .Include(c => c.IdInsumoNavigation.IdCategoriaNavigation)
                    .Include(c => c.IdInsumoNavigation.IdTipoNavigation)
                    .Include(c => c.IdInsumoNavigation.IdProveedorNavigation)
                    .Where(c => c.IdProducto == idProducto).ToList();
                return productos;

            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }


    }
}
