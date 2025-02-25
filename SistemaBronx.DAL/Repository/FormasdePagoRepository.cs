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
    public class FormasdePagoRepository : IGenericRepository<FormasdePago>
    {

        private readonly SistemaBronxContext _dbcontext;

        public FormasdePagoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(FormasdePago model)
        {
            _dbcontext.FormasdePagos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            FormasdePago model = _dbcontext.FormasdePagos.First(c => c.Id == id);
            _dbcontext.FormasdePagos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(FormasdePago model)
        {
            _dbcontext.FormasdePagos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<FormasdePago> Obtener(int id)
        {
            FormasdePago model = await _dbcontext.FormasdePagos.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<FormasdePago>> ObtenerTodos()
        {
            IQueryable<FormasdePago> query = _dbcontext.FormasdePagos;
            return await Task.FromResult(query);
        }




    }
}
