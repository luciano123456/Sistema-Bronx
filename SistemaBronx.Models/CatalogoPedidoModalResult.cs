namespace SistemaBronx.Models;

/// <summary>
/// Catálogo del modal de pedidos: PT por producto×color con stock; fabricación por producto (sin stock PT total).
/// </summary>
public sealed class CatalogoPedidoModalResult
{
    /// <summary>Líneas con stock de producto terminado &gt; 0 en ese color (solapa Terminados).</summary>
    public List<ProductoCatalogoPedidoLinea> LineasConStock { get; init; } = new();

    /// <summary>Una fila por producto sin stock PT en ningún color; el color se elige al añadir (solapa Fabricación).</summary>
    public List<ProductoCatalogoPedidoLinea> LineasFabricacion { get; init; } = new();
}
