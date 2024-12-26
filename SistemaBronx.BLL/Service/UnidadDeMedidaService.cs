using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class UnidadDeMedidaService : IUnidadDeMedidaService
    {

        private readonly IGenericRepository<ProductosUnidadesDeMedida> _contactRepo;

        public UnidadDeMedidaService(IGenericRepository<ProductosUnidadesDeMedida> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ProductosUnidadesDeMedida model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ProductosUnidadesDeMedida model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ProductosUnidadesDeMedida> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ProductosUnidadesDeMedida>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
