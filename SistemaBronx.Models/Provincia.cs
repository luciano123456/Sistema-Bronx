using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Provincia
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
}
