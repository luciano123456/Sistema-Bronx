using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class UnidadDeMedidaService : IUnidadDeMedidaService
    {

        private readonly IGenericRepository<UnidadesDeMedida> _contactRepo;

        public UnidadDeMedidaService(IGenericRepository<UnidadesDeMedida> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(UnidadesDeMedida model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(UnidadesDeMedida model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<UnidadesDeMedida> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<UnidadesDeMedida>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
