using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class CotizacionesDetalleProceso
{
    public int Id { get; set; }

    public int? IdDetalle { get; set; }

    public int? IdCotizacion { get; set; }

    public int? IdProducto { get; set; }

    public decimal? Cantidad { get; set; }

    public int? IdInsumo { get; set; }

    public string? Descripcion { get; set; }

    public int? IdTipo { get; set; }

    public int? IdCategoria { get; set; }

    public int? IdUnidadMedida { get; set; }

    public int? IdColor { get; set; }

    public int? IdProveedor { get; set; }

    public string? Especificacion { get; set; }

    public decimal? PrecioUnitario { get; set; }

    public decimal? SubTotal { get; set; }

    public string? Comentarios { get; set; }

    public int? IdEstado { get; set; }

    public DateTime? FechaActualizacion { get; set; }

    public virtual InsumosCategoria? IdCategoriaNavigation { get; set; }

    public virtual Color? IdColorNavigation { get; set; }

    public virtual Cotizacion? IdCotizacionNavigation { get; set; }

    public virtual CotizacionesDetalle? IdDetalleNavigation { get; set; }

    public virtual PedidosEstado? IdEstadoNavigation { get; set; }

    public virtual Insumo? IdInsumoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public virtual Proveedor? IdProveedorNavigation { get; set; }

    public virtual InsumosTipo? IdTipoNavigation { get; set; }

    public virtual UnidadesDeMedida? IdUnidadMedidaNavigation { get; set; }
}
