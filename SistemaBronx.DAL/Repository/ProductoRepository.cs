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

        public async Task<bool> Insertar(Models.Producto model)
        {
            try
            {
                _dbcontext.Productos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<Models.Producto> Obtener(int id)
        {
            try
            {
                Producto model = await _dbcontext.Productos
                    .Include(p => p.ProductosInsumos)
                    .FirstOrDefaultAsync(p => p.Id == id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }

        }

        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            try
            {
                IQueryable<Producto> query = _dbcontext.Productos;
                return await Task.FromResult(query);
            }
            catch (Exception ex)
            {
                return null;
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

        public async Task<bool> InsertarInsumos(List<ProductosInsumo> insumos)
        {
            try
            {
                foreach (ProductosInsumo p in insumos)
                {
                    // Verificar si el insumo ya existe, por ejemplo, por Idinsumo y IdPedido
                    var insumoExistente = await _dbcontext.ProductosInsumos
                                                             .FirstOrDefaultAsync(x => x.IdProducto == p.IdProducto && x.IdInsumo == p.IdInsumo);

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


                var insumosIdsModelo = insumos.Select(p => p.IdProducto).Distinct().ToList();
                var insumosAEliminar = await _dbcontext.ProductosInsumos
                                                          .Where(x => insumosIdsModelo.Contains(x.IdProducto)
                                                                  && !insumos.Select(p => p.IdInsumo).Contains(x.IdInsumo)
                                                                  && x.Id != 0)
                                                          .ToListAsync();


                foreach (var insumo in insumosAEliminar)
                {
                    _dbcontext.ProductosInsumos.Remove(insumo);
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
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
