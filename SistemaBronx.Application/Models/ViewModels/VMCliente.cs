using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMCliente
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;

        public string? Telefono { get; set; }

        public string? Direccion { get; set; }

        public int? IdProvincia { get; set; }
        public string? Provincia { get; set; }

        public string? Localidad { get; set; }

        public string? Dni { get; set; }

        public decimal? Saldo { get; set; }

        public decimal? SaldoAfavor { get; set; }

    }
}
