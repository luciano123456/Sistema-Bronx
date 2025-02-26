using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IGastoCategoriaService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosCategoria model);
        Task<bool> Insertar(GastosCategoria model);

        Task<GastosCategoria> Obtener(int id);

        Task<IQueryable<GastosCategoria>> ObtenerTodos();
    }

}
