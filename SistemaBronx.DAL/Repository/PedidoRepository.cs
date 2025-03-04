using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaBronx.DAL.Repository
{
    public class PedidoRepository : IPedidosRepository<Pedido>
    {

        private readonly SistemaBronxContext _dbcontext;

        public PedidoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }


        public async Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {

            using var transaction = await _dbcontext.Database.BeginTransactionAsync();

            try
            {

                _dbcontext.Pedidos.Add(pedido);

                if (pedidosDetalle != null)
                {
                    foreach (var producto in pedidosDetalle)
                    {
                        producto.IdPedido = pedido.Id;

                        _dbcontext.PedidosDetalles.Add(producto);
                    }
                }

                if (pedidosDetalleProceso != null)
                {
                    foreach (var insumo in pedidosDetalleProceso)
                    {
                        insumo.IdPedido = pedido.Id;

                        _dbcontext.PedidosDetalleProcesos.Add(insumo);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> Actualizar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                var pedidoExistente = await _dbcontext.Pedidos
                    .Include(p => p.PedidosDetalles)
                    .Include(p => p.PedidosDetalleProcesos)
                    .FirstOrDefaultAsync(p => p.Id == pedido.Id);

                if (pedidoExistente == null)
                {
                    return false; // El pedido no existe
                }

                // Actualizar datos del pedido
                _dbcontext.Entry(pedidoExistente).CurrentValues.SetValues(pedido);

                // **Actualizar PedidosDetalle**
                var idsProductos = pedidosDetalle.Select(pd => pd.Id).ToList();

                // Eliminar detalles que ya no están en la lista
                var detallesAEliminar = pedidoExistente.PedidosDetalles
                    .Where(pd => !idsProductos.Contains(pd.Id))
                    .ToList();
                _dbcontext.PedidosDetalles.RemoveRange(detallesAEliminar);

                // Insertar o actualizar detalles
                foreach (var detalle in pedidosDetalle)
                {
                    var detalleExistente = pedidoExistente.PedidosDetalles.FirstOrDefault(pd => pd.Id == detalle.Id);
                    if (detalleExistente != null)
                    {
                        _dbcontext.Entry(detalleExistente).CurrentValues.SetValues(detalle);
                    }
                    else
                    {
                        detalle.IdPedido = pedido.Id;
                        _dbcontext.PedidosDetalles.Add(detalle);
                    }
                }

                // **Actualizar PedidosDetalleProceso**
                var idsProcesos = pedidosDetalleProceso.Select(pdp => pdp.Id).ToList();

                // Eliminar procesos que ya no están en la lista
                var procesosAEliminar = pedidoExistente.PedidosDetalleProcesos
                    .Where(pdp => !idsProcesos.Contains(pdp.Id))
                    .ToList();
                _dbcontext.PedidosDetalleProcesos.RemoveRange(procesosAEliminar);

                // Insertar o actualizar procesos
                foreach (var proceso in pedidosDetalleProceso)
                {
                    var procesoExistente = pedidoExistente.PedidosDetalleProcesos.FirstOrDefault(pdp => pdp.Id == proceso.Id);
                    if (procesoExistente != null)
                    {
                        _dbcontext.Entry(procesoExistente).CurrentValues.SetValues(proceso);
                    }
                    else
                    {
                        proceso.IdPedido = pedido.Id;
                        _dbcontext.PedidosDetalleProcesos.Add(proceso);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }


        public async Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var producto = await _dbcontext.PedidosDetalles.Where(x=> x.IdPedido == IdPedido && x.IdProducto == IdProducto).FirstOrDefaultAsync();
                if (producto == null)
                {
                    return null;
                }

                return producto;

            }
            catch (Exception ex)
            {
                return null;
            }

        }

        public async Task<IQueryable<Pedido>> ObtenerPedidos()
        {

            try
            {
                var pedidos = await _dbcontext.Pedidos.ToListAsync();

                return (IQueryable<Pedido>)pedidos;

            }
            catch (Exception ex)
            {
                return null;
            }

        }

        public async Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var producto = await _dbcontext.PedidosDetalleProcesos.Where(x => x.IdPedido == IdPedido && x.IdInsumo == IdInsumo).FirstOrDefaultAsync();

                return producto;

            }
            catch (Exception ex)
            {
                return null;
            }

        }


        public async Task<Dictionary<string, object>> ObtenerPedido(int pedidoId)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var pedido = await _dbcontext.Pedidos
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdEstadoNavigation)
                    .Include(p => p.IdTipoNavigation)
                    .Include(p => p.IdNavigation) // Formas de Pago
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdProductoNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdColorNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdCategoriaNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdProductoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdColorNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdCategoriaNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdInsumoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdProveedorNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdUnidadMedidaNavigation)
                    .FirstOrDefaultAsync(p => p.Id == pedidoId);

                if (pedido == null)
                {
                    return null; 
                }

                resultado.Add("Pedido", pedido);
                resultado.Add("PedidosDetalle", pedido.PedidosDetalles);
                resultado.Add("PedidosDetalleProceso", pedido.PedidosDetalleProcesos);
            }
            catch (Exception ex)
            {
                return null;
            }

            return resultado;
        }


        public async Task<bool> EliminarInsumo(int IdPedido, int IdInsumo)
        {
            try
            {
                PedidosDetalleProceso model = _dbcontext.PedidosDetalleProcesos.First(c => c.IdPedido == IdPedido && c.IdInsumo == IdInsumo);
                _dbcontext.PedidosDetalleProcesos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch ( Exception ex)
            {
                return false;
            }

        }

        public async Task<bool> EliminarProducto(int IdPedido, int IdProducto)
        {
            try
            {
                PedidosDetalle model = _dbcontext.PedidosDetalles.First(c => c.IdPedido == IdPedido && c.IdProducto == IdProducto);
                _dbcontext.PedidosDetalles.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }


        public async Task<bool> EliminarPedido(int id)
        {
            try
            {
                Pedido model = _dbcontext.Pedidos.First(c => c.Id == id);
                _dbcontext.Pedidos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

    }
}
