namespace SistemaBronx.Models.Analisis;

/// <summary>Filtro común del módulo. <see cref="Hasta"/> es INCLUSIVO (se compara contra el día completo).</summary>
public record AnalisisFiltro
{
    public DateTime Desde { get; init; }
    public DateTime Hasta { get; init; }
    public int? IdCliente { get; init; }
    public int? IdFormaPago { get; init; }

    /// <summary>Límite superior exclusivo (Hasta + 1 día a las 00:00), apto para <c>Fecha &lt; HastaExclusivo</c>.</summary>
    public DateTime HastaExclusivo => Hasta.Date.AddDays(1);
}

// ============================================================ META
public record FormaPagoItemDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
}

public record AnalisisMetaDto
{
    public DateTime? PrimeraFecha { get; init; }
    public DateTime? UltimaFecha { get; init; }
    public List<int> Anios { get; init; } = new();
    public List<FormaPagoItemDto> FormasPago { get; init; } = new();
}

// ============================================================ KPIs
public record AnalisisKpisDto
{
    // ---- Ventas (fórmulas del Excel)
    public decimal Ventas { get; init; }                // Σ importe abonado
    public decimal Iva { get; init; }
    public decimal CostoFinanciero { get; init; }
    public decimal GananciaNeta { get; init; }          // abonado - IVA - CF  ("ingreso en mano")

    // ---- Gastos (fórmulas del Excel)
    public decimal GastosTotal { get; init; }           // Σ importe total
    public decimal GastosNeto { get; init; }
    public decimal GastosInsumosNeto { get; init; }
    public decimal GastosOperativosNeto { get; init; }

    // ---- Resultado
    public decimal Resultado { get; init; }             // ganancia neta - gastos netos
    public decimal? ResultadoPct { get; init; }         // resultado / ganancia neta

    // ---- Actividad
    public int Pedidos { get; init; }
    public decimal Unidades { get; init; }
    public int Clientes { get; init; }
    public decimal TicketPromedio { get; init; }        // ventas / pedidos
    public decimal VentaPorCliente { get; init; }       // ventas / clientes

    // ---- Margen sobre costo de producto
    public decimal Facturado { get; init; }             // Σ SubTotal (con descuento aplicado)
    public decimal CostoMercaderia { get; init; }       // Σ costo unitario * cantidad
    public decimal MargenBruto { get; init; }
    public decimal? MargenBrutoPct { get; init; }
    public decimal SaldoPendiente { get; init; }        // Σ saldo de pedidos del período
}

// ============================================================ SERIES
public record SeriePuntoDto
{
    public string Clave { get; init; } = "";            // "2026-06" o "2026-06-12"
    public DateTime Desde { get; init; }
    public int Pedidos { get; init; }
    public decimal Unidades { get; init; }
    public decimal Ventas { get; init; }
    public decimal Iva { get; init; }
    public decimal CostoFinanciero { get; init; }
    public decimal GananciaNeta { get; init; }
    public decimal GastosInsumosNeto { get; init; }
    public decimal GastosOperativosNeto { get; init; }
    public decimal GastosNeto { get; init; }
    public decimal Resultado { get; init; }
    public decimal TicketPromedio { get; init; }

    // Mismo mes del año anterior (solo serie mensual)
    public decimal? VentasAnioAnterior { get; init; }
    public decimal? GananciaNetaAnioAnterior { get; init; }
    public decimal? ResultadoAnioAnterior { get; init; }
    public decimal? VariacionVentasPct { get; init; }
}

public record ResumenAnioDto
{
    public int Anio { get; init; }
    public int Pedidos { get; init; }
    public decimal Ventas { get; init; }
    public decimal GananciaNeta { get; init; }
    public decimal GastosNeto { get; init; }
    public decimal Resultado { get; init; }
}

public record DiaSemanaDto
{
    public int Dia { get; init; }                       // 0 = lunes ... 6 = domingo
    public string Nombre { get; init; } = "";
    public int Pedidos { get; init; }
    public decimal Ventas { get; init; }
}

// ============================================================ MEDIOS DE PAGO
public record MedioPagoDto
{
    public int? IdFormaPago { get; init; }
    public string FormaPago { get; init; } = "";
    public int Pedidos { get; init; }
    public decimal Ventas { get; init; }
    public decimal Iva { get; init; }
    public decimal CostoFinanciero { get; init; }
    public decimal GananciaNeta { get; init; }
    public decimal? ParticipacionPct { get; init; }
}

// ============================================================ PRODUCTOS / CLIENTES / GASTOS
public record ProductoRankingDto
{
    public int IdProducto { get; init; }
    public string Producto { get; init; } = "";
    public int? IdCategoria { get; init; }
    public string Categoria { get; init; } = "";
    public int Pedidos { get; init; }                   // en cuántos pedidos aparece
    public decimal Unidades { get; init; }
    public decimal Ingreso { get; init; }               // Σ precio de línea con descuento del pedido
    public decimal Costo { get; init; }
    public decimal Margen { get; init; }
    public decimal? MargenPct { get; init; }
    public decimal? ParticipacionPct { get; init; }     // % del ingreso total de productos
}

public record GrupoRentabilidadDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
    public decimal Unidades { get; init; }
    public decimal Ingreso { get; init; }
    public decimal Costo { get; init; }
    public decimal Margen { get; init; }
    public decimal? MargenPct { get; init; }
}

