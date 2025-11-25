using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public class StockRepository : IStockRepository
    {
        private readonly SistemaBronxContext _db;

        public StockRepository(SistemaBronxContext db)
        {
            _db = db;
        }

        /* ============================================================
           HELPERS PRIVADOS
        ============================================================ */

        private async Task<bool> GetEsEntradaAsync(int idTipoMovimiento)
        {
            return await _db.StockTiposMovimientos
                .Where(t => t.Id == idTipoMovimiento)
                .Select(t => t.EsEntrada)
                .FirstOrDefaultAsync();
        }

        private bool EsEntradaLocal(StockMovimiento mov)
        {
            return mov.IdTipoMovimientoNavigation?.EsEntrada ?? false;
        }

        /// <summary>
        /// Aplica o revierte el impacto de un detalle sobre StockSaldos
        /// esEntrada = true => suma stock, false => resta
        /// revertir = true => invierte el signo (deshacer)
        /// </summary>
        private async Task AplicarStock(StockMovimientosDetalle det, bool esEntrada, bool revertir)
        {
            var signo = esEntrada ? 1m : -1m;
            if (revertir) signo *= -1m;

            var delta = det.Cantidad * signo;

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
                    CantidadActual = 0,
                    FechaUltMovimiento = DateTime.Now
                };
                _db.StockSaldos.Add(saldo);
            }

            saldo.CantidadActual += delta;
            saldo.FechaUltMovimiento = DateTime.Now;
        }

        /* ============================================================
           REGISTRAR
        ============================================================ */
        public async Task<bool> RegistrarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> detalles)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                // CABECERA
                mov.Id = 0;
                mov.EsAnulado = false;
                mov.Fecha = DateTime.Now;
                mov.FechaAlta = DateTime.Now;
                mov.StockMovimientosDetalles = null; 

                _db.StockMovimientos.Add(mov);
                await _db.SaveChangesAsync();   // mov.Id listo

                // SIEMPRE obtener el ES_ENTRADA directo desde la DB
                var esEntrada = await GetEsEntradaAsync(mov.IdTipoMovimiento);

                // DETALLE
                foreach (var det in detalles)
                {
                    var nuevoDet = new StockMovimientosDetalle
                    {
                        IdMovimiento = mov.Id,
                        TipoItem = (det.TipoItem ?? "").ToUpper(),
                        IdProducto = det.IdProducto,
                        IdInsumo = det.IdInsumo,
                        Cantidad = det.Cantidad,
                        CostoUnitario = det.CostoUnitario,
                        FechaCreado = DateTime.Now
                    };

                    _db.StockMovimientosDetalles.Add(nuevoDet);

                    // aplicar stock correctamente
                    await AplicarStock(nuevoDet, esEntrada, false);
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

        /* ============================================================
           MODIFICAR
        ============================================================ */
        public async Task<bool> ModificarMovimiento(StockMovimiento mov, List<StockMovimientosDetalle> nuevosDetalles)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var existente = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .Include(m => m.IdTipoMovimientoNavigation)
                    .FirstOrDefaultAsync(m => m.Id == mov.Id);

                if (existente == null)
                    return false;

                // 1) Revertir impacto anterior SOLO si estaba activo
                if (!existente.EsAnulado)
                {
                    var esEntradaViejo = EsEntradaLocal(existente)
                        || await GetEsEntradaAsync(existente.IdTipoMovimiento);

                    foreach (var detViejo in existente.StockMovimientosDetalles)
                    {
                        await AplicarStock(detViejo, esEntradaViejo, revertir: true);
                    }
                }

                // 2) Actualizar cabecera (mantengo FechaAlta)
                existente.Fecha = mov.Fecha;
                existente.IdTipoMovimiento = mov.IdTipoMovimiento;
                existente.Comentario = mov.Comentario;
                existente.IdUsuario = mov.IdUsuario;
                existente.EsAnulado = false;    // al modificar, queda activo

                // 3) Borrar detalles viejos
                _db.StockMovimientosDetalles.RemoveRange(existente.StockMovimientosDetalles);

                // 4) Insertar nuevos detalles y aplicar stock
                var esEntradaNuevo = await GetEsEntradaAsync(mov.IdTipoMovimiento);

                foreach (var det in nuevosDetalles)
                {
                    var nuevoDet = new StockMovimientosDetalle
                    {
                        IdMovimiento = existente.Id,
                        TipoItem = (det.TipoItem ?? "").ToUpper(),
                        IdProducto = det.IdProducto,
                        IdInsumo = det.IdInsumo,
                        Cantidad = det.Cantidad,
                        CostoUnitario = det.CostoUnitario,
                        FechaCreado = DateTime.Now
                    };

                    _db.StockMovimientosDetalles.Add(nuevoDet);
                    await AplicarStock(nuevoDet, esEntradaNuevo, revertir: false);
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

        /* ============================================================
           ANULAR
        ============================================================ */
        public async Task<bool> AnularMovimiento(int idMovimiento)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .Include(m => m.IdTipoMovimientoNavigation)
                    .FirstOrDefaultAsync(m => m.Id == idMovimiento);

                if (mov == null)
                    return false;

                if (mov.EsAnulado)
                    return true; // ya estaba anulado

                var esEntrada = EsEntradaLocal(mov)
                    || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                // Revertir impacto
                foreach (var det in mov.StockMovimientosDetalles)
                {
                    await AplicarStock(det, esEntrada, revertir: true);
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

        /* ============================================================
           RESTAURAR (quitar anulación)
        ============================================================ */
        public async Task<bool> RestaurarMovimiento(int idMovimiento)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .Include(m => m.IdTipoMovimientoNavigation)
                    .FirstOrDefaultAsync(m => m.Id == idMovimiento);

                if (mov == null)
                    return false;

                if (!mov.EsAnulado)
                    return true; // ya estaba activo

                var esEntrada = EsEntradaLocal(mov)
                    || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                // Volver a aplicar impacto
                foreach (var det in mov.StockMovimientosDetalles)
                {
                    await AplicarStock(det, esEntrada, revertir: false);
                }

                mov.EsAnulado = false;

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

        /* ============================================================
           ELIMINAR
        ============================================================ */
        public async Task<bool> EliminarMovimiento(int idMovimiento)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.StockMovimientos
                    .Include(m => m.StockMovimientosDetalles)
                    .Include(m => m.IdTipoMovimientoNavigation)
                    .FirstOrDefaultAsync(m => m.Id == idMovimiento);

                if (mov == null)
                    return false;

                // Si NO está anulado, primero revertimos el impacto
                if (!mov.EsAnulado)
                {
                    var esEntrada = EsEntradaLocal(mov)
                        || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                    foreach (var det in mov.StockMovimientosDetalles)
                    {
                        await AplicarStock(det, esEntrada, revertir: true);
                    }
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

        /* ============================================================
   ELIMINAR DETALLE (NO CABECERA)
============================================================ */
        public async Task<bool> EliminarDetalleMovimiento(int idDetalle)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var det = await _db.StockMovimientosDetalles
                    .Include(d => d.IdMovimientoNavigation)
                    .ThenInclude(m => m.IdTipoMovimientoNavigation)
                    .FirstOrDefaultAsync(d => d.Id == idDetalle);

                if (det == null)
                    return false;

                var mov = det.IdMovimientoNavigation;

                // si el movimiento está anulado, no deberíamos tocar stock
                if (mov.EsAnulado)
                    return false;

                // mismo criterio que usás en Anular / Restaurar
                var esEntrada = EsEntradaLocal(mov)
                    || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                // Revertir el impacto de ESTE detalle en StockSaldos
                await AplicarStock(det, esEntrada, revertir: true);

                // Eliminar el detalle
                _db.StockMovimientosDetalles.Remove(det);

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


        /* ============================================================
           CONSULTAS
        ============================================================ */
        public async Task<List<StockMovimiento>> ObtenerMovimientos()
        {
            return await _db.StockMovimientos
                .Include(m => m.StockMovimientosDetalles)
                .Include(m => m.IdTipoMovimientoNavigation)
                .OrderByDescending(m => m.Fecha)
                .ToListAsync();
        }

        public async Task<StockMovimiento?> ObtenerMovimiento(int id)
        {
            return await _db.StockMovimientos
                .Where(m => m.Id == id)

                // Tipo de movimiento
                .Include(m => m.IdTipoMovimientoNavigation)

                // Detalles
                .Include(m => m.StockMovimientosDetalles)
                    .ThenInclude(d => d.IdProductoNavigation)

                .Include(m => m.StockMovimientosDetalles)
                    .ThenInclude(d => d.IdInsumoNavigation)

                .FirstOrDefaultAsync();
        }

        public async Task<List<StockSaldo>> ObtenerSaldos()
        {
            return await _db.StockSaldos
                .Include(s => s.IdProductoNavigation)
                .Include(s => s.IdInsumoNavigation)
                .OrderBy(s => s.TipoItem)
                .ThenBy(s => s.IdProducto ?? s.IdInsumo)
                .ToListAsync();
        }

        public async Task<StockSaldo?> ObtenerSaldoItem(string tipoItem, int? idProducto, int? idInsumo)
        {
            tipoItem = (tipoItem ?? "").ToUpper();

            return await _db.StockSaldos.FirstOrDefaultAsync(s =>
                s.TipoItem == tipoItem &&
                s.IdProducto == idProducto &&
                s.IdInsumo == idInsumo
            );
        }

        public async Task<List<StockMovimiento>> ObtenerMovimientosItem(string tipoItem, int? idProducto, int? idInsumo)
        {
            tipoItem = (tipoItem ?? "").ToUpper();

            var query = _db.StockMovimientos
                .Include(m => m.StockMovimientosDetalles)
                .Include(m => m.IdTipoMovimientoNavigation)
                .AsQueryable();

            query = query.Where(m =>
                m.StockMovimientosDetalles.Any(d =>
                    d.TipoItem == tipoItem &&
                    d.IdProducto == idProducto &&
                    d.IdInsumo == idInsumo
                ));

            return await query
                .OrderBy(m => m.Fecha)
                .ToListAsync();
        }
    }


}
