using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class StockTiposMovimiento
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public bool EsEntrada { get; set; }

    public bool EsInventarioInicial { get; set; }

    public bool? Activo { get; set; }

    public virtual ICollection<StockMovimiento> StockMovimientos { get; set; } = new List<StockMovimiento>();
}
