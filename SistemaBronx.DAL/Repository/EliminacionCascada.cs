using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.Repository
{
    /// <summary>
    /// Eliminación en cascada de Productos e Insumos.
    /// La BD no tiene ON DELETE CASCADE hacia estas tablas, así que se borran explícitamente
    /// los registros dependientes (pedidos, cotizaciones, stock, fichas de producto) dentro de una transacción.
    /// </summary>
    internal static class EliminacionCascada
    {
        // ======================================================
        // PRODUCTO
        // ======================================================
        public static async Task<ResultadoEliminacion> EliminarProductoAsync(SistemaBronxContext db, int id, bool cascada)
        {
            var res = new ResultadoEliminacion();

            if (!await db.Productos.AnyAsync(p => p.Id == id))
            {
                res.Error = "El producto no existe.";
                return res;
            }

            res.Detalle = await DetalleProductoAsync(db, id);
            if (res.Detalle.Count > 0 && !cascada)
            {
                res.EnUso = true;
                return res;
            }

            using var tx = await db.Database.BeginTransactionAsync();
            try
            {
                // Vínculos pedido <-> movimiento de stock de este producto
                var movDetIds = db.StockMovimientosDetalles.Where(m => m.IdProducto == id).Select(m => m.Id);
                await db.PedidosDetalleStocks.Where(s => movDetIds.Contains(s.IdStockMovimientoDetalle)).ExecuteDeleteAsync();
                await db.PedidosDetalleProcesosStocks.Where(s => movDetIds.Contains(s.IdStockMovimientoDetalle)).ExecuteDeleteAsync();

                // Pedidos: líneas de producto + sus insumos (procesos) + líneas sueltas que referencian el producto
                var pedDetIds = db.PedidosDetalles.Where(d => d.IdProducto == id).Select(d => d.Id);
                var pedProcIds = db.PedidosDetalleProcesos
                    .Where(p => p.IdProducto == id || pedDetIds.Select(x => (int?)x).Contains(p.IdDetalle))
                    .Select(p => p.Id);

                await db.PedidosDetalleProcesosStocks.Where(s => pedProcIds.Contains(s.IdPedidoDetalleProceso)).ExecuteDeleteAsync();
                await db.PedidosDetalleStocks.Where(s => pedDetIds.Contains(s.IdPedidoDetalle)).ExecuteDeleteAsync();
                await db.PedidosDetalleProcesos
                    .Where(p => p.IdProducto == id || pedDetIds.Select(x => (int?)x).Contains(p.IdDetalle))
                    .ExecuteDeleteAsync();
                await db.PedidosDetalles.Where(d => d.IdProducto == id).ExecuteDeleteAsync();

                // Cotizaciones
                var cotDetIds = db.CotizacionesDetalles.Where(d => d.IdProducto == id).Select(d => d.Id);
                await db.CotizacionesDetalleProcesos
                    .Where(p => p.IdProducto == id || cotDetIds.Select(x => (int?)x).Contains(p.IdDetalle))
                    .ExecuteDeleteAsync();
                await db.CotizacionesDetalles.Where(d => d.IdProducto == id).ExecuteDeleteAsync();

                // Stock
                await EliminarMovimientosStockAsync(db, db.StockMovimientosDetalles.Where(m => m.IdProducto == id));
                await db.StockSaldos.Where(s => s.IdProducto == id).ExecuteDeleteAsync();

                // Ficha (insumos del producto) y el producto
                await db.ProductosInsumos.Where(pi => pi.IdProducto == id).ExecuteDeleteAsync();
                await db.Productos.Where(p => p.Id == id).ExecuteDeleteAsync();

                await tx.CommitAsync();
                res.Eliminado = true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine($"Error en EliminarProductoAsync: {ex}");
                res.Error = ex.Message;
            }

            return res;
        }

        private static async Task<List<string>> DetalleProductoAsync(SistemaBronxContext db, int id)
        {
            var detalle = new List<string>();

            int pedidos = await db.PedidosDetalles.Where(d => d.IdProducto == id).Select(d => d.IdPedido)
                .Union(db.PedidosDetalleProcesos.Where(p => p.IdProducto == id).Select(p => p.IdPedido))
                .Distinct().CountAsync();
            int cotizaciones = await db.CotizacionesDetalles.Where(d => d.IdProducto == id).Select(d => d.IdCotizacion)
                .Union(db.CotizacionesDetalleProcesos.Where(p => p.IdProducto == id).Select(p => p.IdCotizacion))
                .Distinct().CountAsync();
            int movimientos = await db.StockMovimientosDetalles.CountAsync(m => m.IdProducto == id);
            int saldos = await db.StockSaldos.CountAsync(s => s.IdProducto == id);

            if (pedidos > 0) detalle.Add($"{pedidos} pedido(s)");
            if (cotizaciones > 0) detalle.Add($"{cotizaciones} cotización(es)");
            if (movimientos > 0) detalle.Add($"{movimientos} movimiento(s) de stock");
            if (saldos > 0) detalle.Add($"{saldos} saldo(s) de stock");

            return detalle;
        }

        // ======================================================
        // INSUMO
        // ======================================================
        public static async Task<ResultadoEliminacion> EliminarInsumoAsync(SistemaBronxContext db, int id, bool cascada)
        {
            var res = new ResultadoEliminacion();

            if (!await db.Insumos.AnyAsync(i => i.Id == id))
            {
                res.Error = "El insumo no existe.";
                return res;
            }

            res.Detalle = await DetalleInsumoAsync(db, id);
            if (res.Detalle.Count > 0 && !cascada)
            {
                res.EnUso = true;
                return res;
            }

            using var tx = await db.Database.BeginTransactionAsync();
            try
            {
                var movDetIds = db.StockMovimientosDetalles.Where(m => m.IdInsumo == id).Select(m => m.Id);
                await db.PedidosDetalleStocks.Where(s => movDetIds.Contains(s.IdStockMovimientoDetalle)).ExecuteDeleteAsync();
                await db.PedidosDetalleProcesosStocks.Where(s => movDetIds.Contains(s.IdStockMovimientoDetalle)).ExecuteDeleteAsync();

                // Pedidos: solo las líneas de insumo (procesos); el producto del pedido se conserva
                var pedProcIds = db.PedidosDetalleProcesos.Where(p => p.IdInsumo == id).Select(p => p.Id);
                await db.PedidosDetalleProcesosStocks.Where(s => pedProcIds.Contains(s.IdPedidoDetalleProceso)).ExecuteDeleteAsync();
                await db.PedidosDetalleProcesos.Where(p => p.IdInsumo == id).ExecuteDeleteAsync();

                await db.CotizacionesDetalleProcesos.Where(p => p.IdInsumo == id).ExecuteDeleteAsync();

                await EliminarMovimientosStockAsync(db, db.StockMovimientosDetalles.Where(m => m.IdInsumo == id));
                await db.StockSaldos.Where(s => s.IdInsumo == id).ExecuteDeleteAsync();

                // Lo saca de la ficha de todos los productos
                await db.ProductosInsumos.Where(pi => pi.IdInsumo == id).ExecuteDeleteAsync();
                await db.Insumos.Where(i => i.Id == id).ExecuteDeleteAsync();

                await tx.CommitAsync();
                res.Eliminado = true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine($"Error en EliminarInsumoAsync: {ex}");
                res.Error = ex.Message;
            }

            return res;
        }

        private static async Task<List<string>> DetalleInsumoAsync(SistemaBronxContext db, int id)
        {
            var detalle = new List<string>();

            int productos = await db.ProductosInsumos.Where(pi => pi.IdInsumo == id).Select(pi => pi.IdProducto).Distinct().CountAsync();
            int pedidos = await db.PedidosDetalleProcesos.Where(p => p.IdInsumo == id).Select(p => p.IdPedido).Distinct().CountAsync();
            int cotizaciones = await db.CotizacionesDetalleProcesos.Where(p => p.IdInsumo == id).Select(p => p.IdCotizacion).Distinct().CountAsync();
            int movimientos = await db.StockMovimientosDetalles.CountAsync(m => m.IdInsumo == id);
            int saldos = await db.StockSaldos.CountAsync(s => s.IdInsumo == id);

            if (productos > 0) detalle.Add($"{productos} producto(s) (ficha de insumos)");
            if (pedidos > 0) detalle.Add($"{pedidos} pedido(s)");
            if (cotizaciones > 0) detalle.Add($"{cotizaciones} cotización(es)");
            if (movimientos > 0) detalle.Add($"{movimientos} movimiento(s) de stock");
            if (saldos > 0) detalle.Add($"{saldos} saldo(s) de stock");

            return detalle;
        }

        // ======================================================
        // Común
        // ======================================================

        /// <summary>
        /// Borra los detalles de movimiento indicados y las cabeceras que hayan quedado sin ningún detalle.
        /// </summary>
        private static async Task EliminarMovimientosStockAsync(SistemaBronxContext db, IQueryable<StockMovimientosDetalle> detalles)
        {
            var movIds = await detalles.Select(d => d.IdMovimiento).Distinct().ToListAsync();
            if (movIds.Count == 0) return;

            await detalles.ExecuteDeleteAsync();

            await db.StockMovimientos
                .Where(m => movIds.Contains(m.Id) && !db.StockMovimientosDetalles.Any(d => d.IdMovimiento == m.Id))
                .ExecuteDeleteAsync();
        }
    }
}
