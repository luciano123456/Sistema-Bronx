using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IInsumoRepository<TEntityModel> where TEntityModel : class
    {
        Task<ResultadoEliminacion> Eliminar(int id, bool cascada = false);
        Task<bool> Actualizar(Insumo model);
        Task<bool> Insertar(Insumo model);
        Task<Insumo> Obtener(int id);
        Task<IQueryable<Insumo>> ObtenerTodos();
    }
}