public record ClienteRankingDto
{
    public int? IdCliente { get; init; }
    public string Cliente { get; init; } = "";
    public int Pedidos { get; init; }
    public decimal Ventas { get; init; }
    public decimal GananciaNeta { get; init; }
    public DateTime UltimaCompra { get; init; }
}

public record GastoCategoriaDto
{
    public int IdCategoria { get; init; }
    public string Categoria { get; init; } = "";
    public string Tipo { get; init; } = "";
    public int Cantidad { get; init; }
    public decimal Total { get; init; }
    public decimal Neto { get; init; }
    public decimal? ParticipacionPct { get; init; }
}

// ============================================================ DASHBOARD
public record AnalisisDashboardDto
{
    public DateTime Desde { get; init; }
    public DateTime Hasta { get; init; }
    public DateTime DesdeAnterior { get; init; }
    public DateTime HastaAnterior { get; init; }
    public string Granularidad { get; init; } = "mes"; // "dia" | "mes"

    /// <summary>false cuando se filtra por cliente: los gastos no pertenecen a un cliente, así que no se mezclan.</summary>
    public bool GastosAplican { get; init; } = true;

    public AnalisisKpisDto Kpis { get; init; } = new();
    public AnalisisKpisDto KpisAnterior { get; init; } = new();

    public List<SeriePuntoDto> Serie { get; init; } = new();      // según granularidad
    public List<SeriePuntoDto> Mensual { get; init; } = new();    // siempre mensual (con año anterior)
    public List<ResumenAnioDto> PorAnio { get; init; } = new();
    public List<DiaSemanaDto> PorDiaSemana { get; init; } = new();

    public List<MedioPagoDto> MediosPago { get; init; } = new();
    public List<ProductoRankingDto> Productos { get; init; } = new();   // todos, ordenados por unidades
    public List<GrupoRentabilidadDto> PorCategoria { get; init; } = new();
    public List<ClienteRankingDto> TopClientes { get; init; } = new();
    public List<GastoCategoriaDto> GastosPorCategoria { get; init; } = new();
}

// ============================================================ DETALLE DE VENTAS / GASTOS
public record VentaFilaDto
{
    public int Id { get; init; }
    public DateTime Fecha { get; init; }
    public int? IdCliente { get; init; }
    public string Cliente { get; init; } = "";
    public int? IdFormaPago { get; init; }
    public string FormaPago { get; init; } = "";
    public decimal ImporteTotal { get; init; }          // antes de descuento
    public decimal PorcDescuento { get; init; }
    public decimal SubTotal { get; init; }              // con descuento
    public decimal ImporteAbonado { get; init; }        // columna "Importe Abonado" del Excel
    public decimal Saldo { get; init; }
    public decimal CostoFinancieroPorc { get; init; }   // columna "% COSTO FINANCIERO"
    public decimal Iva { get; init; }                   // columna "IVA"
    public decimal CostoFinanciero { get; init; }       // columna "COSTO FINANCIERO"
    public decimal GananciaNeta { get; init; }          // columna "GANANCIA NETA"
    public decimal Unidades { get; init; }
    public decimal Costo { get; init; }
    public string? NroFactura { get; init; }
}

public record VentasDetalleDto
{
    public List<VentaFilaDto> Filas { get; init; } = new();
    public decimal TotalAbonado { get; init; }
    public decimal TotalIva { get; init; }
    public decimal TotalCostoFinanciero { get; init; }
    public decimal TotalGananciaNeta { get; init; }
    public decimal TotalSaldo { get; init; }
}

public record VentaLineaDto
{
    public int IdProducto { get; init; }
    public string Producto { get; init; } = "";
    public string Categoria { get; init; } = "";
    public string? Color { get; init; }
    public decimal Cantidad { get; init; }
    public decimal PrecioLinea { get; init; }           // total de línea sin descuento
    public decimal PrecioLineaNeto { get; init; }       // con descuento del pedido
    public decimal CostoUnitario { get; init; }
    public decimal Costo { get; init; }
    public decimal Margen { get; init; }
    public decimal? MargenPct { get; init; }
}

public record VentaDetallePedidoDto
{
    public VentaFilaDto Cabecera { get; init; } = new();
    public string? Comentarios { get; init; }
    public List<VentaLineaDto> Lineas { get; init; } = new();
}

public record GastoFilaDto
{
    public int Id { get; init; }
    public DateTime Fecha { get; init; }
    public int IdCategoria { get; init; }
    public string Categoria { get; init; } = "";
    public string Tipo { get; init; } = "";
    public int IdFormaPago { get; init; }
    public string FormaPago { get; init; } = "";
    public decimal ImporteTotal { get; init; }          // columna "Importe Total" del Excel
    public decimal Neto { get; init; }                  // columna "NETO" del Excel
    public decimal Saldo { get; init; }
    public string? Comentarios { get; init; }
}

public record GastosDetalleDto
{
    public List<GastoFilaDto> Filas { get; init; } = new();
    public decimal TotalImporte { get; init; }
    public decimal TotalNeto { get; init; }
    public decimal TotalInsumosNeto { get; init; }
    public decimal TotalOperativosNeto { get; init; }
}
