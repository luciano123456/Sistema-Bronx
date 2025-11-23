using System.Collections.Generic;
using System.Threading.Tasks;
using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class StockService : IStockService
    {
        private readonly IStockRepository _repo;

        public StockService(IStockRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> RegistrarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles)
            => _repo.RegistrarMovimiento(mov, detalles);

        public Task<bool> ModificarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles)
            => _repo.ModificarMovimiento(mov, detalles);

        public Task<bool> AnularMovimiento(int idMovimiento)
            => _repo.AnularMovimiento(idMovimiento);

        public Task<bool> EliminarMovimiento(int idMovimiento)
            => _repo.EliminarMovimiento(idMovimiento);

        public Task<List<StockMovimiento>> ObtenerMovimientos()
            => _repo.ObtenerMovimientos();

        public Task<StockMovimiento?> ObtenerMovimiento(int id)
            => _repo.ObtenerMovimiento(id);

        public Task<List<StockSaldo>> ObtenerSaldos()
            => _repo.ObtenerSaldos();

        public Task<StockSaldo?> ObtenerSaldoItem(string tipoItem, int? idProducto, int? idInsumo)
            => _repo.ObtenerSaldoItem(tipoItem, idProducto, idInsumo);
    }
}
