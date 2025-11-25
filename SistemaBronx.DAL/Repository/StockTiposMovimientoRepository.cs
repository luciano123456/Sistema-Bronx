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
    public class StockTiposMovimientoRepository : IGenericRepository<StockTiposMovimiento>
    {

        private readonly SistemaBronxContext _dbcontext;

        public StockTiposMovimientoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(StockTiposMovimiento model)
        {
            _dbcontext.StockTiposMovimientos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            StockTiposMovimiento model = _dbcontext.StockTiposMovimientos.First(c => c.Id == id);
            _dbcontext.StockTiposMovimientos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(StockTiposMovimiento model)
        {
            _dbcontext.StockTiposMovimientos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<StockTiposMovimiento> Obtener(int id)
        {
            StockTiposMovimiento model = await _dbcontext.StockTiposMovimientos.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<StockTiposMovimiento>> ObtenerTodos()
        {
            IQueryable<StockTiposMovimiento> query = _dbcontext.StockTiposMovimientos;
            return await Task.FromResult(query);
        }




    }
}
