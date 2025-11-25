using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class StockTiposMovimientoService : IStockTiposMovimientoService
    {

        private readonly IGenericRepository<StockTiposMovimiento> _contactRepo;

        public StockTiposMovimientoService(IGenericRepository<StockTiposMovimiento> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(StockTiposMovimiento model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(StockTiposMovimiento model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<StockTiposMovimiento> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<StockTiposMovimiento>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
