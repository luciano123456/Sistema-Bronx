using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Runtime.Intrinsics.Arm;
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


        public async Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidoDetalle, IQueryable<PedidosDetalleProceso> pedidoDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                // Insertar el pedido
                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync(); // Guarda el pedido y obtiene el ID

                // Obtener ID generado
                int idPedidoGenerado = pedido.Id;

                // Asignar el ID a los detalles
                foreach (var detalle in pedidoDetalle)
                {
                    detalle.IdPedido = idPedidoGenerado;
                }

                // Insertar detalles
                if (pedidoDetalle.Any())
                {
                    _dbcontext.PedidosDetalles.AddRange(pedidoDetalle);
                    await _dbcontext.SaveChangesAsync();
                }

                // Asignar ID a los procesos de detalle
                foreach (var detalleProceso in pedidoDetalleProceso)
                {
                    var detalleRelacionado = pedidoDetalle.FirstOrDefault(d => d.IdProducto == detalleProceso.IdProducto);
                    if (detalleRelacionado != null)
                    {
                        detalleProceso.IdPedido = idPedidoGenerado;
                        detalleProceso.IdDetalle = detalleRelacionado.Id;
                    }
                }

                // Insertar detalles de proceso
                if (pedidoDetalleProceso.Any())
                {
                    _dbcontext.PedidosDetalleProcesos.AddRange(pedidoDetalleProceso);
                    await _dbcontext.SaveChangesAsync();
                }

                // Confirmar la transacción
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                // Si algo falla, hacer rollback
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

                var detallesGuardados = new List<PedidosDetalle>();

                // Insertar o actualizar detalles de productos
                foreach (var detalle in pedidosDetalle)
                {
                    var detalleExistente = pedidoExistente.PedidosDetalles.FirstOrDefault(pd => pd.Id > 0 && pd.Id == detalle.Id);
                    if (detalleExistente != null)
                    {
                        // Excluir IdPedido de la actualización
                        detalleExistente.Cantidad = detalle.Cantidad;
                        detalleExistente.CostoUnitario = detalle.CostoUnitario;
                        detalleExistente.PrecioVenta = detalle.PrecioVenta;
                        detalleExistente.PorcIva = detalle.PorcIva;
                        detalleExistente.IdCategoria = detalle.IdCategoria;
                        detalleExistente.IdColor = detalle.IdColor;
                        detalleExistente.PorcGanancia = detalle.PorcGanancia;
                    }
                    else
                    {
                        detalle.IdPedido = pedido.Id; // Mantener el IdPedido en inserciones
                        _dbcontext.PedidosDetalles.Add(detalle);
                        detallesGuardados.Add(detalle);
                    }
                }

                await _dbcontext.SaveChangesAsync(); // Guardar detalles para obtener sus IDs

                // **Actualizar PedidosDetalleProceso**
                var idsProcesos = pedidosDetalleProceso.Select(pdp => pdp.Id).ToList();

                // Eliminar procesos que ya no están en la lista
                var procesosAEliminar = pedidoExistente.PedidosDetalleProcesos
                    .Where(pdp => !idsProcesos.Contains(pdp.Id))
                    .ToList();
                _dbcontext.PedidosDetalleProcesos.RemoveRange(procesosAEliminar);

                // Insertar o actualizar detalles de procesos
                foreach (var proceso in pedidosDetalleProceso)
                {
                    var procesoExistente = pedidoExistente.PedidosDetalleProcesos.FirstOrDefault(pdp => pdp.Id > 0 && pdp.Id == proceso.Id);
                    if (procesoExistente != null)
                    {
                        // Excluir IdPedido e IdPedidoDetalle de la actualización
                        procesoExistente.Cantidad = proceso.Cantidad;
                        procesoExistente.IdCategoria = proceso.IdCategoria;
                        procesoExistente.Comentarios = proceso.Comentarios;
                        procesoExistente.Descripcion = proceso.Descripcion;
                        procesoExistente.Especificacion = proceso.Especificacion;
                        procesoExistente.IdColor = proceso.IdColor;
                        procesoExistente.FechaActualizacion = DateTime.Now;
                        procesoExistente.SubTotal = proceso.SubTotal;
                        procesoExistente.IdEstado = proceso.IdEstado;
                        procesoExistente.IdTipo = proceso.IdTipo;
                        procesoExistente.PrecioUnitario = proceso.PrecioUnitario;
                    }
                    else
                    {
                        proceso.IdPedido = pedido.Id; // Mantener el IdPedido en inserciones

                        // Buscar el detalle correspondiente
                        var detalleRelacionado = detallesGuardados.FirstOrDefault(d => d.IdProducto == proceso.IdProducto); // Ajusta según la relación real
                        if (detalleRelacionado != null)
                        {
                            proceso.IdDetalle = detalleRelacionado.Id;
                        }

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

        public async Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                var pedidoDetalleExistente = await _dbcontext.PedidosDetalleProcesos
                    .FirstOrDefaultAsync(p => p.Id == pedidosDetalleProceso.Id);

                if (pedidoDetalleExistente == null)
                {
                    return false; // El pedido no existe
                }


                pedidoDetalleExistente.Cantidad = pedidosDetalleProceso.Cantidad;
                pedidoDetalleExistente.Comentarios = pedidosDetalleProceso.Comentarios;
                pedidoDetalleExistente.Descripcion = pedidosDetalleProceso.Descripcion;
                pedidoDetalleExistente.Especificacion = pedidosDetalleProceso.Especificacion;
                pedidoDetalleExistente.IdColor = pedidosDetalleProceso.IdColor;
                pedidoDetalleExistente.FechaActualizacion = DateTime.Now;
                pedidoDetalleExistente.IdEstado = pedidosDetalleProceso.IdEstado;

                // Actualizar datos del pedido
                _dbcontext.Entry(pedidoDetalleExistente).CurrentValues.SetValues(pedidoDetalleExistente);


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

        public async Task<List<Pedido>> ObtenerPedidos(DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
        {

            try
            {

                FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                List<Pedido> pedidos = await _dbcontext.Pedidos
                    .Include(x => x.IdClienteNavigation)
                    .Include(x => x.IdFormaPagoNavigation)
                    .Where(x=> x.Fecha >= FechaDesde && x.Fecha <= FechaHasta && (x.IdCliente == IdCliente || IdCliente == -1) && (x.Finalizado == Finalizado || Finalizado == -1) && (x.Saldo <= 0 && Estado == "ENTREGAR" || x.Saldo >= 0 && Estado == "EN PROCESO" || Estado == "TODOS"))
                    .ToListAsync();

                return pedidos;

            }
            catch (Exception ex)
            {
                return null;
            }

        }


        public async Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesos()
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var producto = await _dbcontext.PedidosDetalleProcesos
                    .Include(x => x.IdCategoriaNavigation)
                    .Include(x => x.IdProductoNavigation)
                    .Include(x => x.IdEstadoNavigation)
                    .Include(x => x.IdProveedorNavigation)
                    .Include(x => x.IdInsumoNavigation)
                    .Include(x => x.IdColorNavigation)
                    .ToListAsync();

                return producto;

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


        public async Task<Pedido> ObtenerPedido(int pedidoId)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var pedido = await _dbcontext.Pedidos
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdFormaPagoNavigation) // Formas de Pago
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
                        .ThenInclude(pdp => pdp.IdTipoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdProveedorNavigation)
                        .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdEstadoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdUnidadMedidaNavigation)
                    .FirstOrDefaultAsync(p => p.Id == pedidoId);

                return pedido;
            }
            catch (Exception ex)
            {
                return null;
            }

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
