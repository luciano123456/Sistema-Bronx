using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class ProveedorService : IProveedorService
    {

        private readonly IGenericRepository<Proveedor> _contactRepo;
        private readonly Provincia _provinciaRepo;

        public ProveedorService(IGenericRepository<Proveedor> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Proveedor model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Proveedor model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Proveedor> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }

        //public async Task<Proveedor> ObtenerPorNombre(string nombre)
        //{
        //    IQueryable<Proveedor> queryProveedorSQL = await _contactRepo.ObtenerTodos();

        //    Proveedor Proveedor = queryProveedorSQL.Where(c => c.Nombre == nombre).FirstOrDefault();

        //    return Proveedor;
        //}

        public async Task<IQueryable<Proveedor>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
