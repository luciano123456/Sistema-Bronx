using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMPedidoDetalle
    {
        public int Id { get; set; }

        public int? IdPedido { get; set; }

        public int? IdProducto { get; set; }

        public decimal? Cantidad { get; set; }

        public int? IdColor { get; set; }

        public int? IdCategoria { get; set; }

        public decimal? CostoUnitario { get; set; }
        public decimal? PrecioVenta { get; set; }
        public decimal? PrecioVentaUnitario { get; set; }
        public decimal? IVA { get; set; }
        public decimal? Ganancia { get; set; }

        public decimal? PorcGanancia { get; set; }
        public decimal? PorcIva { get; set; }

        public string Nombre { get; set; }
        public string Categoria { get; set; }
        public string Color { get; set; }

        public bool UsaStock { get; set; }
        public decimal? CantidadStock { get; set; }
        public decimal? Stock { get; set; }
        public decimal? StockDisponible { get; set; }

        public bool UsaStockProducto { get; set; }
        public decimal? CantidadStockProducto { get; set; }
        public string Producto { get; set; }

        public virtual PedidosCategoria? IdCategoriaNavigation { get; set; }

        public virtual Color? IdColorNavigation { get; set; }

        public virtual Pedido? IdPedidoNavigation { get; set; }

        public virtual Producto? IdProductoNavigation { get; set; }

        public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();
    }
}
