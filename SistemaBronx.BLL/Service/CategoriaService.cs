using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class CategoriaService : ICategoriaService
    {

        private readonly IGenericRepository<ProductosCategoria> _contactRepo;

        public CategoriaService(IGenericRepository<ProductosCategoria> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ProductosCategoria model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ProductosCategoria model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ProductosCategoria> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ProductosCategoria>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
