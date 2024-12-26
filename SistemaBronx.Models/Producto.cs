using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Producto
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string? Descripcion { get; set; }

    public int? IdColor { get; set; }

    public int? IdCategoria { get; set; }

    public int? PorcGanancia { get; set; }

    public int? PorcIibbmpml { get; set; }

    public int? PorcIva { get; set; }

    public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

    public virtual Color? IdColorNavigation { get; set; }

    public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
}
