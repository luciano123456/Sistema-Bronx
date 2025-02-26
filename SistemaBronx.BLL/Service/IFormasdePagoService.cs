using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IFormasdePagoService
    {
        Task<bool> Insertar(FormasdePago model);
        Task<bool> Actualizar(FormasdePago model);
        Task<bool> Eliminar(int id);
        Task<FormasdePago> Obtener(int id);
        Task<IQueryable<FormasdePago>> ObtenerTodos();
    }
}
