using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Color
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<CotizacionesDetalleProceso> CotizacionesDetalleProcesos { get; set; } = new List<CotizacionesDetalleProceso>();

    public virtual ICollection<CotizacionesDetalle> CotizacionesDetalles { get; set; } = new List<CotizacionesDetalle>();

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();
}
