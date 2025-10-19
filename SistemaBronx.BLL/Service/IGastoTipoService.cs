using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IGastoTipoService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosTipo model);
        Task<bool> Insertar(GastosTipo model);

        Task<GastosTipo> Obtener(int id);

        Task<IQueryable<GastosTipo>> ObtenerTodos();
    }

}
