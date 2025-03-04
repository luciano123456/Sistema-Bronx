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
    public class PedidoCategoriaRepository : IGenericRepository<PedidosCategoria>
    {

        private readonly SistemaBronxContext _dbcontext;

        public PedidoCategoriaRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(PedidosCategoria model)
        {
            _dbcontext.PedidosCategorias.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            PedidosCategoria model = _dbcontext.PedidosCategorias.First(c => c.Id == id);
            _dbcontext.PedidosCategorias.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(PedidosCategoria model)
        {
            _dbcontext.PedidosCategorias.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PedidosCategoria> Obtener(int id)
        {
            PedidosCategoria model = await _dbcontext.PedidosCategorias.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<PedidosCategoria>> ObtenerTodos()
        {
            IQueryable<PedidosCategoria> query = _dbcontext.PedidosCategorias;
            return await Task.FromResult(query);
        }




    }
}
