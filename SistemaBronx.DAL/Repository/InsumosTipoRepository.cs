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
    public class InsumosTipoRepository : IGenericRepository<InsumosTipo>
    {

        private readonly SistemaBronxContext _dbcontext;

        public InsumosTipoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(InsumosTipo model)
        {
            _dbcontext.InsumosTipos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            InsumosTipo model = _dbcontext.InsumosTipos.First(c => c.Id == id);
            _dbcontext.InsumosTipos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(InsumosTipo model)
        {
            _dbcontext.InsumosTipos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<InsumosTipo> Obtener(int id)
        {
            InsumosTipo model = await _dbcontext.InsumosTipos.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<InsumosTipo>> ObtenerTodos()
        {
            IQueryable<InsumosTipo> query = _dbcontext.InsumosTipos;
            return await Task.FromResult(query);
        }




    }
}
