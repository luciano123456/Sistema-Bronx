using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IStockTiposMovimientoService
    {
        Task<bool> Insertar(StockTiposMovimiento model);
        Task<bool> Actualizar(StockTiposMovimiento model);
        Task<bool> Eliminar(int id);
        Task<StockTiposMovimiento> Obtener(int id);
        Task<IQueryable<StockTiposMovimiento>> ObtenerTodos();
    }
}
