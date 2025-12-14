using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaBronx.BLL.Service
{
    public interface IPedidoService
    {
        Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso);
        Task<bool> Actualizar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso);
        Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso);

        Task<List<Pedido>> ObtenerPedidos(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado);
        Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesosFiltrado(bool incluirFinalizados);
        Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesos();
        Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo);
        Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto);
        Task<Pedido> ObtenerPedido(int pedidoId);

        Task<bool> EliminarInsumo(int IdPedido, int IdInsumo);
        Task<bool> EliminarProducto(int IdPedido, int IdProducto);
        Task<bool> EliminarPedido(int id);

        // NUEVO (expuestos para front/otras capas)
        Task<bool> RevertirUsoStockPedido(int idPedido);
        Task<bool> AplicarUsoStockPedido(Pedido pedido, IEnumerable<PedidosDetalle> detalles, IEnumerable<PedidosDetalleProceso> procesos);
    }
}
