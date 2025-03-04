﻿using System;
using System.Collections.Generic;
namespace SistemaBronx.Models;

public partial class PedidosTipo
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();
}
