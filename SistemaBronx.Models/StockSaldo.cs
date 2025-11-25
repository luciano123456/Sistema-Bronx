using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class StockSaldo
{
    public int Id { get; set; }

    public string TipoItem { get; set; } = null!;

    public int? IdProducto { get; set; }

    public int? IdInsumo { get; set; }

    public decimal CantidadActual { get; set; }

    public DateTime FechaUltMovimiento { get; set; }

    public virtual Insumo? IdInsumoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }
}
