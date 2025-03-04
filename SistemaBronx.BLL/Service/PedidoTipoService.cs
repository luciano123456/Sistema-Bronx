using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class PedidoTipoService : IPedidoTipoService
    {

        private readonly IGenericRepository<PedidosTipo> _contactRepo;

        public PedidoTipoService(IGenericRepository<PedidosTipo> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(PedidosTipo model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(PedidosTipo model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<PedidosTipo> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<PedidosTipo>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
