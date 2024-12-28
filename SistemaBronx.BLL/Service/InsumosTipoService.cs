using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class InsumosTipoService : IInsumosTipoService
    {

        private readonly IGenericRepository<InsumosTipo> _contactRepo;

        public InsumosTipoService(IGenericRepository<InsumosTipo> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(InsumosTipo model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(InsumosTipo model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<InsumosTipo> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<InsumosTipo>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
