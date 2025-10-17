using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosCategoria
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<CotizacionesDetalleProceso> CotizacionesDetalleProcesos { get; set; } = new List<CotizacionesDetalleProceso>();

    public virtual ICollection<CotizacionesDetalle> CotizacionesDetalles { get; set; } = new List<CotizacionesDetalle>();
}
