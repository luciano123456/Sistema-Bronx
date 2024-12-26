using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface ICategoriaService
    {
        Task<bool> Insertar(ProductosCategoria model);
        Task<bool> Actualizar(ProductosCategoria model);
        Task<bool> Eliminar(int id);
        Task<ProductosCategoria> Obtener(int id);
        Task<IQueryable<ProductosCategoria>> ObtenerTodos();
    }
}
