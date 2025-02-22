using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaBronx.DAL.Repository
{
    public class UnidadDeMedidaRepository : IGenericRepository<UnidadesDeMedida>
    {

        private readonly SistemaBronxContext _dbcontext;

        public UnidadDeMedidaRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(UnidadesDeMedida model)
        {
            try
            {
                _dbcontext.UnidadesDeMedida.Update(model);
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
                UnidadesDeMedida model = _dbcontext.UnidadesDeMedida.First(c => c.Id == id);
                _dbcontext.UnidadesDeMedida.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(UnidadesDeMedida model)
        {
            try
            {
                _dbcontext.UnidadesDeMedida.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<UnidadesDeMedida> Obtener(int id)
        {
            try
            {
                UnidadesDeMedida model = await _dbcontext.UnidadesDeMedida.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<IQueryable<UnidadesDeMedida>> ObtenerTodos()
        {
            try
            {
                IQueryable<UnidadesDeMedida> query = _dbcontext.UnidadesDeMedida;
                return await Task.FromResult(query);
            }
            catch (Exception ex)
            {
                return null;
            }
        }




    }
}
