using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public class InsumoRepository : IInsumoRepository<Insumo>
    {

        private readonly SistemaBronxContext _dbcontext;

        public InsumoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Actualizar(Insumo model)
        {
            try
            {
                _dbcontext.Insumos.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en Actualizar: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                Insumo model = _dbcontext.Insumos.First(c => c.Id == id);
                _dbcontext.Insumos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en Eliminar: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> Insertar(Insumo model)
        {
            try
            {
                _dbcontext.Insumos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en Insertar: {ex.Message}");
                return false;
            }
        }

        public async Task<Insumo> Obtener(int id)
        {
            try
            {
                var model = await _dbcontext.Insumos
                    .Include(c => c.IdUnidadMedidaNavigation)
                    .Include(c => c.IdTipoNavigation)
                    .Include(c => c.IdProveedorNavigation)
                    .Include(c => c.IdCategoriaNavigation)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (model == null)
                    return null;

                // 🔥 TRAER STOCK
                var stock = await _dbcontext.StockSaldos
                    .Where(s => s.TipoItem == "I" && s.IdInsumo == id)
                    .Select(s => s.CantidadActual)
                    .FirstOrDefaultAsync();

                model.Stock = stock;

                return model;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en Obtener: {ex.Message}");
                return null;
            }
        }


        public async Task<IQueryable<Insumo>> ObtenerTodos()
        {
            try
            {
                var insumos = await _dbcontext.Insumos
                    .Include(c => c.IdUnidadMedidaNavigation)
                    .Include(c => c.IdTipoNavigation)
                    .Include(c => c.IdProveedorNavigation)
                    .Include(c => c.IdCategoriaNavigation)
                    .ToListAsync();

                // 🔥 TRAER STOCK DE UNA
                var stocks = await _dbcontext.StockSaldos
                    .Where(s => s.TipoItem == "I")
                    .ToDictionaryAsync(s => s.IdInsumo, s => s.CantidadActual);

                foreach (var insumo in insumos)
                {
                    if (insumo.Id != 0 && stocks.TryGetValue(insumo.Id, out var stock))
                        insumo.Stock = stock;
                    else
                        insumo.Stock = 0;
                }

                return insumos.AsQueryable();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en ObtenerTodos: {ex.Message}");
                return null;
            }
        }


    }
}
