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

namespace SistemaBronx.DAL.Repository
{
    public class ProductoRepository : IProductoRepository<Producto>
    {

        private readonly SistemaBronxContext _dbcontext;

        public ProductoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Models.Producto model)
        {
            try
            {
                _dbcontext.Productos.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

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

        public async Task<Models.Producto> Obtener(int id)
        {
            try
            {
                Producto model = await _dbcontext.Productos
                    .FirstOrDefaultAsync(p => p.Id == id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
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



        public async Task<Producto> Obtener(int id)
        {
            try
            {
                // Ejecutar el Stored Procedure y obtener el producto con el CostoUnitario calculado
                var producto = _dbcontext.Set<Producto>()
                    .FromSqlRaw("EXEC ObtenerProductoConCostoId @Id", new SqlParameter("@Id", id))
                    .AsEnumerable() // Asegúrate de que el resultado sea IQueryable
                    .FirstOrDefault();  // Ahora puedes usar FirstOrDefaultAsync

                return producto;
            }
            catch (Exception ex)
            {
                // Manejo de errores
                return null;
            }
        }




        public async Task<List<Producto>> ObtenerTodos()
        {
            try
            {
                // Ejecutar el Stored Procedure y mapear los resultados
                var productos = await _dbcontext.Set<Producto>()
                    .FromSqlRaw("EXEC ObtenerProductosConCosto")
                    .ToListAsync();

                    if (insumoExistente != null)
                    {
                        // Si el insumo existe, actualizamos sus propiedades
                        insumoExistente.CostoUnitario = p.CostoUnitario;
                        insumoExistente.SubTotal = p.SubTotal;
                        insumoExistente.Cantidad = p.Cantidad;
                    }
                    else
                    {
                        // Si el insumo no existe, lo agregamos a la base de datos
                        _dbcontext.ProductosInsumos.Add(p);
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
                    .Include(c => c.IdProductoNavigation)
                    .Include(c => c.IdInsumoNavigation)
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
