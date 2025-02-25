using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class GastoCategoriaService : IGastoCategoriaService
    {

        private readonly IGenericRepository<GastosCategoria> _contactRepo;

        public GastoCategoriaService(IGenericRepository<GastosCategoria> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(GastosCategoria model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(GastosCategoria model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<GastosCategoria> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<GastosCategoria>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
