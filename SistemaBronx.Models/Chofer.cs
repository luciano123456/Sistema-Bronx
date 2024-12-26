using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Chofer
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? Direccion { get; set; }
}
