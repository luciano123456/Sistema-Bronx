using System;
using System.Data;
using System.Threading.Tasks;
using TuProyecto.Repositories.Interfaces;
using TuProyecto.Services.Interfaces;

namespace TuProyecto.Services
{
    public class AnalisisDatosService : IAnalisisDatosService
    {
        private readonly IAnalisisDatosRepository _repo;

        public AnalisisDatosService(IAnalisisDatosRepository repo)
        {
            _repo = repo;
        }

        public Task<DataSet> ObtenerDashboardAsync(DateTime? desde, DateTime? hasta, int? idCliente, int topN)
            => _repo.ObtenerDashboardAsync(desde, hasta, idCliente, topN);
    }
}
