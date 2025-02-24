using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }

        public string Codigo { get; set; } = null!;

        public string? Descripcion { get; set; }

        public int? IdCategoria { get; set; }

        public int? PorcGanancia { get; set; }

        public int? PorcIva { get; set; }
        public decimal CostoUnitario { get; set; }

        public string Color { get; set; }
        public string Categoria { get; set; }

        public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }
        public virtual ICollection<ProductosInsumo> ProductosInsumos { get; set; } = new List<ProductosInsumo>();

    }
}
