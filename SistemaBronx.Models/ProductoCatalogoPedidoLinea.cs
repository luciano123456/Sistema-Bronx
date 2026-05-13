namespace SistemaBronx.Models;

/// <summary>
/// Una fila del catálogo del modal de pedidos. Con stock: producto + color + stock de ese color.
/// Fabricación: una fila por producto sin stock PT total; <see cref="IdColor"/> 0 y color placeholder hasta elegir en el formulario.
/// </summary>
public class ProductoCatalogoPedidoLinea
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int IdCategoria { get; set; }

    public string Categoria { get; set; } = "";

    public decimal PorcGanancia { get; set; }

    public decimal? PorcIva { get; set; }

    public decimal CostoUnitario { get; set; }

    public int IdColor { get; set; }

    public string Color { get; set; } = "";

    public decimal Stock { get; set; }
}
