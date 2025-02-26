using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class FormasdePagoService : IFormasdePagoService
    {

        private readonly IGenericRepository<FormasdePago> _contactRepo;

        public FormasdePagoService(IGenericRepository<FormasdePago> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(FormasdePago model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(FormasdePago model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<FormasdePago> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<FormasdePago>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
