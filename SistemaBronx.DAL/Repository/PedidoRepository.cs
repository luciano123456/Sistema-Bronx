using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.Repository
{
    public class PedidoRepository : IPedidosRepository<Pedido>
    {
        private readonly SistemaBronxContext _dbcontext;

        private const string STOCK_PEDIDO_PREFIX = "PEDIDO NRO: #";
        private const string STOCK_PEDIDO_PREFIX_DEVOLUCION = "DEVOLUCION PEDIDO NRO: #";
      

        public PedidoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        /* ============================================================
           HELPERS PRIVADOS STOCK
        ============================================================ */

        private string BuildComentarioStockPedido(int idPedido)
            => $"{STOCK_PEDIDO_PREFIX}{idPedido}";

        private string BuildComentarioStockPedidoDevolucion(int idPedido)
           => $"{STOCK_PEDIDO_PREFIX_DEVOLUCION}{idPedido}";

        private string BuildKey(string tipoItem, int? idProducto, int? idInsumo)
            => $"{(tipoItem ?? string.Empty).ToUpper()}|{idProducto}|{idInsumo}";

        private async Task<int> ObtenerIdTipoMovimientoSalidaAsync()
        {
            try
            {
                // 🔥 Traemos a memoria SOLO lo necesario
                var lista = await _dbcontext.StockTiposMovimientos
                    .Where(x => !x.EsEntrada && x.Nombre != null)
                    .Select(x => new { x.Id, x.Nombre })
                    .ToListAsync();

                // =====================================================
                // 🔥 1. BUSCAR PEDIDO
                // =====================================================
                var item = lista
                    .FirstOrDefault(x => x.Nombre.ToUpper().Contains("PEDIDO"));

                if (item != null)
                    return item.Id;

                // =====================================================
                // 🔥 2. BUSCAR SALIDA
                // =====================================================
                item = lista
                    .FirstOrDefault(x => x.Nombre.ToUpper().Contains("SALIDA"));

                if (item != null)
                    return item.Id;

                // =====================================================
                // 🔥 3. PRIMERO DISPONIBLE
                // =====================================================
                var fallback = lista
                    .OrderBy(x => x.Id)
                    .FirstOrDefault();

                if (fallback != null)
                    return fallback.Id;

                throw new Exception("No existe ningún tipo de movimiento de salida.");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                throw;
            }
        }

        private async Task<bool> GetEsEntradaAsync(int idTipoMovimiento)
        {
            return await _dbcontext.StockTiposMovimientos
                .Where(t => t.Id == idTipoMovimiento)
                .Select(t => t.EsEntrada)
                .FirstOrDefaultAsync();
        }

        private bool EsEntradaLocal(StockMovimiento mov)
        {
            return mov.IdTipoMovimientoNavigation?.EsEntrada ?? false;
        }

        private async Task AplicarStockAsync(StockMovimientosDetalle det, bool esEntrada, bool revertir)
        {
            var signo = esEntrada ? 1m : -1m;
            if (revertir) signo *= -1m;

            var delta = det.Cantidad * signo;

            var saldo = await _dbcontext.StockSaldos.FirstOrDefaultAsync(s =>
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
                _dbcontext.StockSaldos.Add(saldo);
            }

            saldo.CantidadActual += delta;
            saldo.FechaUltMovimiento = DateTime.Now;
        }

        private async Task<StockMovimiento?> ObtenerMovimientoStockPedidoAsync(int idPedido)
        {
            string marcador = BuildComentarioStockPedido(idPedido);

            return await _dbcontext.StockMovimientos
                .Include(x => x.StockMovimientosDetalles)
                .Include(x => x.IdTipoMovimientoNavigation)
                .FirstOrDefaultAsync(x => x.Comentario != null && x.Comentario.StartsWith(marcador));
        }

        private List<StockMovimientosDetalle> ConstruirDetallesStockPedido(
            List<PedidosDetalle> pedidosDetalle,
            List<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            var salida = new List<StockMovimientosDetalle>();

            /* ============================================================
               1) PRODUCTOS - SOLO LO USADO REALMENTE DE STOCK
            ============================================================ */
            foreach (var det in pedidosDetalle
                .Where(x => x.IdProducto.HasValue && (x.CantidadUsadaStock ?? 0) > 0))
            {
                salida.Add(new StockMovimientosDetalle
                {
                    TipoItem = "P",
                    IdProducto = det.IdProducto,
                    IdInsumo = null,
                    Cantidad = det.CantidadUsadaStock ?? 0,
                    CostoUnitario = det.CostoUnitario ?? 0,
                    FechaCreado = DateTime.Now
                });
            }

            /* ============================================================
               2) INSUMOS - SOLO LO USADO REALMENTE DE STOCK
            ============================================================ */
            foreach (var proc in pedidosDetalleProceso
                .Where(x => x.IdInsumo.HasValue && (x.CantidadUsadaStock ?? 0) > 0))
            {
                salida.Add(new StockMovimientosDetalle
                {
                    TipoItem = "I",
                    IdProducto = null,
                    IdInsumo = proc.IdInsumo,
                    Cantidad = proc.CantidadUsadaStock ?? 0,
                    CostoUnitario = proc.PrecioUnitario ?? 0,
                    FechaCreado = DateTime.Now
                });
            }

            /* ============================================================
               3) AGRUPAR
            ============================================================ */
            return salida
                .Where(x => x.Cantidad > 0)
                .GroupBy(x => new { x.TipoItem, x.IdProducto, x.IdInsumo })
                .Select(g => new StockMovimientosDetalle
                {
                    TipoItem = g.Key.TipoItem,
                    IdProducto = g.Key.IdProducto,
                    IdInsumo = g.Key.IdInsumo,
                    Cantidad = g.Sum(x => x.Cantidad),
                    CostoUnitario = g.OrderByDescending(x => x.CostoUnitario)
                                     .Select(x => x.CostoUnitario)
                                     .FirstOrDefault(),
                    FechaCreado = DateTime.Now
                })
                .ToList();
        }

        private async Task<(bool ok, List<string> errores)> ValidarStockInternoAsync(
     List<PedidosDetalle> pedidosDetalle,
     List<PedidosDetalleProceso> pedidosDetalleProceso,
     int? idPedidoActual = null)
        {
            var errores = new List<string>();

            // =========================================================
            // 1) REQUERIDOS NUEVOS
            // =========================================================
            var requeridos = ConstruirDetallesStockPedido(pedidosDetalle, pedidosDetalleProceso);

            // =========================================================
            // 2) LO QUE YA TIENE CONSUMIDO ESTE PEDIDO EN DB
            // =========================================================
            var consumidoActual = new Dictionary<string, decimal>();

            if (idPedidoActual.HasValue && idPedidoActual.Value > 0)
            {
                var detallesDb = await _dbcontext.PedidosDetalles
                    .Where(x =>
                        x.IdPedido == idPedidoActual.Value &&
                        x.IdProducto.HasValue &&
                        (x.CantidadUsadaStock ?? 0) > 0)
                    .ToListAsync();

                foreach (var d in detallesDb)
                {
                    var key = BuildKey("P", d.IdProducto, null);

                    if (!consumidoActual.ContainsKey(key))
                        consumidoActual[key] = 0;

                    consumidoActual[key] += d.CantidadUsadaStock ?? 0;
                }

                var procesosDb = await _dbcontext.PedidosDetalleProcesos
                    .Where(x =>
                        x.IdPedido == idPedidoActual.Value &&
                        x.IdInsumo.HasValue &&
                        (x.CantidadUsadaStock ?? 0) > 0)
                    .ToListAsync();

                foreach (var p in procesosDb)
                {
                    var key = BuildKey("I", null, p.IdInsumo);

                    if (!consumidoActual.ContainsKey(key))
                        consumidoActual[key] = 0;

                    consumidoActual[key] += p.CantidadUsadaStock ?? 0;
                }
            }

            // =========================================================
            // 3) VALIDAR
            // =========================================================
            foreach (var item in requeridos)
            {
                decimal disponible = await _dbcontext.StockSaldos
                    .Where(s =>
                        s.TipoItem == item.TipoItem &&
                        s.IdProducto == item.IdProducto &&
                        s.IdInsumo == item.IdInsumo)
                    .Select(s => s.CantidadActual)
                    .FirstOrDefaultAsync();

                var key = BuildKey(item.TipoItem, item.IdProducto, item.IdInsumo);

                // 🔥 CLAVE: devolver lo que ya estaba consumido por ESTE pedido
                if (consumidoActual.TryGetValue(key, out decimal usado))
                    disponible += usado;

                string nombre = string.Empty;

                if (item.TipoItem == "P" && item.IdProducto.HasValue)
                {
                    nombre = await _dbcontext.Productos
                        .Where(x => x.Id == item.IdProducto.Value)
                        .Select(x => x.Nombre)
                        .FirstOrDefaultAsync() ?? $"Producto #{item.IdProducto.Value}";
                }
                else if (item.TipoItem == "I" && item.IdInsumo.HasValue)
                {
                    nombre = await _dbcontext.Insumos
                        .Where(x => x.Id == item.IdInsumo.Value)
                        .Select(x => x.Descripcion)
                        .FirstOrDefaultAsync() ?? $"Insumo #{item.IdInsumo.Value}";
                }

                if (disponible < item.Cantidad)
                {
                    var faltante = item.Cantidad - disponible;

                    errores.Add(
                        item.TipoItem == "P"
                            ? $"Stock insuficiente del producto '{nombre}'. Solicitado: {item.Cantidad:N2} / Disponible: {disponible:N2} / Faltante: {faltante:N2}"
                            : $"Stock insuficiente del insumo '{nombre}'. Solicitado: {item.Cantidad:N2} / Disponible: {disponible:N2} / Faltante: {faltante:N2}"
                    );
                }
            }

            return (errores.Count == 0, errores);
        }
        private async Task EliminarRelacionesStockPedidoAsync(int idPedido)
        {
            var idsDetalles = await _dbcontext.PedidosDetalles
                .Where(x => x.IdPedido == idPedido)
                .Select(x => x.Id)
                .ToListAsync();

            if (idsDetalles.Any())
            {
                var relacionesDetalle = await _dbcontext.PedidosDetalleStocks
                    .Where(x => idsDetalles.Contains(x.IdPedidoDetalle))
                    .ToListAsync();

                if (relacionesDetalle.Any())
                    _dbcontext.PedidosDetalleStocks.RemoveRange(relacionesDetalle);
            }

            var idsProcesos = await _dbcontext.PedidosDetalleProcesos
                .Where(x => x.IdPedido == idPedido)
                .Select(x => x.Id)
                .ToListAsync();

            if (idsProcesos.Any())
            {
                var relacionesProceso = await _dbcontext.PedidosDetalleProcesosStocks
                    .Where(x => idsProcesos.Contains(x.IdPedidoDetalleProceso))
                    .ToListAsync();

                if (relacionesProceso.Any())
                    _dbcontext.PedidosDetalleProcesosStocks.RemoveRange(relacionesProceso);
            }
        }

        private async Task CrearRelacionesStockPedidoAsync(int idPedido, int idMovimiento)
        {
            var stockDetalles = await _dbcontext.StockMovimientosDetalles
                .Where(x => x.IdMovimiento == idMovimiento)
                .ToListAsync();

            var dictStock = stockDetalles.ToDictionary(
                x => BuildKey(x.TipoItem, x.IdProducto, x.IdInsumo),
                x => x
            );

            var detallesPedido = await _dbcontext.PedidosDetalles
                .Where(x => x.IdPedido == idPedido && x.IdProducto.HasValue && (x.CantidadUsadaStock ?? 0) > 0)
                .ToListAsync();

            foreach (var det in detallesPedido)
            {
                var key = BuildKey("P", det.IdProducto, null);

                if (dictStock.TryGetValue(key, out var movDet))
                {
                    _dbcontext.PedidosDetalleStocks.Add(new PedidosDetalleStock
                    {
                        IdPedidoDetalle = det.Id,
                        IdStockMovimientoDetalle = movDet.Id,
                        CantidadUsada = det.CantidadUsadaStock ?? 0
                    });
                }
            }

            var procesosPedido = await _dbcontext.PedidosDetalleProcesos
                .Where(x => x.IdPedido == idPedido && x.IdInsumo.HasValue && (x.CantidadUsadaStock ?? 0) > 0)
                .ToListAsync();

            foreach (var proc in procesosPedido)
            {
                var key = BuildKey("I", null, proc.IdInsumo);

                if (dictStock.TryGetValue(key, out var movDet))
                {
                    _dbcontext.PedidosDetalleProcesosStocks.Add(new PedidosDetalleProcesosStock
                    {
                        IdPedidoDetalleProceso = proc.Id,
                        IdStockMovimientoDetalle = movDet.Id,
                        CantidadUsada = proc.CantidadUsadaStock ?? 0
                    });
                }
            }
        }

        private async Task LimpiarMovimientoStockPedidoAsync(int idPedido)
        {
            var movExistente = await ObtenerMovimientoStockPedidoAsync(idPedido);
            if (movExistente == null)
                return;

            var esEntradaAnterior = EsEntradaLocal(movExistente) || await GetEsEntradaAsync(movExistente.IdTipoMovimiento);

            if (!movExistente.EsAnulado)
            {
                foreach (var detViejo in movExistente.StockMovimientosDetalles)
                    await AplicarStockAsync(detViejo, esEntradaAnterior, revertir: true);
            }

            await EliminarRelacionesStockPedidoAsync(idPedido);

            if (movExistente.StockMovimientosDetalles.Any())
                _dbcontext.StockMovimientosDetalles.RemoveRange(movExistente.StockMovimientosDetalles);

            _dbcontext.StockMovimientos.Remove(movExistente);
        }

        private async Task SincronizarMovimientoStockPedidoAsync(int idPedido, List<StockMovimientosDetalle> nuevosDetalles)
        {
            // 1) Obtener movimiento anterior
            var movAnterior = await ObtenerMovimientoStockPedidoAsync(idPedido);

            if (movAnterior != null && !movAnterior.EsAnulado)
            {
                var esEntradaAnterior = EsEntradaLocal(movAnterior)
                    || await GetEsEntradaAsync(movAnterior.IdTipoMovimiento);

                // 🔥 REVERTIR STOCK
                foreach (var det in movAnterior.StockMovimientosDetalles)
                {
                    await AplicarStockAsync(det, esEntradaAnterior, revertir: true);
                }

                // 🔥 ANULAR (NO BORRAR)
                movAnterior.EsAnulado = true;
            }

            await EliminarRelacionesStockPedidoAsync(idPedido);

            // 2) Si no hay nada nuevo → listo
            if (nuevosDetalles == null || nuevosDetalles.Count == 0)
            {
                await _dbcontext.SaveChangesAsync();
                return;
            }

            // 3) Crear nuevo movimiento
            int idTipoMovimientoSalida = await ObtenerIdTipoMovimientoSalidaAsync();

            var nuevoMov = new StockMovimiento
            {
                IdTipoMovimiento = idTipoMovimientoSalida,
                Comentario = BuildComentarioStockPedido(idPedido),
                Fecha = DateTime.Now,
                FechaAlta = DateTime.Now,
                EsAnulado = false
            };

            _dbcontext.StockMovimientos.Add(nuevoMov);
            await _dbcontext.SaveChangesAsync();

            // 4) Insertar detalles + aplicar stock
            foreach (var det in nuevosDetalles)
            {
                det.Id = 0;
                det.IdMovimiento = nuevoMov.Id;
                det.TipoItem = (det.TipoItem ?? "").ToUpper();
                det.FechaCreado = DateTime.Now;

                _dbcontext.StockMovimientosDetalles.Add(det);

                // 🔥 SIEMPRE salida (pedido consume stock)
                await AplicarStockAsync(det, esEntrada: false, revertir: false);
            }

            await _dbcontext.SaveChangesAsync();

            // 5) Re-crear relaciones
            await CrearRelacionesStockPedidoAsync(idPedido, nuevoMov.Id);
        }

        private async Task ResincronizarStockPedidoDesdeDbAsync(int idPedido)
        {
            var pedido = await _dbcontext.Pedidos
                .Include(p => p.PedidosDetalles)
                .Include(p => p.PedidosDetalleProcesos)
                .FirstOrDefaultAsync(p => p.Id == idPedido);

            if (pedido == null)
                return;

            var detalles = pedido.PedidosDetalles?.ToList() ?? new List<PedidosDetalle>();
            var procesos = pedido.PedidosDetalleProcesos?.ToList() ?? new List<PedidosDetalleProceso>();

            var movExistente = await ObtenerMovimientoStockPedidoAsync(idPedido);

            var validacion = await ValidarStockInternoAsync(
     detalles,
     procesos,
     idPedido
 );

            if (!validacion.ok)
                throw new Exception(string.Join(" | ", validacion.errores));

            var detallesStock = ConstruirDetallesStockPedido(detalles, procesos);
            await SincronizarMovimientoStockPedidoAsync(idPedido, detallesStock);
        }

        /* ============================================================
           INSERTAR
        ============================================================ */
        public async Task<bool> Insertar(Pedido pedido, IQueryable<PedidosDetalle> pedidosDetalle, IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var detalles = pedidosDetalle?.ToList() ?? new List<PedidosDetalle>();
                var procesos = pedidosDetalleProceso?.ToList() ?? new List<PedidosDetalleProceso>();

                // 🔥 VALIDAR STOCK
                var validacion = await ValidarStockInternoAsync(detalles, procesos);
                if (!validacion.ok)
                    throw new Exception(string.Join(" | ", validacion.errores));

                // 🔥 GUARDAR PEDIDO
                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync();

                // =====================================================
                // 🔥 1. INSERTAR DETALLES + MAPEAR IDs
                // =====================================================
                var idMapping = new Dictionary<int, int>();

                foreach (var d in detalles)
                {
                    int tempId = d.Id; // 👈 ID temporal del frontend

                    d.Id = 0;
                    d.IdPedido = pedido.Id;

                    _dbcontext.PedidosDetalles.Add(d);
                    await _dbcontext.SaveChangesAsync();

                    idMapping[tempId] = d.Id; // 👈 guardamos relación
                }

                // =====================================================
                // 🔥 2. INSERTAR PROCESOS CON ID CORRECTO
                // =====================================================
                foreach (var p in procesos)
                {
                    p.IdPedido = pedido.Id;

                    if (p.IdDetalle.HasValue && idMapping.ContainsKey(p.IdDetalle.Value))
                    {
                        p.IdDetalle = idMapping[p.IdDetalle.Value]; // 🔥 FIX
                    }

                    p.Id = 0;
                    _dbcontext.PedidosDetalleProcesos.Add(p);
                }

                await _dbcontext.SaveChangesAsync();

                // =====================================================
                // 🔥 3. STOCK (igual que lo tenías)
                // =====================================================
                var detallesStock = ConstruirDetallesStockPedido(detalles, procesos);

                if (detallesStock.Any())
                {
                    int idTipoSalida = await ObtenerIdTipoMovimientoSalidaAsync();

                    var mov = new StockMovimiento
                    {
                        IdTipoMovimiento = idTipoSalida,
                        Comentario = BuildComentarioStockPedido(pedido.Id),
                        Fecha = DateTime.Now,
                        FechaAlta = DateTime.Now,
                        EsAnulado = false
                    };

                    _dbcontext.StockMovimientos.Add(mov);
                    await _dbcontext.SaveChangesAsync();

                    foreach (var det in detallesStock)
                    {
                        det.IdMovimiento = mov.Id;
                        det.TipoItem = det.TipoItem.ToUpper();

                        _dbcontext.StockMovimientosDetalles.Add(det);

                        await AplicarStockAsync(det, esEntrada: false, revertir: false);
                    }

                    await _dbcontext.SaveChangesAsync();

                    await CrearRelacionesStockPedidoAsync(pedido.Id, mov.Id);
                }

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
            using var tx = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                /* ============================================================
                   1) OBTENER PEDIDO EXISTENTE
                ============================================================ */
                var existente = await _dbcontext.Pedidos
                    .Include(p => p.PedidosDetalles)
                    .Include(p => p.PedidosDetalleProcesos)
                    .FirstOrDefaultAsync(p => p.Id == pedido.Id);

                if (existente == null)
                    return false;

                var detalles = pedidosDetalle?.ToList() ?? new List<PedidosDetalle>();
                var procesos = pedidosDetalleProceso?.ToList() ?? new List<PedidosDetalleProceso>();

                /* ============================================================
                   2) VALIDAR STOCK (teniendo en cuenta lo ya consumido)
                ============================================================ */
                var validacion = await ValidarStockInternoAsync(detalles, procesos, pedido.Id);

                if (!validacion.ok)
                    throw new Exception(string.Join(" | ", validacion.errores));

                /* ============================================================
                   3) OBTENER MOVIMIENTO ANTERIOR (ÚLTIMO)
                ============================================================ */
                var movAnterior = await _dbcontext.StockMovimientos
                    .Include(x => x.StockMovimientosDetalles)
                    .Include(x => x.IdTipoMovimientoNavigation)
                    .Where(x => x.Comentario != null && x.Comentario.StartsWith(BuildComentarioStockPedido(pedido.Id)))
                    .OrderByDescending(x => x.Id) // 🔥 IMPORTANTE
                    .FirstOrDefaultAsync();

                var dictAnterior = movAnterior?.StockMovimientosDetalles?
                    .GroupBy(x => BuildKey(x.TipoItem, x.IdProducto, x.IdInsumo))
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Cantidad))
                    ?? new Dictionary<string, decimal>();

                /* ============================================================
                   4) ACTUALIZAR CABECERA
                ============================================================ */
                _dbcontext.Entry(existente).CurrentValues.SetValues(pedido);

                /* ============================================================
                   5) ELIMINAR DETALLES / PROCESOS
                ============================================================ */
                _dbcontext.PedidosDetalleProcesos.RemoveRange(existente.PedidosDetalleProcesos);
                _dbcontext.PedidosDetalles.RemoveRange(existente.PedidosDetalles);

                await _dbcontext.SaveChangesAsync();

                /* ============================================================
                   6) REINSERTAR DETALLES
                ============================================================ */
                var idMapping = new Dictionary<int, int>();

                foreach (var d in detalles)
                {
                    int tempId = d.Id;

                    d.Id = 0;
                    d.IdPedido = pedido.Id;

                    _dbcontext.PedidosDetalles.Add(d);
                    await _dbcontext.SaveChangesAsync();

                    idMapping[tempId] = d.Id;
                }

                /* ============================================================
                   7) REINSERTAR PROCESOS
                ============================================================ */
                foreach (var p in procesos)
                {
                    p.IdPedido = pedido.Id;

                    if (p.IdDetalle.HasValue && idMapping.TryGetValue(p.IdDetalle.Value, out int idReal))
                        p.IdDetalle = idReal;

                    p.Id = 0;
                    _dbcontext.PedidosDetalleProcesos.Add(p);
                }

                await _dbcontext.SaveChangesAsync();

                /* ============================================================
                   8) CONSTRUIR NUEVO STOCK
                ============================================================ */
                var detallesStock = ConstruirDetallesStockPedido(
                    await _dbcontext.PedidosDetalles.Where(x => x.IdPedido == pedido.Id).ToListAsync(),
                    await _dbcontext.PedidosDetalleProcesos.Where(x => x.IdPedido == pedido.Id).ToListAsync()
                );

                var dictNuevo = detallesStock
                    .GroupBy(x => BuildKey(x.TipoItem, x.IdProducto, x.IdInsumo))
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Cantidad));

                /* ============================================================
                   9) DETECTAR CAMBIOS REALES
                ============================================================ */
                bool hayCambiosStock = false;

                if (dictAnterior.Count != dictNuevo.Count)
                {
                    hayCambiosStock = true;
                }
                else
                {
                    foreach (var kv in dictNuevo)
                    {
                        if (!dictAnterior.TryGetValue(kv.Key, out decimal cantAnterior) ||
                            cantAnterior != kv.Value)
                        {
                            hayCambiosStock = true;
                            break;
                        }
                    }
                }

                /* ============================================================
                   10) SINCRONIZAR STOCK SOLO SI CAMBIÓ
                ============================================================ */
                if (hayCambiosStock)
                {
                    // 🔥 SI EXISTE MOVIMIENTO → LO MODIFICO
                    if (movAnterior != null && !movAnterior.EsAnulado)
                    {
                        var esEntradaAnterior = EsEntradaLocal(movAnterior)
                            || await GetEsEntradaAsync(movAnterior.IdTipoMovimiento);

                        // =====================================================
                        // 1. REVERTIR STOCK ANTERIOR
                        // =====================================================
                        foreach (var det in movAnterior.StockMovimientosDetalles)
                        {
                            await AplicarStockAsync(det, esEntradaAnterior, revertir: true);
                        }

                        // =====================================================
                        // 2. BORRAR DETALLES VIEJOS
                        // =====================================================
                        _dbcontext.StockMovimientosDetalles.RemoveRange(movAnterior.StockMovimientosDetalles);

                        await _dbcontext.SaveChangesAsync();

                        // =====================================================
                        // 3. INSERTAR NUEVOS DETALLES (MISMO MOVIMIENTO)
                        // =====================================================
                        foreach (var det in detallesStock)
                        {
                            det.Id = 0;
                            det.IdMovimiento = movAnterior.Id;
                            det.TipoItem = (det.TipoItem ?? "").ToUpper();
                            det.FechaCreado = DateTime.Now;

                            _dbcontext.StockMovimientosDetalles.Add(det);

                            await AplicarStockAsync(det, esEntrada: false, revertir: false);
                        }

                        await _dbcontext.SaveChangesAsync();

                        // =====================================================
                        // 4. RECREAR RELACIONES
                        // =====================================================
                        await EliminarRelacionesStockPedidoAsync(pedido.Id);
                        await CrearRelacionesStockPedidoAsync(pedido.Id, movAnterior.Id);
                    }
                    else
                    {
                        // 🔥 SI NO EXISTE → CREAR (caso nuevo)
                        int idTipoSalida = await ObtenerIdTipoMovimientoSalidaAsync();

                        var nuevoMov = new StockMovimiento
                        {
                            IdTipoMovimiento = idTipoSalida,
                            Comentario = BuildComentarioStockPedido(pedido.Id),
                            Fecha = DateTime.Now,
                            FechaAlta = DateTime.Now,
                            EsAnulado = false
                        };

                        _dbcontext.StockMovimientos.Add(nuevoMov);
                        await _dbcontext.SaveChangesAsync();

                        foreach (var det in detallesStock)
                        {
                            det.IdMovimiento = nuevoMov.Id;

                            _dbcontext.StockMovimientosDetalles.Add(det);
                            await AplicarStockAsync(det, esEntrada: false, revertir: false);
                        }

                        await _dbcontext.SaveChangesAsync();

                        await CrearRelacionesStockPedidoAsync(pedido.Id, nuevoMov.Id);
                    }
                }

                /* ============================================================
                   11) FINAL
                ============================================================ */
                await _dbcontext.SaveChangesAsync();
                await tx.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine(ex);
                return false;
            }
        }
        /* ============================================================
           ACTUALIZAR DETALLE PROCESO
        ============================================================ */
        public async Task<bool> ActualizarDetalleProceso(PedidosDetalleProceso pedidosDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var pedidoDetalleExistente = await _dbcontext.PedidosDetalleProcesos
                    .FirstOrDefaultAsync(p => p.Id == pedidosDetalleProceso.Id);

                if (pedidoDetalleExistente == null)
                    return false;

                pedidoDetalleExistente.Cantidad = pedidosDetalleProceso.Cantidad;
                pedidoDetalleExistente.Comentarios = pedidosDetalleProceso.Comentarios;
                pedidoDetalleExistente.Descripcion = pedidosDetalleProceso.Descripcion;
                pedidoDetalleExistente.Especificacion = pedidosDetalleProceso.Especificacion;
                pedidoDetalleExistente.IdColor = pedidosDetalleProceso.IdColor;
                pedidoDetalleExistente.FechaActualizacion = DateTime.Now;
                pedidoDetalleExistente.IdEstado = pedidosDetalleProceso.IdEstado;
                pedidoDetalleExistente.CantidadUsadaStock = pedidosDetalleProceso.CantidadUsadaStock;

                _dbcontext.Entry(pedidoDetalleExistente).CurrentValues.SetValues(pedidoDetalleExistente);
                await _dbcontext.SaveChangesAsync();

                await ResincronizarStockPedidoDesdeDbAsync(pedidoDetalleExistente.IdPedido ?? 0);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        /* ============================================================
           OBTENER PRODUCTO / INSUMO
        ============================================================ */
        public async Task<PedidosDetalle> ObtenerProducto(int IdPedido, int IdProducto)
        {
            try
            {
                return await _dbcontext.PedidosDetalles
                    .Where(x => x.IdPedido == IdPedido && x.IdProducto == IdProducto)
                    .FirstOrDefaultAsync();
            }
            catch
            {
                return null;
            }
        }

        public async Task<PedidosDetalleProceso> ObtenerInsumo(int IdPedido, int IdInsumo)
        {
            try
            {
                return await _dbcontext.PedidosDetalleProcesos
                    .Where(x => x.IdPedido == IdPedido && x.IdInsumo == IdInsumo)
                    .FirstOrDefaultAsync();
            }
            catch
            {
                return null;
            }
        }

        /* ============================================================
           LISTA PEDIDOS
        ============================================================ */
        public async Task<List<Pedido>> ObtenerPedidos(
            DateTime FechaDesde,
            DateTime FechaHasta,
            int IdCliente,
            string Estado,
            int Finalizado)
        {
            try
            {
                if (FechaHasta != DateTime.MinValue)
                    FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                var query = _dbcontext.Pedidos
                    .AsNoTracking()
                    .Include(x => x.IdClienteNavigation)
                    .Include(x => x.IdFormaPagoNavigation)
                    .Include(x => x.PedidosDetalleProcesos)
                        .ThenInclude(x => x.IdEstadoNavigation)
                    .AsQueryable();

                if (IdCliente != -1)
                {
                    query = query.Where(x => x.IdCliente == IdCliente);
                }
                else
                {
                    if (FechaDesde != DateTime.MinValue)
                        query = query.Where(x => x.Fecha >= FechaDesde);

                    if (FechaHasta != DateTime.MinValue)
                        query = query.Where(x => x.Fecha <= FechaHasta);
                }

                if (Finalizado != -1)
                    query = query.Where(x => x.Finalizado == Finalizado);

                if (!string.Equals(Estado, "TODOS", StringComparison.OrdinalIgnoreCase))
                {
                    if (Estado == "ENTREGAR")
                        query = query.Where(x => x.Saldo <= 0);
                    else if (Estado == "EN PROCESO")
                        query = query.Where(x => x.Saldo >= 0);
                }

                return await query
                    .OrderByDescending(x => x.Fecha)
                    .ThenByDescending(x => x.Id)
                    .ToListAsync();
            }
            catch
            {
                return null;
            }
        }

        /* ============================================================
           DETALLE PROCESOS
        ============================================================ */
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
                    q = q.Where(p =>
                        p.IdEstadoNavigation == null ||
                        !EF.Functions.Like(p.IdEstadoNavigation.Nombre, "%Finaliz%"));
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
                    .Include(x => x.IdInsumoNavigation)
                        .ThenInclude(p => p.IdCategoriaNavigation)
                    .Include(x => x.IdColorNavigation)
                    .ToListAsync();
            }
            catch
            {
                return null;
            }
        }

        public async Task<Pedido> ObtenerPedido(int pedidoId)
        {
            try
            {
                var pedido = await _dbcontext.Pedidos
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdFormaPagoNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdProductoNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdColorNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.IdCategoriaNavigation)
                    .Include(p => p.PedidosDetalles)
                        .ThenInclude(pd => pd.PedidosDetalleStocks)
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
                    .Include(p => p.PedidosDetalleProcesos)
                        .ThenInclude(pdp => pdp.PedidosDetalleProcesosStocks)
                    .FirstOrDefaultAsync(p => p.Id == pedidoId);

                if (pedido == null)
                    return null;

                /* ============================================================
                   🔥 STOCK PRODUCTOS (REAL DESDE SALDOS)
                ============================================================ */
                var productosIds = pedido.PedidosDetalles
                    .Where(x => x.IdProducto.HasValue)
                    .Select(x => x.IdProducto.Value)
                    .Distinct()
                    .ToList();

                var stockProductos = await _dbcontext.StockSaldos
                    .Where(s => s.TipoItem == "P" && s.IdProducto.HasValue && productosIds.Contains(s.IdProducto.Value))
                    .ToDictionaryAsync(s => s.IdProducto.Value, s => s.CantidadActual);

                foreach (var det in pedido.PedidosDetalles)
                {
                    if (det.IdProducto.HasValue && stockProductos.ContainsKey(det.IdProducto.Value))
                    {
                        // 🔥 PISAMOS EL STOCK NAVIGATION
                        det.IdProductoNavigation.Stock = stockProductos[det.IdProducto.Value];
                    }
                    else if (det.IdProductoNavigation != null)
                    {
                        det.IdProductoNavigation.Stock = 0;
                    }
                }

                /* ============================================================
                   🔥 STOCK INSUMOS
                ============================================================ */
                var insumosIds = pedido.PedidosDetalleProcesos
                    .Where(x => x.IdInsumo.HasValue)
                    .Select(x => x.IdInsumo.Value)
                    .Distinct()
                    .ToList();

                var stockInsumos = await _dbcontext.StockSaldos
                    .Where(s => s.TipoItem == "I" && s.IdInsumo.HasValue && insumosIds.Contains(s.IdInsumo.Value))
                    .ToDictionaryAsync(s => s.IdInsumo.Value, s => s.CantidadActual);

                foreach (var proc in pedido.PedidosDetalleProcesos)
                {
                    if (proc.IdInsumo.HasValue && stockInsumos.ContainsKey(proc.IdInsumo.Value))
                    {
                        proc.IdInsumoNavigation.Stock = stockInsumos[proc.IdInsumo.Value];
                    }
                    else if (proc.IdInsumoNavigation != null)
                    {
                        proc.IdInsumoNavigation.Stock = 0;
                    }
                }

                return pedido;
            }
            catch
            {
                return null;
            }
        }

        /* ============================================================
           ELIMINAR INSUMO
        ============================================================ */
        public async Task<bool> EliminarInsumo(int IdPedido, int IdInsumo)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.PedidosDetalleProcesos
                    .FirstOrDefaultAsync(c => c.IdPedido == IdPedido && c.IdInsumo == IdInsumo);

                if (model == null)
                    return false;

                var relaciones = await _dbcontext.PedidosDetalleProcesosStocks
                    .Where(x => x.IdPedidoDetalleProceso == model.Id)
                    .ToListAsync();

                if (relaciones.Any())
                    _dbcontext.PedidosDetalleProcesosStocks.RemoveRange(relaciones);

                _dbcontext.PedidosDetalleProcesos.Remove(model);
                await _dbcontext.SaveChangesAsync();

                await ResincronizarStockPedidoDesdeDbAsync(IdPedido);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        /* ============================================================
           ELIMINAR PRODUCTO
        ============================================================ */
        public async Task<bool> EliminarProducto(int IdPedido, int IdProducto)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.PedidosDetalles
                    .FirstOrDefaultAsync(c => c.IdPedido == IdPedido && c.IdProducto == IdProducto);

                if (model == null)
                    return false;

                int idDetalle = model.Id;

                var procesosAsociados = await _dbcontext.PedidosDetalleProcesos
                    .Where(x =>
                        x.IdPedido == IdPedido &&
                        (
                            (x.IdDetalle.HasValue && x.IdDetalle.Value == idDetalle) ||
                            (!x.IdDetalle.HasValue && x.IdProducto == IdProducto)
                        ))
                    .ToListAsync();

                var relacionesDetalle = await _dbcontext.PedidosDetalleStocks
                    .Where(x => x.IdPedidoDetalle == model.Id)
                    .ToListAsync();

                if (relacionesDetalle.Any())
                    _dbcontext.PedidosDetalleStocks.RemoveRange(relacionesDetalle);

                if (procesosAsociados.Any())
                {
                    var idsProcesos = procesosAsociados.Select(x => x.Id).ToList();

                    var relacionesProceso = await _dbcontext.PedidosDetalleProcesosStocks
                        .Where(x => idsProcesos.Contains(x.IdPedidoDetalleProceso))
                        .ToListAsync();

                    if (relacionesProceso.Any())
                        _dbcontext.PedidosDetalleProcesosStocks.RemoveRange(relacionesProceso);

                    _dbcontext.PedidosDetalleProcesos.RemoveRange(procesosAsociados);
                }

                _dbcontext.PedidosDetalles.Remove(model);
                await _dbcontext.SaveChangesAsync();

                await ResincronizarStockPedidoDesdeDbAsync(IdPedido);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        /* ============================================================
           ELIMINAR PEDIDO
        ============================================================ */
        public async Task<bool> EliminarPedido(int id)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                var pedido = await _dbcontext.Pedidos
                    .Include(p => p.PedidosDetalles)
                    .Include(p => p.PedidosDetalleProcesos)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (pedido == null)
                    return false;

                // =====================================================
                // 🔥 1. OBTENER MOVIMIENTO DE STOCK DEL PEDIDO
                // =====================================================
                var mov = await ObtenerMovimientoStockPedidoAsync(id);

                if (mov != null && mov.StockMovimientosDetalles.Any())
                {
                    var esEntradaAnterior = EsEntradaLocal(mov)
                        || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                    // =====================================================
                    // 🔥 2. REVERTIR STOCK (DEVOLVER)
                    // =====================================================
                    foreach (var det in mov.StockMovimientosDetalles)
                    {
                        await AplicarStockAsync(det, esEntradaAnterior, revertir: true);
                    }

                    // =====================================================
                    // 🔥 3. ELIMINAR RELACIONES
                    // =====================================================
                    await EliminarRelacionesStockPedidoAsync(id);

                    // =====================================================
                    // 🔥 4. ELIMINAR DETALLES DE MOVIMIENTO
                    // =====================================================
                    _dbcontext.StockMovimientosDetalles.RemoveRange(mov.StockMovimientosDetalles);

                    // =====================================================
                    // 🔥 5. ELIMINAR MOVIMIENTO
                    // =====================================================
                    _dbcontext.StockMovimientos.Remove(mov);
                }

                // =====================================================
                // 🔥 6. ELIMINAR PROCESOS Y DETALLES
                // =====================================================
                _dbcontext.PedidosDetalleProcesos.RemoveRange(pedido.PedidosDetalleProcesos);
                _dbcontext.PedidosDetalles.RemoveRange(pedido.PedidosDetalles);

                // =====================================================
                // 🔥 7. ELIMINAR PEDIDO
                // =====================================================
                _dbcontext.Pedidos.Remove(pedido);

                await _dbcontext.SaveChangesAsync();
                await tx.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.WriteLine(ex);
                return false;
            }
        }
        /* ============================================================
           VALIDACIÓN / DISPONIBILIDAD STOCK
        ============================================================ */
        public async Task<(bool ok, List<string> errores)> ValidarStockPedido(
            IQueryable<PedidosDetalle> pedidosDetalle,
            IQueryable<PedidosDetalleProceso> pedidosDetalleProceso)
        {
            var detallesList = pedidosDetalle?.ToList() ?? new List<PedidosDetalle>();
            var procesosList = pedidosDetalleProceso?.ToList() ?? new List<PedidosDetalleProceso>();

            return await ValidarStockInternoAsync(detallesList, procesosList);
        }

        public async Task<(bool ok, decimal disponible, decimal faltante, string nombre)> ObtenerDisponibilidadStock(
            string tipoItem,
            int? idProducto,
            int? idInsumo,
            decimal cantidad)
        {
            tipoItem = (tipoItem ?? string.Empty).ToUpper();

            decimal disponible = await _dbcontext.StockSaldos
                .Where(s =>
                    s.TipoItem == tipoItem &&
                    s.IdProducto == idProducto &&
                    s.IdInsumo == idInsumo)
                .Select(s => s.CantidadActual)
                .FirstOrDefaultAsync();

            string nombre = string.Empty;

            if (tipoItem == "P" && idProducto.HasValue)
            {
                nombre = await _dbcontext.Productos
                    .Where(x => x.Id == idProducto.Value)
                    .Select(x => x.Nombre)
                    .FirstOrDefaultAsync() ?? $"Producto #{idProducto.Value}";
            }
            else if (tipoItem == "I" && idInsumo.HasValue)
            {
                nombre = await _dbcontext.Insumos
                    .Where(x => x.Id == idInsumo.Value)
                    .Select(x => x.Descripcion)
                    .FirstOrDefaultAsync() ?? $"Insumo #{idInsumo.Value}";
            }

            decimal faltante = cantidad > disponible ? cantidad - disponible : 0m;

            return (disponible >= cantidad, disponible, faltante, nombre);
        }
    }
}