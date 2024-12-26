﻿using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Proveedor
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Apodo { get; set; }

    public string? Ubicacion { get; set; }

    public string? Telefono { get; set; }

    public virtual ICollection<Insumo> Insumos { get; set; } = new List<Insumo>();
}
