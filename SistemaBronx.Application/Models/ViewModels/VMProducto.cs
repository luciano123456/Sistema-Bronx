using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }

        public DateTime? FechaActualizacion { get; set; }

        public string Descripcion { get; set; } = null!;
        public string Image { get; set; } = null!;
        public string Marca { get; set; } = null!;
        public string Categoria { get; set; } = null!;
        public string UnidadDeMedida { get; set; } = null!;
        public string Moneda { get; set; } = null!;
        public string Proveedor { get; set; } = null!;

        public int? IdMarca { get; set; }

        public int? IdCategoria { get; set; }

        public int? IdUnidadDeMedida { get; set; }
        public int IdMoneda { get; set; }

        public decimal PCosto { get; set; }

        public decimal PVenta { get; set; }

        public decimal PorcGanancia { get; set; }

        public int IdCliente { get; set; }
        public int IdProveedor { get; set; }

        public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

        public virtual ProductosMarca? IdMarcaNavigation { get; set; }

        public virtual Proveedor? IdProveedorNavigation { get; set; }

        public virtual UnidadesDeMedida? IdUnidadDeMedidaNavigation { get; set; }

    }
}
