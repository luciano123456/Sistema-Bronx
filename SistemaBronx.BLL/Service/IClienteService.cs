using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IClienteService
    {
        Task<int> Insertar(Cliente model);
        Task<bool> Actualizar(Cliente model);
        Task<bool> Eliminar(int id);
        Task<Cliente> Obtener(int id);
        Task<IQueryable<Cliente>> ObtenerTodos();
    }
}
