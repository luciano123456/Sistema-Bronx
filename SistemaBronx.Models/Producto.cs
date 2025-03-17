using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;
public partial class Producto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int? IdCategoria { get; set; }

    public int? PorcGanancia { get; set; }

    public int? PorcIva { get; set; }

    public decimal CostoUnitario { get; set; }

    public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();

    public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
}
