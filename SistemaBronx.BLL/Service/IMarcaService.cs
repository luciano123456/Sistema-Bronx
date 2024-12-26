using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IMarcaService
    {
        Task<bool> Insertar(ProductosMarca model);
        Task<bool> Actualizar(ProductosMarca model);
        Task<bool> Eliminar(int id);
        Task<ProductosMarca> Obtener(int id);
        Task<IQueryable<ProductosMarca>> ObtenerTodos();
    }
}
