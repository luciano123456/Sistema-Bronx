using SistemaBronx.Models;
using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class ProductoService : IProductoService
    {

        private readonly IProductoRepository<Producto> _contactRepo;

        public ProductoService(IProductoRepository<Producto> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Producto model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Producto model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Producto> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }
        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }

        public async Task<IQueryable<ProductosCategoria>> ObtenerCategorias()
        {
            return await _contactRepo.ObtenerCategorias();
        }

        public async Task<bool> InsertarInsumos(List<ProductosInsumo> insumos)
        {
            return await _contactRepo.InsertarInsumos(insumos);
        }

        public async Task<bool> ActualizarInsumos(List<ProductosInsumo> productos)
        {
            return await _contactRepo.ActualizarInsumos(productos);
        }

        public async Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto)
        {
            return await _contactRepo.ObtenerInsumos(idProducto);
        }


    }
}
