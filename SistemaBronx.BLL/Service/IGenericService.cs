using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IGenericService<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(TEntityModel model);
        Task<bool> Actualizar(TEntityModel model);
        Task<bool> Eliminar(int id);
        Task<TEntityModel> Obtener(int id);
        Task<IQueryable<TEntityModel>> ObtenerTodos();
    }
}
