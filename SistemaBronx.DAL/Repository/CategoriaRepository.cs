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
    public class CategoriaRepository : IGenericRepository<ProductosCategoria>
    {

        private readonly SistemaBronxContext _dbcontext;

        public CategoriaRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(ProductosCategoria model)
        {
            _dbcontext.ProductosCategorias.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            ProductosCategoria model = _dbcontext.ProductosCategorias.First(c => c.Id == id);
            _dbcontext.ProductosCategorias.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ProductosCategoria model)
        {
            _dbcontext.ProductosCategorias.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<ProductosCategoria> Obtener(int id)
        {
            ProductosCategoria model = await _dbcontext.ProductosCategorias.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<ProductosCategoria>> ObtenerTodos()
        {
            IQueryable<ProductosCategoria> query = _dbcontext.ProductosCategorias;
            return await Task.FromResult(query);
        }




    }
}
