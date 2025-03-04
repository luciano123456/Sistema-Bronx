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
    public class PedidoTipoRepository : IGenericRepository<PedidosTipo>
    {

        private readonly SistemaBronxContext _dbcontext;

        public PedidoTipoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(PedidosTipo model)
        {
            _dbcontext.PedidosTipos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            PedidosTipo model = _dbcontext.PedidosTipos.First(c => c.Id == id);
            _dbcontext.PedidosTipos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(PedidosTipo model)
        {
            _dbcontext.PedidosTipos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PedidosTipo> Obtener(int id)
        {
            PedidosTipo model = await _dbcontext.PedidosTipos.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<PedidosTipo>> ObtenerTodos()
        {
            IQueryable<PedidosTipo> query = _dbcontext.PedidosTipos;
            return await Task.FromResult(query);
        }




    }
}
