using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class PedidoCategoriaService : IPedidoCategoriaService
    {

        private readonly IGenericRepository<PedidosCategoria> _contactRepo;

        public PedidoCategoriaService(IGenericRepository<PedidosCategoria> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(PedidosCategoria model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(PedidosCategoria model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<PedidosCategoria> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<PedidosCategoria>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
