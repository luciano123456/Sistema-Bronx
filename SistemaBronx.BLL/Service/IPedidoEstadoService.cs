using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IPedidoEstadoService
    {
        Task<bool> Insertar(PedidosEstado model);
        Task<bool> Actualizar(PedidosEstado model);
        Task<bool> Eliminar(int id);
        Task<PedidosEstado> Obtener(int id);
        Task<IQueryable<PedidosEstado>> ObtenerTodos();
    }
}
