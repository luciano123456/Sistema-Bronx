using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IPedidoTipoService
    {
        Task<bool> Insertar(PedidosTipo model);
        Task<bool> Actualizar(PedidosTipo model);
        Task<bool> Eliminar(int id);
        Task<PedidosTipo> Obtener(int id);
        Task<IQueryable<PedidosTipo>> ObtenerTodos();
    }
}
