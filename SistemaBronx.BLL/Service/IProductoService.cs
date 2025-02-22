using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IProductoService
    {
        Task<bool> Insertar(Producto model);
        Task<bool> Actualizar(Producto model);
        Task<bool> Eliminar(int id);
        Task<Producto> Obtener(int id);
        Task<IQueryable<Producto>> ObtenerTodos();
        Task<IQueryable<ProductosCategoria>> ObtenerCategorias();

        Task<bool> InsertarInsumos(List<ProductosInsumo> insumos);
        Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto);
        Task<bool> ActualizarInsumos(List<ProductosInsumo> insumos);
    }
}
