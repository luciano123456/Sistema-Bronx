using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class Producto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int? IdCategoria { get; set; }

    public decimal? PorcGanancia { get; set; }

    public decimal? PorcIva { get; set; }

    public decimal CostoUnitario { get; set; }

    public virtual ICollection<CotizacionesDetalleProceso> CotizacionesDetalleProcesos { get; set; } = new List<CotizacionesDetalleProceso>();

    public virtual ICollection<CotizacionesDetalle> CotizacionesDetalles { get; set; } = new List<CotizacionesDetalle>();

    public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();

    public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();

    public virtual ICollection<StockMovimientosDetalle> StockMovimientosDetalles { get; set; } = new List<StockMovimientosDetalle>();

    public virtual ICollection<StockSaldo> StockSaldos { get; set; } = new List<StockSaldo>();
}
