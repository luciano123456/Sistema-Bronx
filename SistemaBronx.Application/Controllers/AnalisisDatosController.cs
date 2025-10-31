using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using TuProyecto.Services.Interfaces;

namespace SistemaBronx.Application.Controllers
{
    [Authorize]
    public class AnalisisDatosController : Controller
    {
        private readonly IAnalisisDatosService _analisisService;

        public AnalisisDatosController(IAnalisisDatosService analisisService)
        {
            _analisisService = analisisService;
        }

        public IActionResult Index() => View();

        /// <summary>
        /// Endpoint único que pega al SP del dashboard.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Datos(DateTime? desde, DateTime? hasta, int? idCliente, int topN = 10)
        {
            try
            {
                DateTime? d = desde?.Date;
                DateTime? h = hasta?.Date;

                var ds = await _analisisService.ObtenerDashboardAsync(d, h, idCliente, topN);

                var vm = new DashboardResponseVM
                {
                    // 0) KPIs
                    Kpis = GetFirstRow(ds, 0) is DataRow r0 ? MapKpis(r0) : new KpisVM(),

                    // 1) Serie mensual
                    Mensual = MapBySchema(ds,
                        defaultIndex: 1,
                        requiredCols: new[] { "Anio", "Mes", "Ingresos", "CostoMercaderia" },
                        map: r => new MensualVM
                        {
                            Anio = Get<int>(r, "Anio"),
                            Mes = Get<int>(r, "Mes"),
                            Ingresos = Get<decimal>(r, "Ingresos"),
                            CostoMercaderia = Get<decimal>(r, "CostoMercaderia"),
                            Gastos = Get<decimal>(r, "Gastos"),
                            MargenBruto = Get<decimal>(r, "MargenBruto"),
                            MargenOperativo = Get<decimal>(r, "MargenOperativo"),
                        }),

                    // 2) Crecimientos
                    Crecimiento = MapBySchema(ds,
                        defaultIndex: 2,
                        requiredCols: new[] { "Anio", "Mes", "CantidadPedidos", "CantidadUnidades" },
                        map: r => new CrecimientoVM
                        {
                            Anio = Get<int>(r, "Anio"),
                            Mes = Get<int>(r, "Mes"),
                            CantidadPedidos = Get<int>(r, "CantidadPedidos"),
                            CantidadUnidades = Get<decimal>(r, "CantidadUnidades"),
                            CrecPedidos = Get<decimal?>(r, "CrecPedidos"),
                            CrecUnidades = Get<decimal?>(r, "CrecUnidades"),
                        }),

                    // 3) Interanual
                    Interanual = MapBySchema(ds,
                        defaultIndex: 3,
                        requiredCols: new[] { "Periodo", "VentaActualMes" },
                        map: r => new InteranualVM
                        {
                            Periodo = Get<DateTime>(r, "Periodo"),
                            VentaActualMes = Get<decimal>(r, "VentaActualMes"),
                            VentaMismoMesAnioAnterior = Get<decimal?>(r, "VentaMismoMesAnioAnterior"),
                            VariacionInteranual = Get<decimal?>(r, "VariacionInteranual"),
                        }),

                    // 4) Medios de pago
                    MediosPago = MapBySchema(ds,
                        defaultIndex: 4,
                        requiredCols: new[] { "CantidadPedidos", "MontoSubTotal" },
                        map: r => new MediosPagoVM
                        {
                            IdFormaPago = Get<int?>(r, "IdFormaPago"),
                            FormaPago = Get<string>(r, "FormaPago"),
                            CantidadPedidos = Get<int>(r, "CantidadPedidos"),
                            MontoSubTotal = Get<decimal>(r, "MontoSubTotal"),
                            CostoFinancieroEstimado = Get<decimal>(r, "CostoFinancieroEstimado"),
                        }),

                    // 5..8) Tops por producto
                    TopMasVendidos = MapBySchema(ds, 5, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMenosVendidos = MapBySchema(ds, 6, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMasRentables = MapBySchema(ds, 7, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMenosRentables = MapBySchema(ds, 8, new[] { "IdProducto", "Producto" }, MapProd),

                    // 9) Por categoría
                    PorCategoria = MapBySchema(ds,
                        defaultIndex: 9,
                        requiredCols: new[] { "GrupoCatId", "GrupoCatNombre", "Ingreso", "Costo" },
                        map: r => new GrupoVM
                        {
                            GrupoId = Get<int>(r, "GrupoCatId"),
                            GrupoNombre = Get<string>(r, "GrupoCatNombre"),
                            Ingreso = Get<decimal>(r, "Ingreso"),
                            Costo = Get<decimal>(r, "Costo"),
                            MargenBruto = Get<decimal>(r, "MargenBruto"),
                            MargenBrutoPct = Get<decimal?>(r, "MargenBrutoPct"),
                        }),

                    // 10) Por proveedor
                    PorProveedor = MapBySchema(ds,
                        defaultIndex: 10,
                        requiredCols: new[] { "GrupoProvId", "GrupoProvNombre", "Ingreso", "Costo" },
                        map: r => new GrupoVM
                        {
                            GrupoId = Get<int>(r, "GrupoProvId"),
                            GrupoNombre = Get<string>(r, "GrupoProvNombre"),
                            Ingreso = Get<decimal>(r, "Ingreso"),
                            Costo = Get<decimal>(r, "Costo"),
                            MargenBruto = Get<decimal>(r, "MargenBruto"),
                            MargenBrutoPct = Get<decimal?>(r, "MargenBrutoPct"),
                        }),

                    // 11) Gastos por Tipo -> Categoría
                    GastosPorTipoCategoria = MapBySchema(ds,
                        defaultIndex: 11,
                        requiredCols: new[] { "TipoGasto", "Categoria", "TotalGasto" },
                        map: r => new GastoTipoCategoriaVM
                        {
                            TipoGasto = Get<string>(r, "TipoGasto") ?? "",
                            Categoria = Get<string>(r, "Categoria") ?? "",
                            TotalGasto = Get<decimal>(r, "TotalGasto"),
                        }),

                    // 12) Gastos mensual por tipo
                    GastosMensualPorTipo = MapBySchema(ds,
                        defaultIndex: 12,
                        requiredCols: new[] { "Anio", "Mes", "TipoGeneral", "Total" },
                        map: r => new GastoMensualTipoVM
                        {
                            Anio = Get<int>(r, "Anio"),
                            Mes = Get<int>(r, "Mes"),
                            TipoGeneral = Get<string>(r, "TipoGeneral") ?? "",
                            Total = Get<decimal>(r, "Total"),
                        }),

                    // 13) Gastos totales por tipo (todo el rango)
                    GastosTotalesPorTipo = MapBySchema(ds,
                        defaultIndex: 13,
                        requiredCols: new[] { "TipoGeneral", "Total" },
                        map: r => new GastoTipoTotalVM
                        {
                            TipoGeneral = Get<string>(r, "TipoGeneral") ?? "",
                            Total = Get<decimal>(r, "Total"),
                        }),

                    // 14) Comparativa real mensual (EnMano vs gastos)
                    ComparativaRealMensual = MapBySchema(ds,
                        defaultIndex: 14,
                        requiredCols: new[] { "Anio", "Mes", "IngresoEnMano", "GastoFabricacion", "GastoOperativo", "ResultadoMes" },
                        map: r => new ComparativaRealMensualVM
                        {
                            Anio = Get<int>(r, "Anio"),
                            Mes = Get<int>(r, "Mes"),
                            IngresoEnMano = Get<decimal>(r, "IngresoEnMano"),
                            GastoFabricacion = Get<decimal>(r, "GastoFabricacion"),
                            GastoOperativo = Get<decimal>(r, "GastoOperativo"),
                            ResultadoMes = Get<decimal>(r, "ResultadoMes"),
                        }),
                };

                return Ok(vm);
            }
            catch (Exception ex)
            {
                return BadRequest("Ha ocurrido un error al obtener el analisis de datos. " + ex.Message);
            }
        }

        // ================== Helpers ==================

        private static DataRow? GetFirstRow(DataSet ds, int index)
            => (ds.Tables.Count > index && ds.Tables[index]?.Rows.Count > 0)
                ? ds.Tables[index].Rows[0]
                : null;

        // Busca por índice y, si no matchea columnas, por esquema.
        private static List<T> MapBySchema<T>(
            DataSet ds,
            int defaultIndex,
            string[] requiredCols,
            Func<DataRow, T> map)
        {
            var result = new List<T>();
            if (ds == null || ds.Tables.Count == 0) return result;

            bool HasCols(DataTable t) => requiredCols.All(c => t.Columns.Contains(c));

            if (defaultIndex >= 0 && defaultIndex < ds.Tables.Count && HasCols(ds.Tables[defaultIndex]))
                return ds.Tables[defaultIndex].AsEnumerable().Select(map).ToList();

            for (int i = 0; i < ds.Tables.Count; i++)
                if (HasCols(ds.Tables[i]))
                    return ds.Tables[i].AsEnumerable().Select(map).ToList();

            return result;
        }

        private static T Get<T>(DataRow r, string col)
        {
            if (r == null || r.Table == null || !r.Table.Columns.Contains(col)) return default!;
            var v = r[col];
            if (v == DBNull.Value || v is null) return default!;

            var targetType = typeof(T);
            var underlying = Nullable.GetUnderlyingType(targetType);
            if (underlying != null)
            {
                var converted = Convert.ChangeType(v, underlying);
                return (T)converted!;
            }
            return (T)Convert.ChangeType(v, targetType);
        }

        private static KpisVM MapKpis(DataRow r) => new()
        {
            IngresosSubTotal = Get<decimal>(r, "IngresosSubTotal"),
            IngresosImporteTotal = Get<decimal>(r, "IngresosImporteTotal"),
            EgresosImporteTotal = Get<decimal>(r, "EgresosImporteTotal"),
            CantidadPedidos = Get<int>(r, "CantidadPedidos"),
            CantidadUnidades = Get<decimal>(r, "CantidadUnidades"),
            VentaPromedioPorPedido = Get<decimal>(r, "VentaPromedioPorPedido"),
            VentaPromedioPorCliente = Get<decimal>(r, "VentaPromedioPorCliente"),
            CostoMercaderia = Get<decimal>(r, "CostoMercaderia"),
            MargenBruto = Get<decimal>(r, "MargenBruto"),
            MargenOperativo = Get<decimal>(r, "MargenOperativo"),
            MargenNeto = Get<decimal>(r, "MargenNeto"),
            MargenBrutoPct = Get<decimal?>(r, "MargenBrutoPct"),
            MargenOperativoPct = Get<decimal?>(r, "MargenOperativoPct"),
            MargenNetoPct = Get<decimal?>(r, "MargenNetoPct"),

            // columnas nuevas del SP
            IVATotal = Get<decimal>(r, "IVA_Total"),
            NetoTotal = Get<decimal>(r, "Neto_Total"),
            CostoFinancieroTotal = Get<decimal>(r, "CostoFinanciero_Total"),
            IngresoEnManoTotal = Get<decimal>(r, "IngresoEnMano_Total"),
        };

        private static ProdVM MapProd(DataRow r) => new()
        {
            IdProducto = Get<int>(r, "IdProducto"),
            Producto = Get<string>(r, "Producto"),
            VecesVendido = Get<int>(r, "VecesVendido"),
            CantidadVendida = Get<decimal>(r, "CantidadVendida"),
            Ingreso = Get<decimal>(r, "Ingreso"),
            Costo = Get<decimal>(r, "Costo"),
            MargenBruto = Get<decimal>(r, "MargenBruto"),
        };
    }
}
