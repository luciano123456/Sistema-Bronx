using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.Repository
{
    public class StockRepository : IStockRepository
    {
        private readonly SistemaBronxContext _db;

        public StockRepository(SistemaBronxContext db)
        {
            _db = db;
        }
        // ============================================================
        // REGISTRAR MOVIMIENTO
        // ============================================================
        public async Task<bool> RegistrarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                // ----- CABECERA -----
                mov.Id = 0; // por las dudas, que lo maneje el identity
                mov.Fecha = DateTime.Now;
                mov.FechaAlta = DateTime.Now;

                _db.StockMovimientos.Add(mov);
                await _db.SaveChangesAsync();   // acá ya tenés mov.Id

                // ----- DETALLE -----
                foreach (var det in detalles)
                {
                    // Crear un NUEVO detalle, no usar el que viene del body
                    var nuevoDet = new StockMovimientosDetalle
                    {
                        // NUNCA seteamos Id
                        IdMovimiento = mov.Id,

                        // En tu base: 'P' / 'I' (char(1))
                        TipoItem = det.TipoItem,      // ya tiene 'P' o 'I'
                        IdProducto = det.IdProducto,
                        IdInsumo = det.IdInsumo,

                        Cantidad = det.Cantidad,
                        CostoUnitario = det.CostoUnitario
                        // SubTotal NO se setea: lo calcula la computed column
                    };

                    _db.StockMovimientosDetalles.Add(nuevoDet);

                    // Usamos nuevoDet para aplicar al saldo
                    await AplicarMovimientoASaldo(nuevoDet, mov.IdTipoMovimiento == 1);
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        // ============================================================
        // MODIFICAR MOVIMIENTO
        // ============================================================
        public async Task<bool> ModificarMovimiento(StockMovimiento nuevoMov, List<StockMovimientosDetalle> nuevosDetalles)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var oldMov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .FirstOrDefaultAsync(m => m.Id == nuevoMov.Id);

                if (oldMov == null) return false;

                // REVERTIR TODO EL MOVIMIENTO ANTERIOR
                foreach (var oldDet in oldMov.StockMovimientosDetalles)
                {
                    await AplicarMovimientoASaldo(oldDet, (oldMov.IdTipoMovimiento == 1), revertir: true);
                }

                // ACTUALIZAR CABECERA
                oldMov.Fecha = nuevoMov.Fecha;
                oldMov.IdTipoMovimiento = nuevoMov.IdTipoMovimiento;
                oldMov.Comentario = nuevoMov.Comentario;

                // BORRAR DETALLES VIEJOS
                _db.StockMovimientosDetalles.RemoveRange(oldMov.StockMovimientosDetalles);

                // GUARDAR DETALLES NUEVOS
                foreach (var det in nuevosDetalles)
                {
                    det.IdMovimiento = oldMov.Id;
                    det.SubTotal = (det.CostoUnitario ?? 0) * det.Cantidad;

                    _db.StockMovimientosDetalles.Add(det);
                    await AplicarMovimientoASaldo(det, nuevoMov.IdTipoMovimiento == 1);
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        // ============================================================
        // ANULAR MOVIMIENTO
        // ============================================================
        public async Task<bool> AnularMovimiento(int idMovimiento)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .FirstOrDefaultAsync(m => m.Id == idMovimiento);

                if (mov == null) return false;

                // REVERTIR SALDO
                foreach (var det in mov.StockMovimientosDetalles)
                {
                    await AplicarMovimientoASaldo(det, mov.IdTipoMovimiento == 1, revertir: true);
                }

                mov.EsAnulado = true;
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        // ============================================================
        // ELIMINAR MOVIMIENTO
        // ============================================================
        public async Task<bool> EliminarMovimiento(int idMovimiento)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .FirstOrDefaultAsync(m => m.Id == idMovimiento);

                if (mov == null) return false;

                // REVERTIR SALDO
                foreach (var det in mov.StockMovimientosDetalles)
                {
                    await AplicarMovimientoASaldo(det, mov.IdTipoMovimiento == 1, revertir: true);
                }

                _db.StockMovimientosDetalles.RemoveRange(mov.StockMovimientosDetalles);
                _db.StockMovimientos.Remove(mov);

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                return false;
            }
        }

        // ============================================================
        // APLICAR O REVERTIR SALDO
        // ============================================================
        private async Task AplicarMovimientoASaldo(StockMovimientosDetalle det, bool esEntrada, bool revertir = false)
        {
            var signo = esEntrada ? 1 : -1;
            if (revertir) signo *= -1;

            var cantidad = det.Cantidad * signo;

            var saldo = await _db.StockSaldos.FirstOrDefaultAsync(s =>
                s.TipoItem == det.TipoItem &&
                s.IdProducto == det.IdProducto &&
                s.IdInsumo == det.IdInsumo
            );

            if (saldo == null)
            {
                saldo = new StockSaldo
                {
                    TipoItem = det.TipoItem,
                    IdProducto = det.IdProducto,
                    IdInsumo = det.IdInsumo,
                    CantidadActual = cantidad,
                    FechaUltMovimiento = DateTime.Now
                };
                _db.StockSaldos.Add(saldo);
            }
            else
            {
                saldo.CantidadActual += cantidad;
                saldo.FechaUltMovimiento = DateTime.Now;
                _db.StockSaldos.Update(saldo);
            }
        }

        // ============================================================
        // CONSULTAS
        // ============================================================
        public async Task<List<StockMovimiento>> ObtenerMovimientos()
        {
            return await _db.StockMovimientos
                .Include(m => m.StockMovimientosDetalles)
                .OrderByDescending(m => m.Fecha)
                .ToListAsync();
        }

        public async Task<StockMovimiento?> ObtenerMovimiento(int id)
        {
            return await _db.StockMovimientos
                .Include(m => m.StockMovimientosDetalles)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<List<StockSaldo>> ObtenerSaldos()
        {
            return await _db.StockSaldos
                .Include(s => s.IdProductoNavigation)
                .Include(s => s.IdInsumoNavigation)
                .OrderBy(s => s.TipoItem)
                .ToListAsync();
        }

        public async Task<StockSaldo?> ObtenerSaldoItem(string tipoItem, int? idProducto, int? idInsumo)
        {
            return await _db.StockSaldos.FirstOrDefaultAsync(s =>
                s.TipoItem == tipoItem &&
                s.IdProducto == idProducto &&
                s.IdInsumo == idInsumo
            );
        }
    }
}
