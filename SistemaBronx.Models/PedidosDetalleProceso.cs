using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

public partial class PedidosDetalleProceso
{
    public int Id { get; set; }

    public int? IdDetalle { get; set; }

    public int? IdPedido { get; set; }

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

    public virtual PedidosCategoria? IdCategoriaNavigation { get; set; }

    public virtual Color? IdColorNavigation { get; set; }

    public virtual PedidosDetalle? IdDetalleNavigation { get; set; }

    public virtual PedidosEstado? IdEstadoNavigation { get; set; }

    public virtual Insumo? IdInsumoNavigation { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public virtual Proveedor? IdProveedorNavigation { get; set; }

    public virtual PedidosTipo? IdTipoNavigation { get; set; }

    public virtual UnidadesDeMedida? IdUnidadMedidaNavigation { get; set; }
}
