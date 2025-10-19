using System;
using System.Data;
using System.Threading.Tasks;

namespace TuProyecto.Services.Interfaces
{
    public interface IAnalisisDatosService
    {
        Task<DataSet> ObtenerDashboardAsync(DateTime? desde, DateTime? hasta, int? idCliente, int topN);
    }
}
