using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosDetalleProcesosStock
{
    public int Id { get; set; }

    public int IdPedidoDetalleProceso { get; set; }

    public int IdStockMovimientoDetalle { get; set; }

    public decimal CantidadUsada { get; set; }

    public virtual PedidosDetalleProceso IdPedidoDetalleProcesoNavigation { get; set; } = null!;

    public virtual StockMovimientosDetalle IdStockMovimientoDetalleNavigation { get; set; } = null!;
}
