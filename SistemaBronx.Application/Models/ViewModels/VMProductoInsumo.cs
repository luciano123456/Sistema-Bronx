using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMProductoInsumo
    {
        public int Id { get; set; }

        public int IdProducto { get; set; }

        public int IdInsumo { get; set; }
        public int IdColor { get; set; }
        public int IdEstado { get; set; }
        public int IdTipo { get; set; }
        public int IdCategoria { get; set; }
        public int IdUnidadMedida { get; set; }
        public int IdProveedor { get; set; }


        public string? Especificacion { get; set; }
        public string? Nombre { get; set; }
        public string? Categoria { get; set; }
        public string? Comentarios { get; set; }
        public string? Color { get; set; }
        public string? Estado { get; set; }
        public string? Tipo { get; set; }

        public decimal Cantidad { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal SubTotal { get; set; }
        public virtual Insumo IdInsumoNavigation { get; set; } = null!;

        public virtual Producto IdProductoNavigation { get; set; } = null!;

    }
}
