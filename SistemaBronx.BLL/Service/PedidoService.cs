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



        public async Task<bool> Actualizar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            return await _contactRepo.Actualizar(pedido, pedidosDetalle, pedidosDetalleProceso);
        }

        public async Task<bool> EliminarInsumo(int IdPedido, int IdInsumo)
        {
            return await _contactRepo.EliminarInsumo(IdPedido, IdInsumo);
        }

        public async Task<bool> EliminarPedido(int id)
        {
            return await _contactRepo.EliminarPedido(id);
        }

        public async Task <bool> EliminarProducto(int IdPedido, int IdProducto)
        {
            return await _contactRepo.EliminarProducto(IdPedido, IdProducto);
        }

        public async Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            return await _contactRepo.Insertar(pedido,pedidosDetalle,pedidosDetalleProceso);
        }

        public async Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo)
        {
            return await _contactRepo.ObtenerInsumo(IdPedido, IdInsumo);
        }

        public async Task<Dictionary<string, object>> ObtenerPedido(int pedidoId)
        {
            return await _contactRepo.ObtenerPedido(pedidoId);
        }

        public async Task<IQueryable<Pedido>> ObtenerPedidos()
        {
            return await _contactRepo.ObtenerPedidos();
        }

        public async Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto)
        {
            return await _contactRepo.ObtenerProducto(IdPedido, IdProducto);   
        }
    }
}
