using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMGasto
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        public int IdCategoria { get; set; }

        public int IdFormadePago { get; set; }
        public string FormaPago { get; set; }
        public string Categoria { get; set; }

        public decimal? Iva { get; set; }

        public decimal ImporteTotal { get; set; }

        public decimal ImporteAbonado { get; set; }
        public decimal SubtotalNeto { get; set; }

        public decimal Saldo { get; set; }

        public string? Comentarios { get; set; }

        public virtual GastosCategoria IdCategoriaNavigation { get; set; } = null!;

        public virtual FormasdePago IdFormadePagoNavigation { get; set; } = null!;

    }
}
