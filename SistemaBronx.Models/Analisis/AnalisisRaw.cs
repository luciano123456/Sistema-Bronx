namespace SistemaBronx.Models.Analisis;

// Filas "crudas" que lee el repositorio (proyecciones mínimas, sin tracking).
// La lógica de negocio (IVA, costo financiero, neto, agregaciones) vive en AnalisisDatosService + ReglasAnalisis.

public record VentaRaw
{
    public int Id { get; init; }
    public DateTime Fecha { get; init; }
    public int? IdCliente { get; init; }
    public string? Cliente { get; init; }
    public int? IdFormaPago { get; init; }
    public string? FormaPago { get; init; }
    public decimal ImporteTotal { get; init; }
    public decimal SubTotal { get; init; }
    public decimal PorcDescuento { get; init; }
    public decimal ImporteAbonado { get; init; }
    public decimal Saldo { get; init; }
    public decimal? CfPorcPedido { get; init; }
    public decimal? CfPorcForma { get; init; }
    public string? NroFactura { get; init; }
    public string? Comentarios { get; init; }
    public decimal Unidades { get; init; }
    public decimal Costo { get; init; }
}

public record GastoRaw
{
    public int Id { get; init; }
    public DateTime Fecha { get; init; }
    public int IdCategoria { get; init; }
    public string? Categoria { get; init; }
    public string? Tipo { get; init; }
    public int IdFormaPago { get; init; }
    public string? FormaPago { get; init; }
    public decimal ImporteTotal { get; init; }
    public decimal Saldo { get; init; }
    public string? Comentarios { get; init; }
}

/// <summary>Agregado SQL por (producto, categoría de la línea).</summary>
public record ProductoAgregadoRaw
{
    public int IdProducto { get; init; }
    public int? IdCategoria { get; init; }
    public string? NombreEnPedido { get; init; }
    public int Pedidos { get; init; }
    public decimal Unidades { get; init; }
    public decimal Ingreso { get; init; }
    public decimal Costo { get; init; }
}

public record ProductosAgregadosResultado
{
    public List<ProductoAgregadoRaw> Filas { get; init; } = new();
    public Dictionary<int, string> NombresProducto { get; init; } = new();
    public Dictionary<int, string> NombresCategoria { get; init; } = new();
}

public record LineaPedidoRaw
{
    public int IdProducto { get; init; }
    public string? ProductoEnPedido { get; init; }
    public string? ProductoActual { get; init; }
    public string? Categoria { get; init; }
    public string? Color { get; init; }
    public decimal Cantidad { get; init; }
    public decimal PrecioLinea { get; init; }
    public decimal CostoUnitario { get; init; }
}

public record PedidoDetalleRaw
{
    public VentaRaw Cabecera { get; init; } = new();
    public List<LineaPedidoRaw> Lineas { get; init; } = new();
}
