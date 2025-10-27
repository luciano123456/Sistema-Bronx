using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IPedidosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso);
        Task<bool> Actualizar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso);
        Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso);
        Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto);
        Task<List<Pedido>> ObtenerPedidos(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado);
        Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo);
        Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesos();
        Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesosFiltrado(bool incluirFinalizados);
        Task<Pedido> ObtenerPedido(int pedidoId);
        Task<bool> EliminarInsumo(int IdPedido, int IdInsumo);
        Task<bool> EliminarProducto(int IdPedido, int IdProducto);
        Task<bool> EliminarPedido(int id);
    }
}
