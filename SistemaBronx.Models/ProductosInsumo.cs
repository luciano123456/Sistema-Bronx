using System;
using System.Collections.Generic;
using System.Drawing;

namespace SistemaBronx.Models;

public partial class ProductosInsumo
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public int IdInsumo { get; set; }

    public int IdColor { get; set; }

    public string? Especificacion { get; set; }

    public decimal CostoUnitario { get; set; }

    public decimal SubTotal { get; set; }

    public decimal Cantidad { get; set; }

    public virtual Color IdColorNavigation { get; set; } = null!;

    public virtual Insumo IdInsumoNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;
}
