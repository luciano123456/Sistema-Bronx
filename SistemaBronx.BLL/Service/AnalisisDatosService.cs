using SistemaBronx.DAL.Repository;
using SistemaBronx.Models.Analisis;

namespace SistemaBronx.BLL.Service
{
    /// <summary>
    /// Análisis de datos 100% en código (sin stored procedures).
    /// El repositorio trae proyecciones mínimas; acá se aplican las reglas del Excel
    /// (<see cref="ReglasAnalisis"/>) y se arman KPIs, series y rankings.
    /// </summary>
    public class AnalisisDatosService : IAnalisisDatosService
    {
        private const int MaxDiasSerieDiaria = 92;
        private static readonly DateTime FechaMinima = new(2000, 1, 1);

        private static readonly string[] NombresDia =
            { "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo" };

        private readonly IAnalisisDatosRepository _repo;

        public AnalisisDatosService(IAnalisisDatosRepository repo)
        {
            _repo = repo;
        }

        // ------------------------------------------------------------------ tipos internos
        private sealed record VentaCalc(VentaRaw V, ReglasAnalisis.CalculoVenta C);
        private sealed record GastoCalc(GastoRaw G, decimal Neto, string Tipo);

        // ================================================================== META
        public async Task<AnalisisMetaDto> ObtenerMetaAsync(CancellationToken ct = default)
        {
            var (primera, ultima) = await _repo.ObtenerRangoFechasAsync(ct);
            var formas = await _repo.ObtenerFormasPagoAsync(ct);

            var anios = new List<int>();
            if (primera.HasValue)
            {
                var hasta = Math.Max(ultima?.Year ?? DateTime.Today.Year, DateTime.Today.Year);
                for (var a = primera.Value.Year; a <= hasta; a++) anios.Add(a);
            }

            return new AnalisisMetaDto
            {
                PrimeraFecha = primera?.Date,
                UltimaFecha = ultima?.Date,
                Anios = anios,
                FormasPago = formas
            };
        }

        // ================================================================== DASHBOARD
        public async Task<AnalisisDashboardDto> ObtenerDashboardAsync(AnalisisFiltro filtro, CancellationToken ct = default)
        {
            var (desde, hasta) = NormalizarRango(filtro);
            var (desdeAnt, hastaAnt) = PeriodoAnterior(desde, hasta);

            // Una sola lectura cubre: período actual + período anterior + mismo período del año anterior.
            var fetchDesde = Min(desdeAnt, desde.AddYears(-1));
            var fetchHastaExcl = hasta.AddDays(1);
            var gastosAplican = !filtro.IdCliente.HasValue; // los gastos no pertenecen a un cliente

            // Secuencial a propósito: un DbContext no admite consultas en paralelo.
            var ventasRaw = await _repo.ObtenerVentasAsync(fetchDesde, fetchHastaExcl, filtro.IdCliente, filtro.IdFormaPago, ct);
            var gastosRaw = gastosAplican
                ? await _repo.ObtenerGastosAsync(fetchDesde, fetchHastaExcl, filtro.IdFormaPago, ct)
                : new List<GastoRaw>();
            var productosRes = await _repo.ObtenerProductosAgregadosAsync(desde, fetchHastaExcl, filtro.IdCliente, filtro.IdFormaPago, ct);

            var ventasTodas = CalcularVentas(ventasRaw);
            var gastosTodos = CalcularGastos(gastosRaw);

            var ventas = Rango(ventasTodas, v => v.V.Fecha, desde, hasta);
            var gastos = Rango(gastosTodos, g => g.G.Fecha, desde, hasta);
            var ventasAnt = Rango(ventasTodas, v => v.V.Fecha, desdeAnt, hastaAnt);
            var gastosAnt = Rango(gastosTodos, g => g.G.Fecha, desdeAnt, hastaAnt);

            var dias = (hasta - desde).Days + 1;
            var diaria = dias <= MaxDiasSerieDiaria;

            var mensual = ConstruirMensual(ventasTodas, gastosTodos, desde, hasta);

            return new AnalisisDashboardDto
            {
                Desde = desde,
                Hasta = hasta,
                DesdeAnterior = desdeAnt,
                HastaAnterior = hastaAnt,
                Granularidad = diaria ? "dia" : "mes",
                GastosAplican = gastosAplican,

                Kpis = CalcularKpis(ventas, gastos),
                KpisAnterior = CalcularKpis(ventasAnt, gastosAnt),

                Serie = diaria ? ConstruirDiaria(ventas, gastos, desde, hasta) : mensual,
                Mensual = mensual,
                PorAnio = ConstruirPorAnio(ventas, gastos),
                PorDiaSemana = ConstruirPorDiaSemana(ventas),
                MediosPago = ConstruirMediosPago(ventas),
                TopClientes = ConstruirTopClientes(ventas, 15),
                GastosPorCategoria = ConstruirGastosPorCategoria(gastos),

                Productos = ConstruirProductos(productosRes, out var categorias),
                PorCategoria = categorias
            };
        }

