using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IGastosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Gasto model);
        Task<bool> Insertar(Gasto model);
        Task<Gasto> Obtener(int id);
        Task<IQueryable<Gasto>> ObtenerTodos(DateTime FechaDesde, DateTime FechaHasta, int Categoria, int Formadepago);
    }
}
