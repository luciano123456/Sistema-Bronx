using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class StockMovimientosDetalle
{
    public int Id { get; set; }

    public int IdMovimiento { get; set; }

    public string TipoItem { get; set; } = null!;

    public int? IdProducto { get; set; }

    public int? IdInsumo { get; set; }

    public decimal Cantidad { get; set; }

    public decimal? CostoUnitario { get; set; }

    public decimal? SubTotal { get; set; }

    public DateTime FechaCreado { get; set; }

    public virtual Insumo? IdInsumoNavigation { get; set; }

    public virtual StockMovimiento IdMovimientoNavigation { get; set; } = null!;

    public virtual Producto? IdProductoNavigation { get; set; }
}
