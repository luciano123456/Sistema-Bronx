using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Cotizacion
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

    public virtual ICollection<CotizacionesDetalleProceso> CotizacionesDetalleProcesos { get; set; } = new List<CotizacionesDetalleProceso>();

    public virtual ICollection<CotizacionesDetalle> CotizacionesDetalles { get; set; } = new List<CotizacionesDetalle>();

    public virtual Cliente? IdClienteNavigation { get; set; }

    public virtual FormasdePago? IdFormaPagoNavigation { get; set; }
}
