using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosDetalleStock
{
    public int Id { get; set; }

    public int IdPedidoDetalle { get; set; }

    public int IdStockMovimientoDetalle { get; set; }

    public decimal CantidadUsada { get; set; }

    public virtual PedidosDetalle IdPedidoDetalleNavigation { get; set; } = null!;

    public virtual StockMovimientosDetalle IdStockMovimientoDetalleNavigation { get; set; } = null!;
}
