using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IGenericRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(TEntityModel model);
        Task<bool> Actualizar(TEntityModel model);
        Task<bool> Eliminar(int id);
        Task<TEntityModel> Obtener(int id);
        Task<IQueryable<TEntityModel>> ObtenerTodos();
       
    }
}
