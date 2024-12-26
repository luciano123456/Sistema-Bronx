using SistemaBronx.DAL.DataContext;
using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IPedidoService 
    {
        Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido);
        Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido);
        Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido);
        Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idpago);
        Task<PagosPedidosCliente> ObtenerPagoCliente(int idpago);
        Task<bool> NuevoPedido(Pedido model);
        Task<bool> InsertarPagosCliente(List<PagosPedidosCliente> pagos);
        Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos);
        Task<Pedido> ObtenerPedido(int idPedido);
        Task<bool> EliminarPedido(int idPedido);
        Task<bool> EliminarPagoCliente(int idPago);
        Task<bool> EliminarPagoProveedor(int idPago);
    }
}
