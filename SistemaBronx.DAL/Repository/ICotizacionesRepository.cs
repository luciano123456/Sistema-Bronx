using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface ICotizacionesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso);
        Task<bool> Actualizar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso);
        Task<bool> ActualizarDetalleProceso(CotizacionesDetalleProceso CotizacionesDetalleProceso);
        Task<CotizacionesDetalle> ObtenerProducto(int IdCotizacion, int IdProducto);
        Task<List<Cotizacion>> ObtenerCotizaciones(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado);
        Task<CotizacionesDetalleProceso> ObtenerInsumo(int IdCotizacion, int IdInsumo);
        Task<List<CotizacionesDetalleProceso>> ObtenerDetalleProcesos();
        Task<Cotizacion> ObtenerCotizacion(int CotizacionId);
        Task<bool> EliminarInsumo(int IdCotizacion, int IdInsumo);
        Task<bool> EliminarProducto(int IdCotizacion, int IdProducto);
        Task<bool> EliminarCotizacion(int id);
        Task<int> TransformarCotizacionEnPedidoAsync(int idCotizacion, bool eliminarCotizacion);
    }
}
