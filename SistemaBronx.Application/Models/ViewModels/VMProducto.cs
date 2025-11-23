using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;

        public int? IdCategoria { get; set; }

        public decimal PorcGanancia { get; set; }

        public decimal? PorcIva { get; set; }

        public decimal CostoUnitario { get; set; }

        public string Categoria { get; set; }

        // ------------- NUEVO -------------
        public decimal TotalInsumos { get; set; }

        // ------------- OPCIONAL (como pediste) -------------
        public VMTotalInsumos TotalInsumosVM { get; set; }

        public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }
        public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();
    }

    // =======================
    // NUEVO VM TOTAL INSUMOS
    // =======================
    public class VMTotalInsumos
    {
        public int IdProducto { get; set; }
        public decimal Total { get; set; }
    }
}
