using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PagosPedidosCliente
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public DateTime Fecha { get; set; }

    public int IdMoneda { get; set; }

    public decimal? Cotizacion { get; set; }

    public decimal Total { get; set; }

    public decimal TotalArs { get; set; }

    public string? Observacion { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }
}
