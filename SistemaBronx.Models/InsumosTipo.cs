using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class InsumosTipo
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<CotizacionesDetalleProceso> CotizacionesDetalleProcesos { get; set; } = new List<CotizacionesDetalleProceso>();

    public virtual ICollection<Insumo> Insumos { get; set; } = new List<Insumo>();
}
