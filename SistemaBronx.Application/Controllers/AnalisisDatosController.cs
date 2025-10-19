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
        /// Endpoint UNICO que trae todo el dashboard (un SP).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Datos(DateTime? desde, DateTime? hasta, int? idCliente, int topN = 10)
        {
            try
            {
                // Normalizo
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

                    // 3) Interanual (sin "ñ")
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

                    // 5..8) Tops de productos
                    TopMasVendidos = MapBySchema(ds, 5, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMenosVendidos = MapBySchema(ds, 6, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMasRentables = MapBySchema(ds, 7, new[] { "IdProducto", "Producto" }, MapProd),
                    TopMenosRentables = MapBySchema(ds, 8, new[] { "IdProducto", "Producto" }, MapProd),

                    // 9) Por categoria (GrupoCat*)
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

                    // 10) Por proveedor (GrupoProv*)
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
                        })
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

        // MapBySchema tolerante al indice: si el RS en defaultIndex no tiene las columnas, busca por esquema
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
