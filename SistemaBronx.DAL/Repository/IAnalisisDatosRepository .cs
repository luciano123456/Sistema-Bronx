using System;
using System.Data;
using System.Threading.Tasks;

namespace TuProyecto.Repositories.Interfaces
{
    public interface IAnalisisDatosRepository
    {
        Task<DataSet> ObtenerDashboardAsync(DateTime? desde, DateTime? hasta, int? idCliente, int topN);
    }
}
