using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class StockMovimiento
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int IdTipoMovimiento { get; set; }

    public string? Comentario { get; set; }

    public int? IdUsuario { get; set; }

    public bool EsAnulado { get; set; }

    public DateTime FechaAlta { get; set; }

    public virtual StockTiposMovimiento IdTipoMovimientoNavigation { get; set; } = null!;

    public virtual ICollection<StockMovimientosDetalle> StockMovimientosDetalles { get; set; } = new List<StockMovimientosDetalle>();
}