        // ------------------------------------------------------------------ KPIs
        private static AnalisisKpisDto CalcularKpis(IReadOnlyCollection<VentaCalc> v, IReadOnlyCollection<GastoCalc> g)
        {
            var ventas = v.Sum(x => x.V.ImporteAbonado);
            var iva = v.Sum(x => x.C.Iva);
            var cf = v.Sum(x => x.C.CostoFinanciero);
            var neta = v.Sum(x => x.C.GananciaNeta);

            var gastosTotal = g.Sum(x => x.G.ImporteTotal);
            var gastosNeto = g.Sum(x => x.Neto);
            var insumos = g.Where(x => x.Tipo == ReglasAnalisis.TipoInsumos).Sum(x => x.Neto);
            var operativos = g.Where(x => x.Tipo == ReglasAnalisis.TipoOperativos).Sum(x => x.Neto);

            var pedidos = v.Count;
            var clientes = v.Where(x => x.V.IdCliente.HasValue).Select(x => x.V.IdCliente!.Value).Distinct().Count();

            var facturado = v.Sum(x => x.V.SubTotal);
            var costo = v.Sum(x => x.V.Costo);
            var margenBruto = facturado - costo;
            var resultado = neta - gastosNeto;

            return new AnalisisKpisDto
            {
                Ventas = R(ventas),
                Iva = R(iva),
                CostoFinanciero = R(cf),
                GananciaNeta = R(neta),

                GastosTotal = R(gastosTotal),
                GastosNeto = R(gastosNeto),
                GastosInsumosNeto = R(insumos),
                GastosOperativosNeto = R(operativos),

                Resultado = R(resultado),
                ResultadoPct = ReglasAnalisis.Porcentaje(resultado, neta),

                Pedidos = pedidos,
                Unidades = R(v.Sum(x => x.V.Unidades)),
                Clientes = clientes,
                TicketPromedio = pedidos == 0 ? 0 : R(ventas / pedidos),
                VentaPorCliente = clientes == 0 ? 0 : R(ventas / clientes),

                Facturado = R(facturado),
                CostoMercaderia = R(costo),
                MargenBruto = R(margenBruto),
                MargenBrutoPct = ReglasAnalisis.Porcentaje(margenBruto, facturado),
                SaldoPendiente = R(v.Sum(x => x.V.Saldo))
            };
        }

        // ------------------------------------------------------------------ Series
        private static SeriePuntoDto Punto(string clave, DateTime desde,
            IReadOnlyCollection<VentaCalc> v, IReadOnlyCollection<GastoCalc> g)
        {
            var ventas = v.Sum(x => x.V.ImporteAbonado);
            var neta = v.Sum(x => x.C.GananciaNeta);
            var insumos = g.Where(x => x.Tipo == ReglasAnalisis.TipoInsumos).Sum(x => x.Neto);
            var operativos = g.Where(x => x.Tipo == ReglasAnalisis.TipoOperativos).Sum(x => x.Neto);
            var gastosNeto = g.Sum(x => x.Neto);

            return new SeriePuntoDto
            {
                Clave = clave,
                Desde = desde,
                Pedidos = v.Count,
                Unidades = R(v.Sum(x => x.V.Unidades)),
                Ventas = R(ventas),
                Iva = R(v.Sum(x => x.C.Iva)),
                CostoFinanciero = R(v.Sum(x => x.C.CostoFinanciero)),
                GananciaNeta = R(neta),
                GastosInsumosNeto = R(insumos),
                GastosOperativosNeto = R(operativos),
                GastosNeto = R(gastosNeto),
                Resultado = R(neta - gastosNeto),
                TicketPromedio = v.Count == 0 ? 0 : R(ventas / v.Count)
            };
        }

