using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public partial class VMInsumo
    {
        public int Id { get; set; }

        public string Descripcion { get; set; } = null!;

        public int IdTipo { get; set; }

        public int IdCategoria { get; set; }

        public int IdUnidadMedida { get; set; }

        public int IdProveedor { get; set; }

        public string? Especificacion { get; set; }
        

        public decimal? PrecioCosto { get; set; }

        public decimal? PorcGanancia { get; set; }

        public decimal? PrecioVenta { get; set; }

        public string? Proveedor { get; set; }
        public string? Categoria { get; set; }
        public string? UnidaddeMedida { get; set; }
        public string? Tipo { get; set; }

        public virtual InsumosCategoria IdCategoriaNavigation { get; set; } = null!;

        public virtual Proveedor IdProveedorNavigation { get; set; } = null!;

        public virtual InsumosTipo IdTipoNavigation { get; set; } = null!;

        public virtual UnidadesDeMedida IdUnidadMedidaNavigation { get; set; } = null!;

        public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
    }
}