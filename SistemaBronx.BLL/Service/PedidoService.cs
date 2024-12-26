using Newtonsoft.Json;
using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public class PedidoService : IPedidoService
    {


        private readonly IPedidosRepository<Pedido> _contactRepo;

        public PedidoService(IPedidosRepository<Pedido> contactRepo)
        {
            _contactRepo = contactRepo;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            return await _contactRepo.EliminarPagoCliente(idPago);
        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            return await _contactRepo.EliminarPagoProveedor(idPago);
        }

        public async Task<bool> EliminarPedido(int idPedido)
        {
            return await _contactRepo.EliminarPedido(idPedido);
        }

        public async Task<bool> InsertarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            return await _contactRepo.InsertarPagosCliente(pagos);
        }

        public async Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            return await _contactRepo.InsertarPagosProveedor(pagos);
        }

        public async Task<bool> NuevoPedido(Pedido model)
        {
            return await _contactRepo.NuevoPedido(model);
        }

        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idpago)
        {
           return await _contactRepo.ObtenerPagoaProveedor(idpago);
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idpago)
        {
            return await _contactRepo.ObtenerPagoCliente(idpago);
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            return await _contactRepo.ObtenerPagosaProveedores(idPedido);
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            return await _contactRepo.ObtenerPagosClientes(idPedido);
        }

        public async  Task<Pedido> ObtenerPedido(int idPedido)
        {
            return await _contactRepo.ObtenerPedido(idPedido);
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            return await _contactRepo.ObtenerProductosPedido(idPedido);
        }
    }
}
