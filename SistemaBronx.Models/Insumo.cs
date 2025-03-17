using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;
public partial class Insumo
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;

    public int IdTipo { get; set; }

    public int IdCategoria { get; set; }

    public int IdUnidadMedida { get; set; }

    public int? IdProveedor { get; set; }

    public string? Especificacion { get; set; }

    public decimal PrecioCosto { get; set; }

    public decimal PorcGanancia { get; set; }

    public decimal PrecioVenta { get; set; }

    public virtual InsumosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual Proveedor? IdProveedorNavigation { get; set; }

    public virtual InsumosTipo IdTipoNavigation { get; set; } = null!;

    public virtual UnidadesDeMedida IdUnidadMedidaNavigation { get; set; } = null!;

    public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

    public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
}
