using System;
using System.Collections.Generic;

namespace SistemaBronx.Application.Models.ViewModels
{
    public record DashboardResponseVM
    {
        public KpisVM Kpis { get; init; } = new();
        public List<MensualVM> Mensual { get; init; } = new();
        public List<CrecimientoVM> Crecimiento { get; init; } = new();
        public List<InteranualVM> Interanual { get; init; } = new();
        public List<MediosPagoVM> MediosPago { get; init; } = new();
        public List<ProdVM> TopMasVendidos { get; init; } = new();
        public List<ProdVM> TopMenosVendidos { get; init; } = new();
        public List<ProdVM> TopMasRentables { get; init; } = new();
        public List<ProdVM> TopMenosRentables { get; init; } = new();
        public List<GrupoVM> PorCategoria { get; init; } = new();
        public List<GrupoVM> PorProveedor { get; init; } = new();
    }

    // ================= KPIs =================
    public record KpisVM
    {
        public decimal IngresosSubTotal { get; init; }
        public decimal IngresosImporteTotal { get; init; }
        public decimal EgresosImporteTotal { get; init; }

        // ✅ Nombres de negocio
        public int CantidadPedidos { get; init; }
        public decimal CantidadUnidades { get; init; }
        public decimal VentaPromedioPorPedido { get; init; }
        public decimal VentaPromedioPorCliente { get; init; }

        public decimal CostoMercaderia { get; init; }
        public decimal MargenBruto { get; init; }
        public decimal MargenOperativo { get; init; }
        public decimal MargenNeto { get; init; }
        public decimal? MargenBrutoPct { get; init; }
        public decimal? MargenOperativoPct { get; init; }
        public decimal? MargenNetoPct { get; init; }
    }

    // ============= Serie mensual =============
    public record MensualVM
    {
        public int Anio { get; init; }
        public int Mes { get; init; }
        public decimal Ingresos { get; init; }
        public decimal CostoMercaderia { get; init; }
        public decimal Gastos { get; init; }
        public decimal MargenBruto { get; init; }
        public decimal MargenOperativo { get; init; }
    }

    // ============= Crecimiento =============
    public record CrecimientoVM
    {
        public int Anio { get; init; }
        public int Mes { get; init; }

        // ✅ Nombres de negocio
        public int CantidadPedidos { get; init; }
        public decimal CantidadUnidades { get; init; }

        public decimal? CrecPedidos { get; init; }
        public decimal? CrecUnidades { get; init; }
    }

    // ============= Interanual =============
    public record InteranualVM
    {
        public DateTime Periodo { get; init; }
        public decimal VentaActualMes { get; init; }
        public decimal? VariacionInteranual { get; init; }

        // admite Ñ o alternativa sin Ñ (lo resolvemos en el controller)
        public decimal? VentaMismoMesAnioAnterior { get; init; }
    }

    // ============= Medios de pago =============
    public record MediosPagoVM
    {
        public int? IdFormaPago { get; init; }
        public string FormaPago { get; init; } = "";

        // ✅ Nombres de negocio
        public int CantidadPedidos { get; init; }

        public decimal MontoSubTotal { get; init; }
        public decimal CostoFinancieroEstimado { get; init; }
    }

    // ============= Productos =============
    public record ProdVM
    {
        public int IdProducto { get; init; }
        public string Producto { get; init; } = "";

        // ✅ Para tooltip: cuántas veces apareció en pedidos
        public int VecesVendido { get; init; }

        public decimal CantidadVendida { get; init; }
        public decimal Ingreso { get; init; }
        public decimal Costo { get; init; }
        public decimal MargenBruto { get; init; }
    }

    // ============= Agrupados (categoría / proveedor) =============
    public record GrupoVM
    {
        public int GrupoId { get; init; }
        public string GrupoNombre { get; init; } = "";
        public decimal Ingreso { get; init; }
        public decimal Costo { get; init; }
        public decimal MargenBruto { get; init; }
        public decimal? MargenBrutoPct { get; init; }
    }
}
