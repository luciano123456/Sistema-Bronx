using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using SistemaBronx.Models.Analisis;

namespace SistemaBronx.DAL.Repository
{
    public class AnalisisDatosRepository : IAnalisisDatosRepository
    {
        private readonly SistemaBronxContext _db;

        public AnalisisDatosRepository(SistemaBronxContext context)
        {
            _db = context;
        }

        public async Task<(DateTime? Primera, DateTime? Ultima)> ObtenerRangoFechasAsync(CancellationToken ct = default)
        {
            // MIN/MAX en un solo viaje a la base.
            var r = await _db.Pedidos.AsNoTracking()
                .Where(p => (p.ImporteAbonado ?? 0) > 0)
                .GroupBy(_ => 1)
                .Select(g => new { Min = (DateTime?)g.Min(p => p.Fecha), Max = (DateTime?)g.Max(p => p.Fecha) })
                .FirstOrDefaultAsync(ct);

            return (r?.Min, r?.Max);
        }

        public Task<List<FormaPagoItemDto>> ObtenerFormasPagoAsync(CancellationToken ct = default)
            => _db.FormasdePagos.AsNoTracking()
                .OrderBy(f => f.Id)
                .Select(f => new FormaPagoItemDto { Id = f.Id, Nombre = f.Nombre })
                .ToListAsync(ct);

        // ------------------------------------------------------------------ Ventas
        private IQueryable<Pedido> PedidosVendidos(DateTime desde, DateTime hastaExclusivo, int? idCliente, int? idFormaPago)
        {
            // Una "venta" es un pedido con importe abonado > 0 (igual que las filas de la hoja de ventas del Excel).
            var q = _db.Pedidos.AsNoTracking()
                .Where(p => p.Fecha >= desde && p.Fecha < hastaExclusivo && (p.ImporteAbonado ?? 0) > 0);

            if (idCliente.HasValue) q = q.Where(p => p.IdCliente == idCliente.Value);
            if (idFormaPago.HasValue) q = q.Where(p => p.IdFormaPago == idFormaPago.Value);
            return q;
        }

        public Task<List<VentaRaw>> ObtenerVentasAsync(DateTime desde, DateTime hastaExclusivo, int? idCliente, int? idFormaPago, CancellationToken ct = default)
            => PedidosVendidos(desde, hastaExclusivo, idCliente, idFormaPago)
                .OrderBy(p => p.Fecha).ThenBy(p => p.Id)
                .Select(p => new VentaRaw
                {
                    Id = p.Id,
                    Fecha = p.Fecha,
                    IdCliente = p.IdCliente,
                    Cliente = p.IdClienteNavigation == null ? null : p.IdClienteNavigation.Nombre,
                    IdFormaPago = p.IdFormaPago,
                    FormaPago = p.IdFormaPagoNavigation == null ? null : p.IdFormaPagoNavigation.Nombre,
                    ImporteTotal = p.ImporteTotal ?? 0,
                    SubTotal = p.SubTotal ?? 0,
                    PorcDescuento = p.PorcDescuento ?? 0,
                    ImporteAbonado = p.ImporteAbonado ?? 0,
                    Saldo = p.Saldo ?? 0,
                    CfPorcPedido = p.CostoFinancieroPorc,
                    CfPorcForma = p.IdFormaPagoNavigation == null ? null : p.IdFormaPagoNavigation.CostoFinanciero,
                    NroFactura = p.NroFactura,
                    Unidades = p.PedidosDetalles.Sum(d => d.Cantidad ?? 0),
                    Costo = p.PedidosDetalles.Sum(d => (d.CostoUnitario ?? 0) * (d.Cantidad ?? 0))
                })
                .ToListAsync(ct);

        // ------------------------------------------------------------------ Gastos
        public Task<List<GastoRaw>> ObtenerGastosAsync(DateTime desde, DateTime hastaExclusivo, int? idFormaPago, CancellationToken ct = default)
        {
            var q = _db.Gastos.AsNoTracking()
                .Where(g => g.Fecha >= desde && g.Fecha < hastaExclusivo);

            if (idFormaPago.HasValue) q = q.Where(g => g.IdFormadePago == idFormaPago.Value);

            return q.OrderBy(g => g.Fecha).ThenBy(g => g.Id)
                .Select(g => new GastoRaw
                {
                    Id = g.Id,
                    Fecha = g.Fecha,
                    IdCategoria = g.IdCategoria,
                    Categoria = g.IdCategoriaNavigation.Nombre,
                    Tipo = g.IdCategoriaNavigation.IdTipoNavigation == null ? null : g.IdCategoriaNavigation.IdTipoNavigation.Nombre,
                    IdFormaPago = g.IdFormadePago,
                    FormaPago = g.IdFormadePagoNavigation.Nombre,
                    ImporteTotal = g.ImporteTotal,
                    Saldo = g.Saldo,
                    Comentarios = g.Comentarios
                })
                .ToListAsync(ct);
        }

