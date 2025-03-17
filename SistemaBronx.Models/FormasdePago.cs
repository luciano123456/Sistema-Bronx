﻿using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class FormasdePago
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

    public virtual ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
}
