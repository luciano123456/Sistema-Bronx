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
    public class GastosRepository : IGastosRepository<Gasto>
    {

        private readonly SistemaBronxContext _dbcontext;

        public GastosRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Gasto model)
        {
            try
            {
                _dbcontext.Gastos.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                Gasto model = _dbcontext.Gastos.First(c => c.Id == id);
                _dbcontext.Gastos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(Gasto model)
        {
            try
            {
                _dbcontext.Gastos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<Gasto> Obtener(int id)
        {
            try
            {
                Gasto model = await _dbcontext.Gastos.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }


        public async Task<IQueryable<Gasto>> ObtenerTodos(DateTime FechaDesde, DateTime FechaHasta, int Categoria, int Formadepago)
        {
            try
            {
                IQueryable<Gasto> query = _dbcontext.Gastos
                                                         .Where(x => x.Fecha >= FechaDesde
                                                                  && x.Fecha <= FechaHasta
                                                                  && (x.IdCategoria == Categoria || Categoria == -1)
                                                                  && (x.IdFormadePago == Formadepago || Formadepago == -1))
                                                         .OrderByDescending(x => x.Fecha)
                                                         .Include(c => c.IdCategoriaNavigation)
                                                         .Include(c => c.IdFormadePagoNavigation);

                return await Task.FromResult(query);

            }
            catch (Exception ex)
            {
                return null;
            }
        }




    }
}
