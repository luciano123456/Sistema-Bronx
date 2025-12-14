using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaBronx.BLL.Service
{
    public class PedidoService : IPedidoService
    {
        private readonly IPedidosRepository<Pedido> _repo;

        public PedidoService(IPedidosRepository<Pedido> repo)
        {
            _repo = repo;
        }

        public Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
            => _repo.Insertar(pedido, pedidosDetalle, pedidosDetalleProceso);

        public Task<bool> Actualizar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
            => _repo.Actualizar(pedido, pedidosDetalle, pedidosDetalleProceso);

        public Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso)
            => _repo.ActualizarDetalleProceso(pedidosDetalleProceso);

        public Task<List<Pedido>> ObtenerPedidos(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
            => _repo.ObtenerPedidos(FechaDesde, FechaHasta, IdCliente, Estado, Finalizado);

        public Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesosFiltrado(bool incluirFinalizados)
            => _repo.ObtenerDetalleProcesosFiltrado(incluirFinalizados);

        public Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesos()
            => _repo.ObtenerDetalleProcesos();

        public Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo)
            => _repo.ObtenerInsumo(IdPedido, IdInsumo);

        public Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto)
            => _repo.ObtenerProducto(IdPedido, IdProducto);

        public Task<Pedido> ObtenerPedido(int pedidoId)
            => _repo.ObtenerPedido(pedidoId);

        public Task<bool> EliminarInsumo(int IdPedido, int IdInsumo)
            => _repo.EliminarInsumo(IdPedido, IdInsumo);

        public Task<bool> EliminarProducto(int IdPedido, int IdProducto)
            => _repo.EliminarProducto(IdPedido, IdProducto);

        public Task<bool> EliminarPedido(int id)
            => _repo.EliminarPedido(id);

        // 🔥 NUEVO — Helpers expuestos al Service
        public Task<bool> RevertirUsoStockPedido(int idPedido)
            => _repo.RevertirUsoStockPedido(idPedido);

        public Task<bool> AplicarUsoStockPedido(Pedido pedido, IEnumerable<PedidosDetalle> detalles, IEnumerable<PedidosDetalleProceso> procesos)
            => _repo.AplicarUsoStockPedido(pedido, detalles, procesos);
    }
}
