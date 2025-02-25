using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IGastoFormasdePagoService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(FormasdePago model);
        Task<bool> Insertar(FormasdePago model);

        Task<FormasdePago> Obtener(int id);

        Task<IQueryable<FormasdePago>> ObtenerTodos();
    }

}
