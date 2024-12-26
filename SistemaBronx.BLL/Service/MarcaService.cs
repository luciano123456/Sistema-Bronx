using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class MarcaService : IMarcaService
    {

        private readonly IGenericRepository<ProductosMarca> _contactRepo;

        public MarcaService(IGenericRepository<ProductosMarca> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ProductosMarca model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ProductosMarca model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ProductosMarca> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ProductosMarca>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
