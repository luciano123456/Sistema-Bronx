using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class PedidoEstadoService : IPedidoEstadoService
    {

        private readonly IGenericRepository<PedidosEstado> _contactRepo;

        public PedidoEstadoService(IGenericRepository<PedidosEstado> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(PedidosEstado model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(PedidosEstado model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<PedidosEstado> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<PedidosEstado>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
