using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Gasto
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCategoria { get; set; }

    public int IdFormadePago { get; set; }

    public decimal? Iva { get; set; }

    public decimal ImporteTotal { get; set; }

    public decimal ImporteAbonado { get; set; }

    public decimal Saldo { get; set; }

    public string? Comentarios { get; set; }


    public virtual GastosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual FormasdePago IdFormadePagoNavigation { get; set; } = null!;
}
