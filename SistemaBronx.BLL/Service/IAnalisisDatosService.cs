using SistemaBronx.Models.Analisis;

namespace SistemaBronx.BLL.Service
{
    public interface IAnalisisDatosService
    {
        /// <summary>Rango de fechas con datos, años disponibles y formas de pago (para armar los chips del filtro).</summary>
        Task<AnalisisMetaDto> ObtenerMetaAsync(CancellationToken ct = default);

        /// <summary>Todo el tablero (KPIs, series, medios de pago, productos, categorías, clientes, gastos) calculado en código.</summary>
        Task<AnalisisDashboardDto> ObtenerDashboardAsync(AnalisisFiltro filtro, CancellationToken ct = default);

        /// <summary>Detalle de ventas con las columnas de la hoja de ventas del Excel (abonado, IVA, CF, ganancia neta).</summary>
        Task<VentasDetalleDto> ObtenerVentasDetalleAsync(AnalisisFiltro filtro, CancellationToken ct = default);

        /// <summary>Detalle de gastos con las columnas de la hoja de gastos del Excel (importe total, neto).</summary>
        Task<GastosDetalleDto> ObtenerGastosDetalleAsync(AnalisisFiltro filtro, CancellationToken ct = default);

        /// <summary>Cabecera + líneas de producto de un pedido.</summary>
        Task<VentaDetallePedidoDto?> ObtenerDetallePedidoAsync(int idPedido, CancellationToken ct = default);
    }
}
