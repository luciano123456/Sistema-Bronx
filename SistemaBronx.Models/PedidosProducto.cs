using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosProducto
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public int? IdProducto { get; set; }

    public decimal? Precio { get; set; }

    public int? Cantidad { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }
}
