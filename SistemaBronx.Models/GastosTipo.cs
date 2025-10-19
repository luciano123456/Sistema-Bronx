using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class GastosTipo
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<GastosCategoria> GastosCategoria { get; set; } = new List<GastosCategoria>();
}
