using System;
using System.Collections.Generic;

namespace SistemaBronx.Application.Models.ViewModels
{
    public record DashboardResponseVM
    {

        public List<RealMensualVM> RealMensual { get; init; } = new();
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

        // CF por % (opcional)
        public List<CfRateVM> CostoFinancieroPorcentaje { get; init; } = new();
        public List<CfRateMensualVM> CostoFinancieroPorcentajeMensual { get; init; } = new();

        // NUEVO: egresos por medio (opcional si tu SP lo arma)
        public List<MediosPagoVM> MediosPagoEgresos { get; init; } = new();

    }

    // ================= KPIs =================
    public record KpisVM
    {

        // EXISTENTES
        public decimal IngresosSubTotal { get; set; }              // BRUTO (con IVA)
        public decimal IngresosImporteTotal { get; set; }
        public decimal EgresosImporteTotal { get; set; }
        public int CantidadPedidos { get; set; }
        public decimal CantidadUnidades { get; set; }
        public decimal VentaPromedioPorPedido { get; set; }
        public decimal VentaPromedioPorCliente { get; set; }
        public decimal CostoMercaderia { get; set; }
        public decimal MargenBruto { get; set; }
        public decimal MargenOperativo { get; set; }
        public decimal MargenNeto { get; set; }
        public decimal? MargenBrutoPct { get; set; }
        public decimal? MargenOperativoPct { get; set; }
        public decimal? MargenNetoPct { get; set; }

        // IVA y Netos (ventas)
        public decimal IVA_Total { get; set; }                      // IVA de ventas (sin CF)
        public decimal Neto_Total { get; set; }                     // FACT. NETA: BRUTO - IVA_VENTAS (sin CF)

        // Costo financiero (separado)
        public decimal CostoFinanciero_Total { get; set; }          // CF con IVA
        public decimal CostoFinanciero_Neto_Total { get; set; }     // CF sin IVA
        public decimal CostoFinanciero_IVA_Total { get; set; }      // IVA de CF

        // Gastos (operativos/insumos) separados: NETO + IVA
        public decimal GastosNeto_Total { get; set; }               // Gastos netos (operativo + insumos), sin IVA
        public decimal GastosIVA_Total { get; set; }                // IVA de gastos total

        // DESGLOSE NUEVO
        public decimal GastosOperativos_Neto { get; set; }          // solo operativos (neto)
        public decimal GastosInsumos_Neto { get; set; }             // solo insumos (neto)

        // Cash / Cuentas
        public decimal IngresoNeto_Cash { get; set; }               // ventas cobradas en efectivo, netas (sin IVA, sin CF)
        public decimal EgresoNeto_Cash { get; set; }                // egresos pagados en efectivo, netos (sin IVA)
        public decimal IngresoNeto_Cuentas { get; set; }            // ventas acreditadas en cuentas, netas
        public decimal EgresoPorTransfer_Neto { get; set; }         // egresos vía transferencia, netos

        // Derivados que también podés traer pre-calculados
        public decimal IngresoEnMano_Total { get; set; }            // Neto - CF_Neto
        public decimal MasMenos_FactVsGastosNeto { get; set; }      // Neto - GastosNeto
        public decimal MasMenos_IVA { get; set; }                   // IVA_Ventas + IVA_CF - IVA_Gastos
        public decimal? IncidenciaOperativaPct { get; set; }        // GastosOperativos_Neto / GananciaNetaBase
        public decimal? IncidenciaInsumosPct { get; set; }          // GastosInsumos_Neto / GananciaNetaBase
    }


    // Restante del archivo se mantiene igual (MensualVM, RealMensualVM, etc.)
    public record MensualVM { public int Anio { get; init; } public int Mes { get; init; } public decimal Ingresos { get; init; } public decimal CostoMercaderia { get; init; } public decimal Gastos { get; init; } public decimal MargenBruto { get; init; } public decimal MargenOperativo { get; init; } }
    public record RealMensualVM { public int Anio { get; init; } public int Mes { get; init; } public decimal IngresoEnMano { get; init; } public decimal GastoFabricacion { get; init; } public decimal GastoOperativo { get; init; } public decimal ResultadoMes { get; init; } }
    public record CrecimientoVM { public int Anio { get; init; } public int Mes { get; init; } public int CantidadPedidos { get; init; } public decimal CantidadUnidades { get; init; } public decimal? CrecPedidos { get; init; } public decimal? CrecUnidades { get; init; } }
    public record InteranualVM { public DateTime Periodo { get; init; } public decimal VentaActualMes { get; init; } public decimal? VariacionInteranual { get; init; } public decimal? VentaMismoMesAnioAnterior { get; init; } }
    public record MediosPagoVM { public int? IdFormaPago { get; init; } public string FormaPago { get; init; } = ""; public int CantidadPedidos { get; init; } public decimal MontoSubTotal { get; init; } public decimal CostoFinancieroEstimado { get; init; } }
    public record ProdVM { public int IdProducto { get; init; } public string Producto { get; init; } = ""; public int VecesVendido { get; init; } public decimal CantidadVendida { get; init; } public decimal Ingreso { get; init; } public decimal Costo { get; init; } public decimal MargenBruto { get; init; } }
    public record GrupoVM { public int GrupoId { get; init; } public string GrupoNombre { get; init; } = ""; public decimal Ingreso { get; init; } public decimal Costo { get; init; } public decimal MargenBruto { get; init; } public decimal? MargenBrutoPct { get; init; } }
    public record CfRateVM { public decimal RatePct { get; set; } public int CantidadPedidos { get; set; } public decimal MontoSubTotal { get; set; } public decimal CostoFinanciero { get; set; } public decimal? PorcCF { get; set; } }
    public record CfRateMensualVM { public int Anio { get; set; } public int Mes { get; set; } public decimal RatePct { get; set; } public decimal MontoSubTotal { get; set; } public decimal CostoFinanciero { get; set; } }
}
