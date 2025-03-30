using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class ClienteService : IClienteService
    {

        private readonly IClienteRepository<Cliente> _contactRepo;

        public ClienteService(IClienteRepository<Cliente> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<int> Insertar(Cliente model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Cliente> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
