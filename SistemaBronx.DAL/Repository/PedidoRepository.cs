using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public class PedidoRepository : IPedidosRepository<Pedido>
    {
        private readonly SistemaBronxContext _dbcontext;

        // Movimiento de stock automático para salidas por pedido
        private const int ID_TIPO_MOV_PEDIDO = 8;

        public PedidoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        /* ============================================================
           HELPERS STOCK
        ============================================================ */

        private async Task AplicarStockSalidaAsync(string tipoItem, int? idProducto, int? idInsumo, decimal cantidad)
        {
            tipoItem = (tipoItem ?? "").ToUpper();

            var saldo = await _dbcontext.StockSaldos.FirstOrDefaultAsync(s =>
                s.TipoItem == tipoItem &&
                s.IdProducto == idProducto &&
                s.IdInsumo == idInsumo
            );

            if (saldo == null)
            {
                saldo = new StockSaldo
                {
                    TipoItem = tipoItem,
                    IdProducto = idProducto,
                    IdInsumo = idInsumo,
                    CantidadActual = 0,
                    FechaUltMovimiento = DateTime.Now
                };
                _dbcontext.StockSaldos.Add(saldo);
            }

            saldo.CantidadActual -= cantidad;
            saldo.FechaUltMovimiento = DateTime.Now;
        }

        private async Task RevertirStockSalidaAsync(string tipoItem, int? idProducto, int? idInsumo, decimal cantidad)
        {
            tipoItem = (tipoItem ?? "").ToUpper();

            var saldo = await _dbcontext.StockSaldos.FirstOrDefaultAsync(s =>
                s.TipoItem == tipoItem &&
                s.IdProducto == idProducto &&
                s.IdInsumo == idInsumo
            );

            if (saldo == null)
            {
                saldo = new StockSaldo
                {
                    TipoItem = tipoItem,
                    IdProducto = idProducto,
                    IdInsumo = idInsumo,
                    CantidadActual = 0,
                    FechaUltMovimiento = DateTime.Now
                };
                _dbcontext.StockSaldos.Add(saldo);
            }

            saldo.CantidadActual += cantidad;
            saldo.FechaUltMovimiento = DateTime.Now;
        }

        /* ============================================================
           REVERSIÓN TOTAL DEL STOCK DEL PEDIDO
        ============================================================ */

        public async Task<bool> RevertirUsoStockPedido(int idPedido)
        {
            try
            {
                // PRODUCTOS
                var linksProd = await _dbcontext.PedidosDetalleStocks
                    .Include(l => l.IdPedidoDetalleNavigation)
                    .Include(l => l.IdStockMovimientoDetalleNavigation)
                        .ThenInclude(d => d.IdMovimientoNavigation)
                    .Where(l => l.IdPedidoDetalleNavigation.IdPedido == idPedido)
                    .ToListAsync();

                // PROCESOS / INSUMOS
                var linksProc = await _dbcontext.PedidosDetalleProcesosStocks
                    .Include(l => l.IdPedidoDetalleProcesoNavigation)
                    .Include(l => l.IdStockMovimientoDetalleNavigation)
                        .ThenInclude(d => d.IdMovimientoNavigation)
                    .Where(l => l.IdPedidoDetalleProcesoNavigation.IdPedido == idPedido)
                    .ToListAsync();

                if (!linksProd.Any() && !linksProc.Any())
                    return true;

                var detallesStock = new HashSet<StockMovimientosDetalle>();
                var movimientos = new HashSet<StockMovimiento>();

                // revertir productos
                foreach (var link in linksProd)
                {
                    var det = link.IdStockMovimientoDetalleNavigation;
                    var mov = det.IdMovimientoNavigation;

                    detallesStock.Add(det);
                    movimientos.Add(mov);

                    await RevertirStockSalidaAsync(det.TipoItem, det.IdProducto, det.IdInsumo, link.CantidadUsada);
                }

                // revertir procesos (insumos)
                foreach (var link in linksProc)
                {
                    var det = link.IdStockMovimientoDetalleNavigation;
                    var mov = det.IdMovimientoNavigation;

                    detallesStock.Add(det);
                    movimientos.Add(mov);

                    await RevertirStockSalidaAsync(det.TipoItem, det.IdProducto, det.IdInsumo, link.CantidadUsada);
                }

                // borrar relaciones
                _dbcontext.PedidosDetalleStocks.RemoveRange(linksProd);
                _dbcontext.PedidosDetalleProcesosStocks.RemoveRange(linksProc);

                // borrar detalles stock
                _dbcontext.StockMovimientosDetalles.RemoveRange(detallesStock);

                // borrar movimientos vacíos
                foreach (var mov in movimientos)
                {
                    bool existen = await _dbcontext.StockMovimientosDetalles.AnyAsync(d => d.IdMovimiento == mov.Id);
                    if (!existen)
                        _dbcontext.StockMovimientos.Remove(mov);
                }

                // reset cantidades usadas
                foreach (var d in await _dbcontext.PedidosDetalles.Where(x => x.IdPedido == idPedido).ToListAsync())
                    d.CantidadUsadaStock = 0;

                foreach (var p in await _dbcontext.PedidosDetalleProcesos.Where(x => x.IdPedido == idPedido).ToListAsync())
                    p.CantidadUsadaStock = 0;

                return true;
            }
            catch
            {
                return false;
            }
        }

        /* ============================================================
           APLICAR USO DE STOCK
        ============================================================ */

        public async Task<bool> AplicarUsoStockPedido(
            Pedido pedido,
            IEnumerable<PedidosDetalle> detalles,
            IEnumerable<PedidosDetalleProceso> procesos)
        {
            try
            {
                var listaDetalles = detalles.ToList();
                var listaProcesos = procesos.ToList();

                decimal totalUso = listaDetalles.Sum(d => d.CantidadUsadaStock ?? 0)
                                  + listaProcesos.Sum(p => p.CantidadUsadaStock ?? 0);

                if (totalUso <= 0)
                    return true;

                var mov = new StockMovimiento
                {
                    Fecha = DateTime.Now,
                    FechaAlta = DateTime.Now,
                    IdTipoMovimiento = ID_TIPO_MOV_PEDIDO,
                    Comentario = $"Salida por pedido #{pedido.Id}",
                    IdUsuario = null,
                    EsAnulado = false,
                };

                _dbcontext.StockMovimientos.Add(mov);
                await _dbcontext.SaveChangesAsync();

                // PRODUCTOS
                foreach (var d in listaDetalles)
                {
                    var uso = d.CantidadUsadaStock ?? 0;
                    if (uso <= 0 || d.IdProducto is null)
                        continue;

                    var detStock = new StockMovimientosDetalle
                    {
                        IdMovimiento = mov.Id,
                        TipoItem = "P",
                        IdProducto = d.IdProducto,
                        IdInsumo = null,
                        Cantidad = uso,
                        CostoUnitario = 0,
                        FechaCreado = DateTime.Now
                    };

                    _dbcontext.StockMovimientosDetalles.Add(detStock);

                    var link = new PedidosDetalleStock
                    {
                        IdPedidoDetalle = d.Id,
                        IdStockMovimientoDetalleNavigation = detStock,
                        CantidadUsada = uso
                    };
                    _dbcontext.PedidosDetalleStocks.Add(link);

                    await AplicarStockSalidaAsync("P", d.IdProducto, null, uso);
                }

                // PROCESOS (INSUMOS)
                foreach (var p in listaProcesos)
                {
                    var uso = p.CantidadUsadaStock ?? 0;
                    if (uso <= 0 || p.IdInsumo is null)
                        continue;

                    var detStock = new StockMovimientosDetalle
                    {
                        IdMovimiento = mov.Id,
                        TipoItem = "I",
                        IdProducto = null,
                        IdInsumo = p.IdInsumo,
                        Cantidad = uso,
                        CostoUnitario = 0,
                        FechaCreado = DateTime.Now
                    };

                    _dbcontext.StockMovimientosDetalles.Add(detStock);

                    var link = new PedidosDetalleProcesosStock
                    {
                        IdPedidoDetalleProceso = p.Id,
                        IdStockMovimientoDetalleNavigation = detStock,
                        CantidadUsada = uso
                    };
                    _dbcontext.PedidosDetalleProcesosStocks.Add(link);

                    await AplicarStockSalidaAsync("I", null, p.IdInsumo, uso);
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        /* ============================================================
           INSERTAR
        ============================================================ */

        public async Task<bool> Insertar(
            Pedido pedido,
            IQueryable<PedidosDetalle> pedidosDetalle,
            IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            await using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync();

                var idMapping = new Dictionary<int, int>();

                var detList = pedidosDetalle.ToList();
                foreach (var d in detList)
                {
                    int tempId = d.Id;
                    d.Id = 0;
                    d.IdPedido = pedido.Id;

                    _dbcontext.PedidosDetalles.Add(d);
                    await _dbcontext.SaveChangesAsync();

                    idMapping[tempId] = d.Id;
                }

                var procList = pedidosDetalleProceso.ToList();
                foreach (var p in procList)
                {
                    p.IdPedido = pedido.Id;
                    if (p.IdDetalle.HasValue && idMapping.TryGetValue(p.IdDetalle.Value, out int realId))
                        p.IdDetalle = realId;

                    p.Id = 0;
                    _dbcontext.PedidosDetalleProcesos.Add(p);
                }

                await _dbcontext.SaveChangesAsync();

                await AplicarUsoStockPedido(pedido, detList, procList);
                await _dbcontext.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        /* ============================================================
           ACTUALIZAR
        ============================================================ */

        public async Task<bool> Actualizar(
            Pedido pedido,
            IQueryable<PedidosDetalle> pedidosDetalle,
            IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            await using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var pedidoExistente = await _dbcontext.Pedidos
                    .Include(p => p.PedidosDetalles)
                    .Include(p => p.PedidosDetalleProcesos)
                    .FirstOrDefaultAsync(p => p.Id == pedido.Id);

                if (pedidoExistente == null)
                    return false;

                // Revertir stock previo
                await RevertirUsoStockPedido(pedido.Id);

                _dbcontext.Entry(pedidoExistente).CurrentValues.SetValues(pedido);

                // update detalle productos
                var nuevosDetalles = pedidosDetalle.ToList();
                var idsProd = nuevosDetalles.Select(x => x.Id).ToList();

                var eliminarProd = pedidoExistente.PedidosDetalles.Where(x => !idsProd.Contains(x.Id)).ToList();
                _dbcontext.PedidosDetalles.RemoveRange(eliminarProd);

                var idMapping = new Dictionary<int, int>();

                foreach (var d in nuevosDetalles)
                {
                    var detExist = pedidoExistente.PedidosDetalles.FirstOrDefault(x => x.Id == d.Id);

                    if (detExist != null)
                    {
                        detExist.Cantidad = d.Cantidad;
                        detExist.CostoUnitario = d.CostoUnitario;
                        detExist.PrecioVenta = d.PrecioVenta;
                        detExist.PorcIva = d.PorcIva;
                        detExist.IdCategoria = d.IdCategoria;
                        detExist.IdColor = d.IdColor;
                        detExist.IdProducto = d.IdProducto;
                        detExist.PorcGanancia = d.PorcGanancia;
                        detExist.Producto = d.Producto;
                        detExist.CantidadUsadaStock = d.CantidadUsadaStock;
                    }
                    else
                    {
                        int tempId = d.Id;
                        d.Id = 0;
                        d.IdPedido = pedido.Id;

                        _dbcontext.PedidosDetalles.Add(d);
                        await _dbcontext.SaveChangesAsync();

                        idMapping[tempId] = d.Id;
                    }
                }

                // update procesos
                var nuevosProc = pedidosDetalleProceso.ToList();
                var idsProc = nuevosProc.Select(p => p.Id).ToList();

                var eliminarProc = pedidoExistente.PedidosDetalleProcesos
                    .Where(p => !idsProc.Contains(p.Id))
                    .ToList();

                _dbcontext.PedidosDetalleProcesos.RemoveRange(eliminarProc);

                foreach (var p in nuevosProc)
                {
                    var procExist = pedidoExistente.PedidosDetalleProcesos.FirstOrDefault(x => x.Id == p.Id);

                    if (procExist != null)
                    {
                        procExist.Cantidad = p.Cantidad;
                        procExist.IdCategoria = p.IdCategoria;
                        procExist.Comentarios = p.Comentarios;
                        procExist.Descripcion = p.Descripcion;
                        procExist.Especificacion = p.Especificacion;
                        procExist.IdColor = p.IdColor;
                        procExist.SubTotal = p.SubTotal;
                        procExist.IdEstado = p.IdEstado;
                        procExist.IdTipo = p.IdTipo;
                        procExist.PrecioUnitario = p.PrecioUnitario;
                        procExist.IdUnidadMedida = p.IdUnidadMedida;
                        procExist.IdProveedor = p.IdProveedor;
                        procExist.IdProducto = p.IdProducto;
                        procExist.IdInsumo = p.IdInsumo;
                        procExist.CantidadUsadaStock = p.CantidadUsadaStock;
                        procExist.FechaActualizacion = DateTime.Now;
                    }
                    else
                    {
                        p.IdPedido = pedido.Id;

                        if (p.IdDetalle.HasValue && idMapping.TryGetValue(p.IdDetalle.Value, out int realId))
                            p.IdDetalle = realId;

                        p.Id = 0;
                        _dbcontext.PedidosDetalleProcesos.Add(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();

                await AplicarUsoStockPedido(pedidoExistente, nuevosDetalles, nuevosProc);
                await _dbcontext.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }


        /* ============================================================
           UPDATE SIMPLE DETALLE PROCESO
        ============================================================ */

        public async Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso)
        {
            try
            {
                var existe = await _dbcontext.PedidosDetalleProcesos
                    .FirstOrDefaultAsync(x => x.Id == pedidosDetalleProceso.Id);

                if (existe == null)
                    return false;

                existe.Cantidad = pedidosDetalleProceso.Cantidad;
                existe.Comentarios = pedidosDetalleProceso.Comentarios;
                existe.Descripcion = pedidosDetalleProceso.Descripcion;
                existe.Especificacion = pedidosDetalleProceso.Especificacion;
                existe.IdColor = pedidosDetalleProceso.IdColor;
                existe.IdEstado = pedidosDetalleProceso.IdEstado;
                existe.FechaActualizacion = DateTime.Now;

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        /* ============================================================
           LISTAR Y OBTENER
        ============================================================ */

        public async Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto)
        {
            return await _dbcontext.PedidosDetalles
                .FirstOrDefaultAsync(x => x.IdPedido == IdPedido && x.IdProducto == IdProducto);
        }

        public async Task<List<Pedido>> ObtenerPedidos(
            DateTime FechaDesde, DateTime FechaHasta, int IdCliente, string Estado, int Finalizado)
        {
            try
            {
                if (FechaHasta != DateTime.MinValue)
                    FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                var q = _dbcontext.Pedidos
                    .AsNoTracking()
                    .Include(x => x.IdClienteNavigation)
                    .Include(x => x.IdFormaPagoNavigation)
                    .Include(x => x.PedidosDetalleProcesos)
                        .ThenInclude(x => x.IdEstadoNavigation)
                    .AsQueryable();

                if (FechaDesde != DateTime.MinValue && IdCliente == -1)
                    q = q.Where(x => x.Fecha >= FechaDesde);

                if (FechaHasta != DateTime.MinValue && IdCliente == -1)
                    q = q.Where(x => x.Fecha <= FechaHasta);

                if (IdCliente != -1)
                    q = q.Where(x => x.IdCliente == IdCliente);

                if (Finalizado != -1)
                    q = q.Where(x => x.Finalizado == Finalizado);

                if (!string.Equals(Estado, "TODOS", StringComparison.OrdinalIgnoreCase))
                {
                    if (Estado == "ENTREGAR")
                        q = q.Where(x => x.Saldo <= 0);
                    else if (Estado == "EN PROCESO")
                        q = q.Where(x => x.Saldo >= 0);
                }

                return await q
                    .OrderByDescending(x => x.Fecha)
                    .ThenByDescending(x => x.Id)
                    .ToListAsync();
            }
            catch
            {
                return new List<Pedido>();
            }
        }

        public async Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesosFiltrado(bool incluirFinalizados)
        {
            try
            {
                var q = _dbcontext.PedidosDetalleProcesos
                    .AsNoTracking()
                    .Include(x => x.IdCategoriaNavigation)
                    .Include(x => x.IdPedidoNavigation).ThenInclude(p => p.IdClienteNavigation)
                    .Include(x => x.IdProductoNavigation)
                    .Include(x => x.IdEstadoNavigation)
                    .Include(x => x.IdProveedorNavigation)
                    .Include(x => x.IdInsumoNavigation).ThenInclude(p => p.IdCategoriaNavigation)
                    .Include(x => x.IdColorNavigation)
                    .AsQueryable();

                if (!incluirFinalizados)
                {
                    q = q.Where(x =>
                        x.IdEstadoNavigation == null ||
                        !EF.Functions.Like(x.IdEstadoNavigation.Nombre, "%FINALIZ%"));
                }

                return await q.ToListAsync();
            }
            catch
            {
                return new List<PedidosDetalleProceso>();
            }
        }

        public async Task<List<PedidosDetalleProceso>> ObtenerDetalleProcesos()
        {
            try
            {
                return await _dbcontext.PedidosDetalleProcesos
                    .Include(x => x.IdCategoriaNavigation)
                    .Include(x => x.IdProductoNavigation)
                    .Include(x => x.IdEstadoNavigation)
                    .Include(x => x.IdProveedorNavigation)
                    .Include(x => x.IdInsumoNavigation).ThenInclude(x => x.IdCategoriaNavigation)
                    .Include(x => x.IdColorNavigation)
                    .ToListAsync();
            }
            catch
            {
                return new List<PedidosDetalleProceso>();
            }
        }

        public async Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo)
        {
            return await _dbcontext.PedidosDetalleProcesos
                .FirstOrDefaultAsync(x => x.IdPedido == IdPedido && x.IdInsumo == IdInsumo);
        }

        public async Task<Pedido> ObtenerPedido(int pedidoId)
        {
            try
            {
                return await _dbcontext.Pedidos
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdFormaPagoNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(d => d.IdProductoNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(d => d.IdColorNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(d => d.IdCategoriaNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdProductoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdColorNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdCategoriaNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdInsumoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdTipoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdProveedorNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdEstadoNavigation)
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(dp => dp.IdUnidadMedidaNavigation)
                    .FirstOrDefaultAsync(p => p.Id == pedidoId);
            }
            catch
            {
                return null;
            }
        }

        /* ============================================================
           ELIMINAR
        ============================================================ */

        public async Task<bool> EliminarInsumo(int IdPedido, int IdInsumo)
        {
            try
            {
                var model = _dbcontext.PedidosDetalleProcesos
                    .First(c => c.IdPedido == IdPedido && c.IdInsumo == IdInsumo);

                _dbcontext.PedidosDetalleProcesos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> EliminarProducto(int IdPedido, int IdProducto)
        {
            try
            {
                var model = _dbcontext.PedidosDetalles
                    .First(c => c.IdPedido == IdPedido && c.IdProducto == IdProducto);

                _dbcontext.PedidosDetalles.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> EliminarPedido(int id)
        {
            await using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // revert stock
                await RevertirUsoStockPedido(id);

                var model = _dbcontext.Pedidos.First(c => c.Id == id);
                _dbcontext.Pedidos.Remove(model);

                await _dbcontext.SaveChangesAsync();
                await tx.CommitAsync();

                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }
    }
}
