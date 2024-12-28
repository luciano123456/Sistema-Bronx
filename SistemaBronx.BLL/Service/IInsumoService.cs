using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IInsumoService
    {
        Task<bool> Insertar(Insumo model);
        Task<bool> Actualizar(Insumo model);
        Task<bool> Eliminar(int id);
        Task<Insumo> Obtener(int id);
        Task<IQueryable<Insumo>> ObtenerTodos();
    }
}
