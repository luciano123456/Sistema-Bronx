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
                // Usamos FirstOrDefaultAsync para realizar una consulta con los Includes
                Insumo model = await _dbcontext.Insumos
                    .Include(c => c.IdUnidadMedidaNavigation)
                    .Include(c => c.IdTipoNavigation)
                    .Include(c => c.IdProveedorNavigation)
                    .Include(c => c.IdCategoriaNavigation)
                    .FirstOrDefaultAsync(c => c.Id == id); // Realizamos la búsqueda por ID

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
                IQueryable<Insumo> query = _dbcontext.Insumos
                    .Include(c => c.IdUnidadMedidaNavigation)
                    .Include(c => c.IdTipoNavigation)
                    .Include(c => c.IdProveedorNavigation)
                    .Include(c => c.IdCategoriaNavigation);
                return await Task.FromResult(query);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en ObtenerTodos: {ex.Message}");
                return null;
            }
        }

       
    }
}
