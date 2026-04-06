using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.Repository
{
    public class PedidoRepository : IPedidosRepository<Pedido>
    {
        private readonly SistemaBronxContext _dbcontext;

        private const string STOCK_PEDIDO_PREFIX = "[PEDIDO_STOCK:";
        private const string STOCK_PEDIDO_SUFFIX = "]";

        public PedidoRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        /* ============================================================
           HELPERS PRIVADOS STOCK
        ============================================================ */

        private string BuildComentarioStockPedido(int idPedido)
            => $"{STOCK_PEDIDO_PREFIX}{idPedido}{STOCK_PEDIDO_SUFFIX}";

        private async Task<int> ObtenerIdTipoMovimientoSalidaAsync()
        {
            var query = _dbcontext.StockTiposMovimientos.AsQueryable();

            var id = await query
                .Where(x => !x.EsEntrada && x.Nombre != null && EF.Functions.Like(x.Nombre.ToUpper(), "%PEDIDO%"))
                .Select(x => x.Id)
                .FirstOrDefaultAsync();

            if (id > 0) return id;

            id = await query
                .Where(x => !x.EsEntrada && x.Nombre != null && EF.Functions.Like(x.Nombre.ToUpper(), "%SALIDA%"))
                .Select(x => x.Id)
                .FirstOrDefaultAsync();

            if (id > 0) return id;

            id = await query
                .Where(x => !x.EsEntrada)
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .FirstOrDefaultAsync();

            if (id <= 0)
                throw new Exception("No existe un tipo de movimiento de salida en StockTiposMovimientos.");

            return id;
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

            // 1) Insumos reales de procesos
            foreach (var proc in pedidosDetalleProceso.Where(x => x.IdInsumo.HasValue && x.Cantidad > 0))
            {
                salida.Add(new StockMovimientosDetalle
                {
                    TipoItem = "I",
                    IdProducto = null,
                    IdInsumo = proc.IdInsumo,
                    Cantidad = (decimal)proc.Cantidad,
                    CostoUnitario = proc.PrecioUnitario ?? 0,
                    FechaCreado = DateTime.Now
                });
            }

            // 2) Productos terminados SOLO si ese detalle NO tiene insumos asociados
            foreach (var det in pedidosDetalle.Where(x => x.IdProducto.HasValue && x.Cantidad > 0))
            {
                bool tieneInsumosAsociados = pedidosDetalleProceso.Any(p =>
                    p.IdInsumo.HasValue &&
                    (
                        (p.IdDetalle.HasValue && p.IdDetalle.Value == det.Id) ||
                        (!p.IdDetalle.HasValue && p.IdProducto.HasValue && p.IdProducto.Value == det.IdProducto.Value)
                    ));

                if (!tieneInsumosAsociados)
                {
                    salida.Add(new StockMovimientosDetalle
                    {
                        TipoItem = "P",
                        IdProducto = det.IdProducto,
                        IdInsumo = null,
                        Cantidad = (decimal)det.Cantidad,
                        CostoUnitario = det.CostoUnitario ?? 0,
                        FechaCreado = DateTime.Now
                    });
                }
            }

            // 3) Agrupar
            return salida
                .GroupBy(x => new { x.TipoItem, x.IdProducto, x.IdInsumo })
                .Select(g => new StockMovimientosDetalle
                {
                    TipoItem = g.Key.TipoItem,
                    IdProducto = g.Key.IdProducto,
                    IdInsumo = g.Key.IdInsumo,
                    Cantidad = g.Sum(x => x.Cantidad),
                    CostoUnitario = g.OrderByDescending(x => x.CostoUnitario).Select(x => x.CostoUnitario).FirstOrDefault(),
                    FechaCreado = DateTime.Now
                })
                .Where(x => x.Cantidad > 0)
                .ToList();
        }

        private async Task<(bool ok, List<string> errores)> ValidarStockInternoAsync(
            List<PedidosDetalle> pedidosDetalle,
            List<PedidosDetalleProceso> pedidosDetalleProceso,
            int? idMovimientoStockExcluir = null)
        {
            var errores = new List<string>();

            var requeridos = ConstruirDetallesStockPedido(pedidosDetalle, pedidosDetalleProceso)
                .GroupBy(x => new { x.TipoItem, x.IdProducto, x.IdInsumo })
                .Select(g => new
                {
                    g.Key.TipoItem,
                    g.Key.IdProducto,
                    g.Key.IdInsumo,
                    Cantidad = g.Sum(x => x.Cantidad)
                })
                .ToList();

            var devolucion = new Dictionary<string, decimal>();

            if (idMovimientoStockExcluir.HasValue && idMovimientoStockExcluir.Value > 0)
            {
                var movActual = await _dbcontext.StockMovimientos
                    .Include(x => x.StockMovimientosDetalles)
                    .FirstOrDefaultAsync(x => x.Id == idMovimientoStockExcluir.Value);

                if (movActual != null)
                {
                    foreach (var d in movActual.StockMovimientosDetalles)
                    {
                        var key = $"{d.TipoItem}|{d.IdProducto}|{d.IdInsumo}";
                        if (!devolucion.ContainsKey(key))
                            devolucion[key] = 0m;

                        devolucion[key] += d.Cantidad;
                    }
                }
            }

            foreach (var item in requeridos)
            {
                decimal disponible = await _dbcontext.StockSaldos
                    .Where(s =>
                        s.TipoItem == item.TipoItem &&
                        s.IdProducto == item.IdProducto &&
                        s.IdInsumo == item.IdInsumo)
                    .Select(s => s.CantidadActual)
                    .FirstOrDefaultAsync();

                var key = $"{item.TipoItem}|{item.IdProducto}|{item.IdInsumo}";
                if (devolucion.TryGetValue(key, out decimal devolver))
                    disponible += devolver;

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
                            ? $"Stock insuficiente del producto '{nombre}'. Solicitado: {item.Cantidad:N3} / Disponible: {disponible:N3} / Faltante: {faltante:N3}"
                            : $"Stock insuficiente del insumo '{nombre}'. Solicitado: {item.Cantidad:N3} / Disponible: {disponible:N3} / Faltante: {faltante:N3}"
                    );
                }
            }

            return (errores.Count == 0, errores);
        }

        private async Task SincronizarMovimientoStockPedidoAsync(int idPedido, List<StockMovimientosDetalle> nuevosDetalles)
        {
            var movExistente = await ObtenerMovimientoStockPedidoAsync(idPedido);

            if ((nuevosDetalles == null || nuevosDetalles.Count == 0) && movExistente == null)
                return;

            if ((nuevosDetalles == null || nuevosDetalles.Count == 0) && movExistente != null)
            {
                var esEntradaViejo = EsEntradaLocal(movExistente) || await GetEsEntradaAsync(movExistente.IdTipoMovimiento);

                if (!movExistente.EsAnulado)
                {
                    foreach (var detViejo in movExistente.StockMovimientosDetalles)
                        await AplicarStockAsync(detViejo, esEntradaViejo, revertir: true);
                }

                _dbcontext.StockMovimientosDetalles.RemoveRange(movExistente.StockMovimientosDetalles);
                _dbcontext.StockMovimientos.Remove(movExistente);
                return;
            }

            int idTipoMovimientoSalida = await ObtenerIdTipoMovimientoSalidaAsync();

            if (movExistente == null)
            {
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

                foreach (var det in nuevosDetalles)
                {
                    det.Id = 0;
                    det.IdMovimiento = nuevoMov.Id;
                    det.TipoItem = (det.TipoItem ?? string.Empty).ToUpper();
                    det.FechaCreado = DateTime.Now;

                    _dbcontext.StockMovimientosDetalles.Add(det);
                    await AplicarStockAsync(det, esEntrada: false, revertir: false);
                }

                return;
            }

            var esEntradaAnterior = EsEntradaLocal(movExistente) || await GetEsEntradaAsync(movExistente.IdTipoMovimiento);

            if (!movExistente.EsAnulado)
            {
                foreach (var detViejo in movExistente.StockMovimientosDetalles)
                    await AplicarStockAsync(detViejo, esEntradaAnterior, revertir: true);
            }

            _dbcontext.StockMovimientosDetalles.RemoveRange(movExistente.StockMovimientosDetalles);

            movExistente.IdTipoMovimiento = idTipoMovimientoSalida;
            movExistente.Comentario = BuildComentarioStockPedido(idPedido);
            movExistente.Fecha = DateTime.Now;
            movExistente.EsAnulado = false;

            foreach (var det in nuevosDetalles)
            {
                det.Id = 0;
                det.IdMovimiento = movExistente.Id;
                det.TipoItem = (det.TipoItem ?? string.Empty).ToUpper();
                det.FechaCreado = DateTime.Now;

                _dbcontext.StockMovimientosDetalles.Add(det);
                await AplicarStockAsync(det, esEntrada: false, revertir: false);
            }
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
                movExistente?.Id
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
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var detallesList = pedidosDetalle?.ToList() ?? new List<PedidosDetalle>();
                var procesosList = pedidosDetalleProceso?.ToList() ?? new List<PedidosDetalleProceso>();

                var validacion = await ValidarStockInternoAsync(detallesList, procesosList);
                if (!validacion.ok)
                    throw new Exception(string.Join(" | ", validacion.errores));

                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync();

                var idMapping = new Dictionary<int, int>();

                foreach (var detalle in detallesList)
                {
                    int idTemporal = detalle.Id;

                    detalle.Id = 0;
                    detalle.IdPedido = pedido.Id;
                    _dbcontext.PedidosDetalles.Add(detalle);
                    await _dbcontext.SaveChangesAsync();

                    idMapping[idTemporal] = detalle.Id;
                }

                foreach (var proceso in procesosList)
                {
                    proceso.IdPedido = pedido.Id;

                    if (proceso.IdDetalle.HasValue && idMapping.TryGetValue(proceso.IdDetalle.Value, out int idReal))
                        proceso.IdDetalle = idReal;

                    proceso.Id = 0;
                    _dbcontext.PedidosDetalleProcesos.Add(proceso);
                }

                await _dbcontext.SaveChangesAsync();

                var detallesStock = ConstruirDetallesStockPedido(detallesList, procesosList);
                await SincronizarMovimientoStockPedidoAsync(pedido.Id, detallesStock);

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
           ACTUALIZAR
        ============================================================ */
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
                    return false;

                var detallesList = pedidosDetalle?.ToList() ?? new List<PedidosDetalle>();
                var procesosList = pedidosDetalleProceso?.ToList() ?? new List<PedidosDetalleProceso>();

                var movExistente = await ObtenerMovimientoStockPedidoAsync(pedido.Id);

                var validacion = await ValidarStockInternoAsync(
                    detallesList,
                    procesosList,
                    movExistente?.Id
                );

                if (!validacion.ok)
                    throw new Exception(string.Join(" | ", validacion.errores));

                _dbcontext.Entry(pedidoExistente).CurrentValues.SetValues(pedido);

                // DETALLES
                var idsDetallesNuevos = detallesList.Where(x => x.Id > 0).Select(x => x.Id).ToList();
                var detallesAEliminar = pedidoExistente.PedidosDetalles
                    .Where(pd => !idsDetallesNuevos.Contains(pd.Id))
                    .ToList();

                _dbcontext.PedidosDetalles.RemoveRange(detallesAEliminar);

                var idMapping = new Dictionary<int, int>();

                foreach (var detalle in detallesList)
                {
                    var detalleExistente = pedidoExistente.PedidosDetalles
                        .FirstOrDefault(pd => pd.Id > 0 && pd.Id == detalle.Id);

                    if (detalleExistente != null)
                    {
                        detalleExistente.Cantidad = detalle.Cantidad;
                        detalleExistente.CostoUnitario = detalle.CostoUnitario;
                        detalleExistente.PrecioVenta = detalle.PrecioVenta;
                        detalleExistente.PorcIva = detalle.PorcIva;
                        detalleExistente.IdCategoria = detalle.IdCategoria;
                        detalleExistente.IdColor = detalle.IdColor;
                        detalleExistente.IdProducto = detalle.IdProducto;
                        detalleExistente.PorcGanancia = detalle.PorcGanancia;
                        detalleExistente.Producto = detalle.Producto;
                    }
                    else
                    {
                        int idTemporal = detalle.Id;
                        detalle.Id = 0;
                        detalle.IdPedido = pedido.Id;
                        _dbcontext.PedidosDetalles.Add(detalle);
                        await _dbcontext.SaveChangesAsync();

                        idMapping[idTemporal] = detalle.Id;
                    }
                }

                // PROCESOS
                var idsProcesosNuevos = procesosList.Where(x => x.Id > 0).Select(x => x.Id).ToList();
                var procesosAEliminar = pedidoExistente.PedidosDetalleProcesos
                    .Where(pdp => !idsProcesosNuevos.Contains(pdp.Id))
                    .ToList();

                _dbcontext.PedidosDetalleProcesos.RemoveRange(procesosAEliminar);

                foreach (var proceso in procesosList)
                {
                    var procesoExistente = pedidoExistente.PedidosDetalleProcesos
                        .FirstOrDefault(pdp => pdp.Id > 0 && pdp.Id == proceso.Id);

                    if (procesoExistente != null)
                    {
                        procesoExistente.IdDetalle = proceso.IdDetalle;
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
                        procesoExistente.IdUnidadMedida = proceso.IdUnidadMedida;
                        procesoExistente.IdProveedor = proceso.IdProveedor;
                        procesoExistente.IdProducto = proceso.IdProducto;
                        procesoExistente.IdInsumo = proceso.IdInsumo;
                    }
                    else
                    {
                        proceso.IdPedido = pedido.Id;

                        if (proceso.IdDetalle.HasValue && idMapping.TryGetValue(proceso.IdDetalle.Value, out int idReal))
                            proceso.IdDetalle = idReal;

                        proceso.Id = 0;
                        _dbcontext.PedidosDetalleProcesos.Add(proceso);
                    }
                }

                await _dbcontext.SaveChangesAsync();

                var detallesStock = ConstruirDetallesStockPedido(
                    await _dbcontext.PedidosDetalles.Where(x => x.IdPedido == pedido.Id).ToListAsync(),
                    await _dbcontext.PedidosDetalleProcesos.Where(x => x.IdPedido == pedido.Id).ToListAsync()
                );

                await SincronizarMovimientoStockPedidoAsync(pedido.Id, detallesStock);

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

        /* ============================================================
           OBTENER PEDIDO
        ============================================================ */
        public async Task<Pedido> ObtenerPedido(int pedidoId)
        {
            try
            {
                return await _dbcontext.Pedidos
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdFormaPagoNavigation)
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

                if (procesosAsociados.Any())
                    _dbcontext.PedidosDetalleProcesos.RemoveRange(procesosAsociados);

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
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var pedido = await _dbcontext.Pedidos
                    .Include(p => p.PedidosDetalles)
                    .Include(p => p.PedidosDetalleProcesos)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (pedido == null)
                    return false;

                var mov = await ObtenerMovimientoStockPedidoAsync(id);

                if (mov != null)
                {
                    var esEntrada = EsEntradaLocal(mov) || await GetEsEntradaAsync(mov.IdTipoMovimiento);

                    if (!mov.EsAnulado)
                    {
                        foreach (var det in mov.StockMovimientosDetalles)
                            await AplicarStockAsync(det, esEntrada, revertir: true);
                    }

                    _dbcontext.StockMovimientosDetalles.RemoveRange(mov.StockMovimientosDetalles);
                    _dbcontext.StockMovimientos.Remove(mov);
                }

                if (pedido.PedidosDetalleProcesos.Any())
                    _dbcontext.PedidosDetalleProcesos.RemoveRange(pedido.PedidosDetalleProcesos);

                if (pedido.PedidosDetalles.Any())
                    _dbcontext.PedidosDetalles.RemoveRange(pedido.PedidosDetalles);

                _dbcontext.Pedidos.Remove(pedido);

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