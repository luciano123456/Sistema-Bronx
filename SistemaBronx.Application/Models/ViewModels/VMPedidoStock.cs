
namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMValidacionStockPedido
    {
        public bool Ok { get; set; } = true;
        public List<string> Errores { get; set; } = new();
        public List<VMDisponibilidadStockItem> Items { get; set; } = new();
    }

    public class VMDisponibilidadStockItem
    {
        public string TipoItem { get; set; } = string.Empty; // P / I
        public int? IdProducto { get; set; }
        public int? IdInsumo { get; set; }
        public string Nombre { get; set; } = string.Empty;

        public decimal CantidadSolicitada { get; set; }
        public decimal CantidadDisponible { get; set; }
        public decimal CantidadFaltante { get; set; }

        public bool Alcanza { get; set; }
    }
}