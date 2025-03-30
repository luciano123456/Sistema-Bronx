using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosDetalle
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public int? IdProducto { get; set; }

    public decimal? Cantidad { get; set; }

    public int? IdColor { get; set; }

    public int? IdCategoria { get; set; }

    public decimal? CostoUnitario { get; set; }

    public int? PorcGanancia { get; set; }

    public int? PorcIva { get; set; }

    public decimal? PrecioVenta { get; set; }

    public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

    public virtual Color? IdColorNavigation { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();
}
