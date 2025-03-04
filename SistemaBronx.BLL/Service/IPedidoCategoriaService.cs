using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IPedidoCategoriaService
    {
        Task<bool> Insertar(PedidosCategoria model);
        Task<bool> Actualizar(PedidosCategoria model);
        Task<bool> Eliminar(int id);
        Task<PedidosCategoria> Obtener(int id);
        Task<IQueryable<PedidosCategoria>> ObtenerTodos();
    }
}
