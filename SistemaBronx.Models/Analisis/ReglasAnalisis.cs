using System.Globalization;
using System.Text;

namespace SistemaBronx.Models.Analisis;

/// <summary>
/// Reglas de negocio del análisis de datos. Replican EXACTAMENTE las fórmulas del Excel
/// "ANALISIS BRONX.xlsx" (hojas de ventas y gastos) para que el sistema y la planilla den lo mismo.
///
/// VENTAS (hoja "ventas")
///   Importe abonado = Pedido.ImporteAbonado
///   IVA             = IF(forma = Transferencia | Tarjeta..., abonado * 0.21, 0)
///   Costo financiero= IF(forma = Tarjeta..., abonado * (% costo financiero del pedido / 100), 0)
///   Ganancia neta   = abonado - IVA - costo financiero
///
/// GASTOS (hoja "gastos")
///   Neto = IF(forma = Transferencia, importe total / 1.21, importe total)
///
/// RESULTADO = Ganancia neta de ventas - Gastos netos.
/// </summary>
public static class ReglasAnalisis
{
    /// <summary>Alícuota que el Excel descuenta de lo abonado (abonado * 0,21; no abonado / 1,21).</summary>
    public const decimal AlicuotaIvaVentas = 0.21m;

    /// <summary>Divisor que el Excel usa para llevar a neto los gastos pagados por transferencia.</summary>
    public const decimal DivisorNetoGastos = 1.21m;

    public const string TipoInsumos = "INSUMOS";
    public const string TipoOperativos = "OPERATIVOS";

    /// <summary>Mayúsculas, sin tildes ni espacios sobrantes: "Débito " -> "DEBITO".</summary>
    public static string Normalizar(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return string.Empty;

        var descompuesto = texto.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(descompuesto.Length);
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
    }

    public static bool EsTransferencia(string? formaPago)
        => Normalizar(formaPago) == "TRANSFERENCIA";

    /// <summary>Tarjeta de crédito (1/3/6 cuotas...) o débito: cobran costo financiero.</summary>
    public static bool EsTarjeta(string? formaPago)
    {
        var f = Normalizar(formaPago);
        return f.StartsWith("TARJETA", StringComparison.Ordinal) || f == "DEBITO" || f == "CREDITO";
    }

    /// <summary>El Excel aplica IVA a transferencia y a tarjetas; el efectivo no lleva IVA.</summary>
    public static bool AplicaIvaVenta(string? formaPago)
        => EsTransferencia(formaPago) || EsTarjeta(formaPago);

    public static string EtiquetaFormaPago(string? formaPago)
        => string.IsNullOrWhiteSpace(formaPago) ? "Sin forma de pago" : formaPago.Trim();

    /// <summary>Resultado de aplicar las fórmulas de la hoja de ventas a un pedido.</summary>
    public readonly record struct CalculoVenta(decimal Iva, decimal CostoFinanciero, decimal CostoFinancieroPorc, decimal GananciaNeta);

    /// <param name="abonado">Pedido.ImporteAbonado.</param>
    /// <param name="formaPago">Nombre de la forma de pago.</param>
    /// <param name="cfPorcPedido">Pedido.CostoFinancieroPorc (el que quedó guardado al vender; es la columna D del Excel).</param>
    /// <param name="cfPorcForma">Respaldo: costo financiero vigente de la forma de pago, si el pedido no lo guardó.</param>
    public static CalculoVenta CalcularVenta(decimal abonado, string? formaPago, decimal? cfPorcPedido, decimal? cfPorcForma)
    {
        var iva = AplicaIvaVenta(formaPago) ? abonado * AlicuotaIvaVentas : 0m;

        var porc = 0m;
        var cf = 0m;
        if (EsTarjeta(formaPago))
        {
            porc = cfPorcPedido ?? cfPorcForma ?? 0m;
            cf = abonado * (porc / 100m);
        }

        return new CalculoVenta(iva, cf, porc, abonado - iva - cf);
    }

    public static decimal NetoGasto(decimal importeTotal, string? formaPago)
        => EsTransferencia(formaPago) ? importeTotal / DivisorNetoGastos : importeTotal;

    /// <summary>"INSUMOS" / "OPERATIVOS" / otro (tal cual, normalizado).</summary>
    public static string TipoGastoNormalizado(string? tipo)
    {
        var t = Normalizar(tipo);
        return t.Length == 0 ? "SIN TIPO" : t;
    }

    public static decimal? Porcentaje(decimal parte, decimal total)
        => total == 0m ? null : Math.Round(parte / total * 100m, 2);
}
