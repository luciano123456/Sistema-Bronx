using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IGastoService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Gasto model);
        Task<bool> Insertar(Gasto model);

        Task<Gasto> Obtener(int id);
        Task<Gasto> ObtenerUsuario(string usuario);

        Task<IQueryable<Gasto>> ObtenerTodos();
    }

}
