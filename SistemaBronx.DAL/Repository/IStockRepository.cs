using System.Collections.Generic;
using System.Threading.Tasks;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.Repository
{
    public interface IStockRepository
    {
        Task<bool> RegistrarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles);
        Task<bool> ModificarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles);

        Task<bool> AnularMovimiento(int idMovimiento);
        Task<bool> RestaurarMovimiento(int idMovimiento);
        Task<bool> EliminarMovimiento(int idMovimiento);

        Task<List<StockMovimiento>> ObtenerMovimientos();
        Task<StockMovimiento?> ObtenerMovimiento(int id);

        Task<List<StockSaldo>> ObtenerSaldos();
        Task<StockSaldo?> ObtenerSaldoItem(string tipoItem, int? idProducto, int? idInsumo);

        // Historial por ítem
        Task<List<StockMovimiento>> ObtenerMovimientosItem(string tipoItem, int? idProducto, int? idInsumo);

        // *** NUEVO: eliminar SOLO un detalle ***
        Task<bool> EliminarDetalleMovimiento(int idDetalle);
    }

}
