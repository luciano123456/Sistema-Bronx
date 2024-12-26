using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IProvinciaService
    {
        Task<IQueryable<Provincia>> ObtenerTodos();
    }
}