        private static List<SeriePuntoDto> ConstruirDiaria(
            IReadOnlyCollection<VentaCalc> ventas, IReadOnlyCollection<GastoCalc> gastos, DateTime desde, DateTime hasta)
        {
            var vPorDia = ventas.ToLookup(x => x.V.Fecha.Date);
            var gPorDia = gastos.ToLookup(x => x.G.Fecha.Date);

            var lista = new List<SeriePuntoDto>();
            for (var d = desde; d <= hasta; d = d.AddDays(1))
                lista.Add(Punto(d.ToString("yyyy-MM-dd"), d, vPorDia[d].ToList(), gPorDia[d].ToList()));
            return lista;
        }

        private static List<SeriePuntoDto> ConstruirMensual(
            IReadOnlyCollection<VentaCalc> ventasTodas, IReadOnlyCollection<GastoCalc> gastosTodos, DateTime desde, DateTime hasta)
        {
            var lista = new List<SeriePuntoDto>();
            var cursor = new DateTime(desde.Year, desde.Month, 1);

            while (cursor <= hasta)
            {
                // Solo cuenta lo que cae dentro del rango pedido (los meses de los extremos pueden ser parciales).
                var ini = Max(cursor, desde);
                var fin = Min(cursor.AddMonths(1).AddDays(-1), hasta);

                var vAct = Rango(ventasTodas, v => v.V.Fecha, ini, fin);
                var gAct = Rango(gastosTodos, g => g.G.Fecha, ini, fin);
                var p = Punto($"{cursor:yyyy-MM}", cursor, vAct, gAct);

                // Mismo tramo del año anterior
                var vPrev = Rango(ventasTodas, v => v.V.Fecha, ini.AddYears(-1), fin.AddYears(-1));
                var gPrev = Rango(gastosTodos, g => g.G.Fecha, ini.AddYears(-1), fin.AddYears(-1));
                var ventasPrev = vPrev.Sum(x => x.V.ImporteAbonado);
                var netaPrev = vPrev.Sum(x => x.C.GananciaNeta);
                var resultadoPrev = netaPrev - gPrev.Sum(x => x.Neto);

                lista.Add(p with
                {
                    VentasAnioAnterior = R(ventasPrev),
                    GananciaNetaAnioAnterior = R(netaPrev),
                    ResultadoAnioAnterior = R(resultadoPrev),
                    VariacionVentasPct = ventasPrev == 0 ? null : ReglasAnalisis.Porcentaje(p.Ventas - ventasPrev, ventasPrev)
                });

                cursor = cursor.AddMonths(1);
            }

            return lista;
        }

        private static List<ResumenAnioDto> ConstruirPorAnio(IReadOnlyCollection<VentaCalc> ventas, IReadOnlyCollection<GastoCalc> gastos)
        {
            var anios = ventas.Select(x => x.V.Fecha.Year).Concat(gastos.Select(x => x.G.Fecha.Year)).Distinct().OrderBy(a => a);

            return anios.Select(a =>
            {
                var v = ventas.Where(x => x.V.Fecha.Year == a).ToList();
                var neta = v.Sum(x => x.C.GananciaNeta);
                var gNeto = gastos.Where(x => x.G.Fecha.Year == a).Sum(x => x.Neto);
                return new ResumenAnioDto
                {
                    Anio = a,
                    Pedidos = v.Count,
                    Ventas = R(v.Sum(x => x.V.ImporteAbonado)),
                    GananciaNeta = R(neta),
                    GastosNeto = R(gNeto),
                    Resultado = R(neta - gNeto)
                };
            }).ToList();
        }

        private static List<DiaSemanaDto> ConstruirPorDiaSemana(IReadOnlyCollection<VentaCalc> ventas)
        {
            // DayOfWeek: domingo = 0 -> lo llevamos a lunes = 0 ... domingo = 6
            static int Indice(DateTime f) => ((int)f.DayOfWeek + 6) % 7;

            var porDia = ventas.ToLookup(x => Indice(x.V.Fecha));
            return Enumerable.Range(0, 7).Select(i => new DiaSemanaDto
            {
                Dia = i,
                Nombre = NombresDia[i],
                Pedidos = porDia[i].Count(),
                Ventas = R(porDia[i].Sum(x => x.V.ImporteAbonado))
            }).ToList();
        }

