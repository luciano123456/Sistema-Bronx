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
    public class ClienteRepository : IGenericRepository<Cliente>
    {

        private readonly SistemaBronxContext _dbcontext;

        public ClienteRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            _dbcontext.Clientes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cliente model = _dbcontext.Clientes.First(c => c.Id == id);
            _dbcontext.Clientes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Cliente model)
        {
            _dbcontext.Clientes.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Cliente> Obtener(int id)
        {
            Cliente model = await _dbcontext.Clientes.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            IQueryable<Cliente> query = _dbcontext.Clientes.Include(c => c.IdProvinciaNavigation);
            return await Task.FromResult(query);
        }




    }
}
