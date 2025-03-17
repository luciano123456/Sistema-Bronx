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
    public class PedidoEstadoRepository : IGenericRepository<PedidosEstado>
    {

        private readonly SistemaBronxContext _dbcontext;

        public PedidoEstadoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(PedidosEstado model)
        {
            _dbcontext.PedidosEstados.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            PedidosEstado model = _dbcontext.PedidosEstados.First(c => c.Id == id);
            _dbcontext.PedidosEstados.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(PedidosEstado model)
        {
            _dbcontext.PedidosEstados.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PedidosEstado> Obtener(int id)
        {
            PedidosEstado model = await _dbcontext.PedidosEstados.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<PedidosEstado>> ObtenerTodos()
        {
            IQueryable<PedidosEstado> query = _dbcontext.PedidosEstados;
            return await Task.FromResult(query);
        }




    }
}