        // ------------------------------------------------------------------ Medios de pago
        private static List<MedioPagoDto> ConstruirMediosPago(IReadOnlyCollection<VentaCalc> ventas)
        {
            var total = ventas.Sum(x => x.V.ImporteAbonado);

            return ventas
                .GroupBy(x => ReglasAnalisis.EtiquetaFormaPago(x.V.FormaPago))
                .Select(g => new MedioPagoDto
                {
                    IdFormaPago = g.First().V.IdFormaPago,
                    FormaPago = g.Key,
                    Pedidos = g.Count(),
                    Ventas = R(g.Sum(x => x.V.ImporteAbonado)),
                    Iva = R(g.Sum(x => x.C.Iva)),
                    CostoFinanciero = R(g.Sum(x => x.C.CostoFinanciero)),
                    GananciaNeta = R(g.Sum(x => x.C.GananciaNeta)),
                    ParticipacionPct = ReglasAnalisis.Porcentaje(g.Sum(x => x.V.ImporteAbonado), total)
                })
                .OrderByDescending(m => m.Ventas)
                .ToList();
        }

        // ------------------------------------------------------------------ Clientes / Gastos
        private static List<ClienteRankingDto> ConstruirTopClientes(IReadOnlyCollection<VentaCalc> ventas, int top)
            => ventas
                .GroupBy(x => x.V.IdCliente ?? 0)
                .Select(g => new ClienteRankingDto
                {
                    IdCliente = g.Key == 0 ? null : g.Key,
                    Cliente = g.Select(x => x.V.Cliente).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))?.Trim() ?? "Sin cliente",
                    Pedidos = g.Count(),
                    Ventas = R(g.Sum(x => x.V.ImporteAbonado)),
                    GananciaNeta = R(g.Sum(x => x.C.GananciaNeta)),
                    UltimaCompra = g.Max(x => x.V.Fecha)
                })
                .OrderByDescending(c => c.Ventas)
                .Take(top)
                .ToList();

        private static List<GastoCategoriaDto> ConstruirGastosPorCategoria(IReadOnlyCollection<GastoCalc> gastos)
        {
            var totalNeto = gastos.Sum(x => x.Neto);

            return gastos
                .GroupBy(x => x.G.IdCategoria)
                .Select(g => new GastoCategoriaDto
                {
                    IdCategoria = g.Key,
                    Categoria = g.First().G.Categoria?.Trim() ?? "Sin categoría",
                    Tipo = g.First().Tipo,
                    Cantidad = g.Count(),
                    Total = R(g.Sum(x => x.G.ImporteTotal)),
                    Neto = R(g.Sum(x => x.Neto)),
                    ParticipacionPct = ReglasAnalisis.Porcentaje(g.Sum(x => x.Neto), totalNeto)
                })
                .OrderByDescending(c => c.Neto)
                .ToList();
        }

        // ------------------------------------------------------------------ Productos
        private static List<ProductoRankingDto> ConstruirProductos(
            ProductosAgregadosResultado res, out List<GrupoRentabilidadDto> categorias)
        {
            string NombreCategoria(int? id)
                => id.HasValue && res.NombresCategoria.TryGetValue(id.Value, out var n) ? n.Trim() : "Sin categoría";

            var totalIngreso = res.Filas.Sum(f => f.Ingreso);

            var productos = res.Filas
                .GroupBy(f => f.IdProducto)
                .Select(g =>
                {
                    var ingreso = g.Sum(x => x.Ingreso);
                    var costo = g.Sum(x => x.Costo);
                    var margen = ingreso - costo;
                    var idCat = g.OrderByDescending(x => x.Ingreso).First().IdCategoria;

                    var nombre = res.NombresProducto.TryGetValue(g.Key, out var actual) && !string.IsNullOrWhiteSpace(actual)
                        ? actual.Trim()
                        : g.Select(x => x.NombreEnPedido).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))?.Trim() ?? $"Producto #{g.Key}";

                    return new ProductoRankingDto
                    {
                        IdProducto = g.Key,
                        Producto = nombre,
                        IdCategoria = idCat,
                        Categoria = NombreCategoria(idCat),
                        Pedidos = g.Sum(x => x.Pedidos),
                        Unidades = R(g.Sum(x => x.Unidades)),
                        Ingreso = R(ingreso),
                        Costo = R(costo),
                        Margen = R(margen),
                        MargenPct = ReglasAnalisis.Porcentaje(margen, ingreso),
                        ParticipacionPct = ReglasAnalisis.Porcentaje(ingreso, totalIngreso)
                    };
                })
                .OrderByDescending(p => p.Unidades).ThenByDescending(p => p.Ingreso)
                .ToList();

            categorias = res.Filas
                .GroupBy(f => f.IdCategoria ?? 0)
                .Select(g =>
                {
                    var ingreso = g.Sum(x => x.Ingreso);
                    var costo = g.Sum(x => x.Costo);
                    return new GrupoRentabilidadDto
                    {
                        Id = g.Key,
                        Nombre = NombreCategoria(g.Key == 0 ? null : g.Key),
                        Unidades = R(g.Sum(x => x.Unidades)),
                        Ingreso = R(ingreso),
                        Costo = R(costo),
                        Margen = R(ingreso - costo),
                        MargenPct = ReglasAnalisis.Porcentaje(ingreso - costo, ingreso)
                    };
                })
                .OrderByDescending(c => c.Ingreso)
                .ToList();

            return productos;
        }

        // ================================================================== DETALLE VENTAS
        public async Task<VentasDetalleDto> ObtenerVentasDetalleAsync(AnalisisFiltro filtro, CancellationToken ct = default)
        {
            var (desde, hasta) = NormalizarRango(filtro);
            var raw = await _repo.ObtenerVentasAsync(desde, hasta.AddDays(1), filtro.IdCliente, filtro.IdFormaPago, ct);
            var calc = CalcularVentas(raw);

            return new VentasDetalleDto
            {
                Filas = calc.Select(AFila).ToList(),
                TotalAbonado = R(calc.Sum(x => x.V.ImporteAbonado)),
                TotalIva = R(calc.Sum(x => x.C.Iva)),
                TotalCostoFinanciero = R(calc.Sum(x => x.C.CostoFinanciero)),
                TotalGananciaNeta = R(calc.Sum(x => x.C.GananciaNeta)),
                TotalSaldo = R(calc.Sum(x => x.V.Saldo))
            };
        }

        public async Task<VentaDetallePedidoDto?> ObtenerDetallePedidoAsync(int idPedido, CancellationToken ct = default)
        {
            var raw = await _repo.ObtenerDetallePedidoAsync(idPedido, ct);
            if (raw == null) return null;

            var calc = CalcularVentas(new[] { raw.Cabecera })[0];
            var factor = 1 - raw.Cabecera.PorcDescuento / 100m;

            var lineas = raw.Lineas.Select(l =>
            {
                var neto = l.PrecioLinea * factor;
                var costo = l.CostoUnitario * l.Cantidad;
                var margen = neto - costo;
                var nombre = !string.IsNullOrWhiteSpace(l.ProductoActual) ? l.ProductoActual : l.ProductoEnPedido;

                return new VentaLineaDto
                {
                    IdProducto = l.IdProducto,
                    Producto = nombre?.Trim() ?? $"Producto #{l.IdProducto}",
                    Categoria = l.Categoria?.Trim() ?? "",
                    Color = string.IsNullOrWhiteSpace(l.Color) ? null : l.Color.Trim(),
                    Cantidad = R(l.Cantidad),
                    PrecioLinea = R(l.PrecioLinea),
                    PrecioLineaNeto = R(neto),
                    CostoUnitario = R(l.CostoUnitario),
                    Costo = R(costo),
                    Margen = R(margen),
                    MargenPct = ReglasAnalisis.Porcentaje(margen, neto)
                };
            }).ToList();

            return new VentaDetallePedidoDto
            {
                Cabecera = AFila(calc),
                Comentarios = raw.Cabecera.Comentarios,
                Lineas = lineas
            };
        }

        private static VentaFilaDto AFila(VentaCalc x) => new()
        {
            Id = x.V.Id,
            Fecha = x.V.Fecha,
            IdCliente = x.V.IdCliente,
            Cliente = x.V.Cliente?.Trim() ?? "Sin cliente",
            IdFormaPago = x.V.IdFormaPago,
            FormaPago = ReglasAnalisis.EtiquetaFormaPago(x.V.FormaPago),
            ImporteTotal = R(x.V.ImporteTotal),
            PorcDescuento = R(x.V.PorcDescuento),
            SubTotal = R(x.V.SubTotal),
            ImporteAbonado = R(x.V.ImporteAbonado),
            Saldo = R(x.V.Saldo),
            CostoFinancieroPorc = R(x.C.CostoFinancieroPorc),
            Iva = R(x.C.Iva),
            CostoFinanciero = R(x.C.CostoFinanciero),
            GananciaNeta = R(x.C.GananciaNeta),
            Unidades = R(x.V.Unidades),
            Costo = R(x.V.Costo),
            NroFactura = x.V.NroFactura
        };

        // ================================================================== DETALLE GASTOS
        public async Task<GastosDetalleDto> ObtenerGastosDetalleAsync(AnalisisFiltro filtro, CancellationToken ct = default)
        {
            var (desde, hasta) = NormalizarRango(filtro);
            var raw = await _repo.ObtenerGastosAsync(desde, hasta.AddDays(1), filtro.IdFormaPago, ct);
            var calc = CalcularGastos(raw);

            return new GastosDetalleDto
            {
                Filas = calc.Select(x => new GastoFilaDto
                {
                    Id = x.G.Id,
                    Fecha = x.G.Fecha,
                    IdCategoria = x.G.IdCategoria,
                    Categoria = x.G.Categoria?.Trim() ?? "Sin categoría",
                    Tipo = x.Tipo,
                    IdFormaPago = x.G.IdFormaPago,
                    FormaPago = ReglasAnalisis.EtiquetaFormaPago(x.G.FormaPago),
                    ImporteTotal = R(x.G.ImporteTotal),
                    Neto = R(x.Neto),
                    Saldo = R(x.G.Saldo),
                    Comentarios = x.G.Comentarios
                }).ToList(),
                TotalImporte = R(calc.Sum(x => x.G.ImporteTotal)),
                TotalNeto = R(calc.Sum(x => x.Neto)),
                TotalInsumosNeto = R(calc.Where(x => x.Tipo == ReglasAnalisis.TipoInsumos).Sum(x => x.Neto)),
                TotalOperativosNeto = R(calc.Where(x => x.Tipo == ReglasAnalisis.TipoOperativos).Sum(x => x.Neto))
            };
        }

        // ================================================================== helpers
        private static List<VentaCalc> CalcularVentas(IEnumerable<VentaRaw> raw)
            => raw.Select(v => new VentaCalc(v,
                    ReglasAnalisis.CalcularVenta(v.ImporteAbonado, v.FormaPago, v.CfPorcPedido, v.CfPorcForma)))
                .ToList();

        private static List<GastoCalc> CalcularGastos(IEnumerable<GastoRaw> raw)
            => raw.Select(g => new GastoCalc(g,
                    ReglasAnalisis.NetoGasto(g.ImporteTotal, g.FormaPago),
                    ReglasAnalisis.TipoGastoNormalizado(g.Tipo)))
                .ToList();

        /// <summary>Filtra por fecha inclusive en ambos extremos (hasta = día completo).</summary>
        private static List<T> Rango<T>(IEnumerable<T> items, Func<T, DateTime> fecha, DateTime desde, DateTime hasta)
        {
            var limite = hasta.Date.AddDays(1);
            return items.Where(i => { var f = fecha(i); return f >= desde && f < limite; }).ToList();
        }

        private static (DateTime Desde, DateTime Hasta) NormalizarRango(AnalisisFiltro f)
        {
            var desde = f.Desde.Date;
            var hasta = f.Hasta.Date;
            if (hasta < desde) (desde, hasta) = (hasta, desde);
            if (desde < FechaMinima) desde = FechaMinima;
            if (hasta < desde) hasta = desde;
            return (desde, hasta);
        }

        /// <summary>
        /// Período inmediatamente anterior y comparable: si el rango son meses completos, los mismos meses
        /// hacia atrás (un año completo → año anterior); si no, la misma cantidad de días.
        /// </summary>
        private static (DateTime Desde, DateTime Hasta) PeriodoAnterior(DateTime desde, DateTime hasta)
        {
            var ultimoDiaMes = new DateTime(hasta.Year, hasta.Month, 1).AddMonths(1).AddDays(-1);
            if (desde.Day == 1 && hasta.Date == ultimoDiaMes)
            {
                var meses = (hasta.Year - desde.Year) * 12 + hasta.Month - desde.Month + 1;
                return (desde.AddMonths(-meses), desde.AddDays(-1));
            }

            var dias = (hasta - desde).Days + 1;
            var hastaAnt = desde.AddDays(-1);
            return (hastaAnt.AddDays(-(dias - 1)), hastaAnt);
        }

        private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;
        private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;
        private static decimal R(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    }
}
