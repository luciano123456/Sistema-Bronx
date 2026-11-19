using SistemaBronx.Models.Analisis;

namespace SistemaBronx.DAL.Repository
{
    /// <summary>
    /// Acceso a datos del análisis. Todo con EF Core (sin stored procedures):
    /// proyecciones mínimas, AsNoTracking y filtros resueltos en SQL.
    /// </summary>
    public interface IAnalisisDatosRepository
    {
        Task<(DateTime? Primera, DateTime? Ultima)> ObtenerRangoFechasAsync(CancellationToken ct = default);

        Task<List<FormaPagoItemDto>> ObtenerFormasPagoAsync(CancellationToken ct = default);

        /// <summary>Pedidos con importe abonado &gt; 0 en [desde, hastaExclusivo).</summary>
        Task<List<VentaRaw>> ObtenerVentasAsync(DateTime desde, DateTime hastaExclusivo, int? idCliente, int? idFormaPago, CancellationToken ct = default);

        /// <summary>Gastos en [desde, hastaExclusivo).</summary>
        Task<List<GastoRaw>> ObtenerGastosAsync(DateTime desde, DateTime hastaExclusivo, int? idFormaPago, CancellationToken ct = default);

        /// <summary>Agregado por producto de las líneas de pedidos con abonado &gt; 0, resuelto en SQL (GROUP BY).</summary>
        Task<ProductosAgregadosResultado> ObtenerProductosAgregadosAsync(DateTime desde, DateTime hastaExclusivo, int? idCliente, int? idFormaPago, CancellationToken ct = default);

        Task<PedidoDetalleRaw?> ObtenerDetallePedidoAsync(int idPedido, CancellationToken ct = default);
    }
}
