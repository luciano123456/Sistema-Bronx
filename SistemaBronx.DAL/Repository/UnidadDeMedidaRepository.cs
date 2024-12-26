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
    public class UnidadDeMedidaRepository : IGenericRepository<ProductosUnidadesDeMedida>
    {

        private readonly SistemaBronxContext _dbcontext;

        public UnidadDeMedidaRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(ProductosUnidadesDeMedida model)
        {
            _dbcontext.ProductosUnidadesDeMedida.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            ProductosUnidadesDeMedida model = _dbcontext.ProductosUnidadesDeMedida.First(c => c.Id == id);
            _dbcontext.ProductosUnidadesDeMedida.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ProductosUnidadesDeMedida model)
        {
            _dbcontext.ProductosUnidadesDeMedida.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<ProductosUnidadesDeMedida> Obtener(int id)
        {
            ProductosUnidadesDeMedida model = await _dbcontext.ProductosUnidadesDeMedida.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<ProductosUnidadesDeMedida>> ObtenerTodos()
        {
            IQueryable<ProductosUnidadesDeMedida> query = _dbcontext.ProductosUnidadesDeMedida;
            return await Task.FromResult(query);
        }




    }
}
