using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class GastosCategoria
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int? IdTipo { get; set; }

    public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

    public virtual GastosTipo? IdTipoNavigation { get; set; }
}
