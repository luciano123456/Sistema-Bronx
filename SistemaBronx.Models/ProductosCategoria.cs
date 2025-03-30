using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class ProductosCategoria
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();

    public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
