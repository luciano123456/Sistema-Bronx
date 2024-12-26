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
            _dbcontext.UnidadesDeMedida.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            UnidadesDeMedida model = _dbcontext.UnidadesDeMedida.First(c => c.Id == id);
            _dbcontext.UnidadesDeMedida.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UnidadesDeMedida model)
        {
            _dbcontext.UnidadesDeMedida.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<UnidadesDeMedida> Obtener(int id)
        {
            UnidadesDeMedida model = await _dbcontext.UnidadesDeMedida.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<UnidadesDeMedida>> ObtenerTodos()
        {
            IQueryable<UnidadesDeMedida> query = _dbcontext.UnidadesDeMedida;
            return await Task.FromResult(query);
        }




    }
}
