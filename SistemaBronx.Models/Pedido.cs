using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Pedido
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int? IdCliente { get; set; }

    public decimal? ImporteTotal { get; set; }

    public decimal? SubTotal { get; set; }

    public decimal? PorcDescuento { get; set; }

    public decimal? ImporteAbonado { get; set; }

    public decimal? Saldo { get; set; }

    public int? IdFormaPago { get; set; }

    public int? Finalizado { get; set; }

    public string? Comentarios { get; set; }

    public int? Facturado { get; set; }

    public string? NroFactura { get; set; }

    public virtual Cliente? IdClienteNavigation { get; set; }

    public virtual FormasdePago? IdFormaPagoNavigation { get; set; }

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();
}
