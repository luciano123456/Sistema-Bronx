using SistemaBronx.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        Task<List<StockMovimiento>> ObtenerMovimientosItem(string tipoItem, int? idProducto, int? idInsumo);

        Task<bool> EliminarDetalleMovimiento(int idDetalle);

        // ============================
        // NUEVO PARA PEDIDOS
        // ============================
        Task<List<StockMovimientosDetalle>> ObtenerDetallesDisponibles(string tipoItem, int? idProducto, int? idInsumo);
        Task<decimal> ObtenerCantidadConsumida(int idDetalleStock);


    }
}
