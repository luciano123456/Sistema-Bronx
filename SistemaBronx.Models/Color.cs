using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Color
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();

    public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
}
