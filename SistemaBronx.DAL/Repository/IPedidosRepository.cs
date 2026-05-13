using SistemaBronx.Models;

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

        // SOLO ENTIDADES / TIPOS BÁSICOS
        Task<(bool ok, List<string> errores)> ValidarStockPedido(
            IQueryable<PedidosDetalle> pedidosDetalle,
            IQueryable<PedidosDetalleProceso> pedidosDetalleProceso);

        Task<(bool ok, decimal disponible, decimal faltante, string nombre)> ObtenerDisponibilidadStock(
            string tipoItem,
            int? idProducto,
            int? idInsumo,
            decimal cantidad,
            int? idColor = null);
    }
}