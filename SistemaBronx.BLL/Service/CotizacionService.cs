using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class Cotizacioneservice : ICotizacioneservice
    {

        private readonly ICotizacionesRepository<Cotizacion> _contactRepo;

        public Cotizacioneservice(ICotizacionesRepository<Cotizacion> contactRepo)
        {
            _contactRepo = contactRepo;
        }



        public async Task<bool> Actualizar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso)
        {
            return await _contactRepo.Actualizar(Cotizacion, CotizacionesDetalle, CotizacionesDetalleProceso);
        }

        public async Task<bool> ActualizarDetalleProceso(CotizacionesDetalleProceso CotizacionesDetalleProceso)
        {
            return await _contactRepo.ActualizarDetalleProceso(CotizacionesDetalleProceso);
        }

        public async Task<bool> EliminarInsumo(int IdCotizacion, int IdInsumo)
        {
            return await _contactRepo.EliminarInsumo(IdCotizacion, IdInsumo);
        }

        public async Task<bool> EliminarCotizacion(int id)
        {
            return await _contactRepo.EliminarCotizacion(id);
        }

        public async Task <bool> EliminarProducto(int IdCotizacion, int IdProducto)
        {
            return await _contactRepo.EliminarProducto(IdCotizacion, IdProducto);
        }

        public async Task<bool> Insertar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso)
        {
            return await _contactRepo.Insertar(Cotizacion,CotizacionesDetalle,CotizacionesDetalleProceso);
        }

        public async Task<CotizacionesDetalleProceso> ObtenerInsumo(int IdCotizacion, int IdInsumo)
        {
            return await _contactRepo.ObtenerInsumo(IdCotizacion, IdInsumo);
        }

        public async Task<List<CotizacionesDetalleProceso>> ObtenerDetalleProcesos()
        {
            return await _contactRepo.ObtenerDetalleProcesos();
        }

        public async Task<Cotizacion> ObtenerCotizacion(int CotizacionId)
        {
            return await _contactRepo.ObtenerCotizacion(CotizacionId);
        }

        public async Task<List<Cotizacion>> ObtenerCotizaciones(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
        {
            return await _contactRepo.ObtenerCotizaciones(FechaDesde,  FechaHasta, IdCliente, Estado, Finalizado);
        }

        public async Task<CotizacionesDetalle> ObtenerProducto(int IdCotizacion, int IdProducto)
        {
            return await _contactRepo.ObtenerProducto(IdCotizacion, IdProducto);   
        }

        public async Task<int> TransformarCotizacionEnPedidoAsync(int idCotizacion, bool eliminarCotizacion)
        {
            return await _contactRepo.TransformarCotizacionEnPedidoAsync(idCotizacion, eliminarCotizacion);
        }
    }
}
