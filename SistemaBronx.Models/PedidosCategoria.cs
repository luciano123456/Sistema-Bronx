using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;
public partial class PedidosCategoria
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();
}