        // ------------------------------------------------------------------ Productos
        public async Task<ProductosAgregadosResultado> ObtenerProductosAgregadosAsync(
            DateTime desde, DateTime hastaExclusivo, int? idCliente, int? idFormaPago, CancellationToken ct = default)
        {
            var pedidos = PedidosVendidos(desde, hastaExclusivo, idCliente, idFormaPago);

            // Un único GROUP BY en SQL: el ingreso de cada línea ya lleva el descuento del pedido.
            // PedidosDetalle.PrecioVenta es el TOTAL de la línea; CostoUnitario es por unidad.
            var filas = await (
                from d in _db.PedidosDetalles.AsNoTracking()
                join p in pedidos on d.IdPedido equals p.Id
                where d.IdProducto != null
                group new { d, p } by new { d.IdProducto, d.IdCategoria } into g
                select new ProductoAgregadoRaw
                {
                    IdProducto = g.Key.IdProducto!.Value,
                    IdCategoria = g.Key.IdCategoria,
                    NombreEnPedido = g.Max(x => x.d.Producto),
                    Pedidos = g.Select(x => x.p.Id).Distinct().Count(),
                    Unidades = g.Sum(x => x.d.Cantidad ?? 0),
                    Ingreso = g.Sum(x => (x.d.PrecioVenta ?? 0) * (1 - (x.p.PorcDescuento ?? 0) / 100m)),
                    Costo = g.Sum(x => (x.d.CostoUnitario ?? 0) * (x.d.Cantidad ?? 0))
                })
                .ToListAsync(ct);

            // Tablas chicas (cientos de filas): se leen completas, una sola vez, para resolver nombres.
            var nombresProducto = await _db.Productos.AsNoTracking()
                .Select(p => new { p.Id, p.Nombre })
                .ToDictionaryAsync(p => p.Id, p => p.Nombre, ct);

            var nombresCategoria = await _db.ProductosCategorias.AsNoTracking()
                .Select(c => new { c.Id, c.Nombre })
                .ToDictionaryAsync(c => c.Id, c => c.Nombre, ct);

            return new ProductosAgregadosResultado
            {
                Filas = filas,
                NombresProducto = nombresProducto,
                NombresCategoria = nombresCategoria
            };
        }

        // ------------------------------------------------------------------ Detalle de un pedido
        public async Task<PedidoDetalleRaw?> ObtenerDetallePedidoAsync(int idPedido, CancellationToken ct = default)
        {
            var cab = await _db.Pedidos.AsNoTracking()
                .Where(p => p.Id == idPedido)
                .Select(p => new VentaRaw
                {
                    Id = p.Id,
                    Fecha = p.Fecha,
                    IdCliente = p.IdCliente,
                    Cliente = p.IdClienteNavigation == null ? null : p.IdClienteNavigation.Nombre,
                    IdFormaPago = p.IdFormaPago,
                    FormaPago = p.IdFormaPagoNavigation == null ? null : p.IdFormaPagoNavigation.Nombre,
                    ImporteTotal = p.ImporteTotal ?? 0,
                    SubTotal = p.SubTotal ?? 0,
                    PorcDescuento = p.PorcDescuento ?? 0,
                    ImporteAbonado = p.ImporteAbonado ?? 0,
                    Saldo = p.Saldo ?? 0,
                    CfPorcPedido = p.CostoFinancieroPorc,
                    CfPorcForma = p.IdFormaPagoNavigation == null ? null : p.IdFormaPagoNavigation.CostoFinanciero,
                    NroFactura = p.NroFactura,
                    Comentarios = p.Comentarios,
                    Unidades = p.PedidosDetalles.Sum(d => d.Cantidad ?? 0),
                    Costo = p.PedidosDetalles.Sum(d => (d.CostoUnitario ?? 0) * (d.Cantidad ?? 0))
                })
                .FirstOrDefaultAsync(ct);

            if (cab == null) return null;

            var lineas = await _db.PedidosDetalles.AsNoTracking()
                .Where(d => d.IdPedido == idPedido)
                .OrderBy(d => d.Id)
                .Select(d => new LineaPedidoRaw
                {
                    IdProducto = d.IdProducto ?? 0,
                    ProductoEnPedido = d.Producto,
                    ProductoActual = d.IdProductoNavigation == null ? null : d.IdProductoNavigation.Nombre,
                    Categoria = d.IdCategoriaNavigation == null ? null : d.IdCategoriaNavigation.Nombre,
                    Color = d.IdColorNavigation == null ? null : d.IdColorNavigation.Nombre,
                    Cantidad = d.Cantidad ?? 0,
                    PrecioLinea = d.PrecioVenta ?? 0,
                    CostoUnitario = d.CostoUnitario ?? 0
                })
                .ToListAsync(ct);

            return new PedidoDetalleRaw { Cabecera = cab, Lineas = lineas };
        }
    }
}
