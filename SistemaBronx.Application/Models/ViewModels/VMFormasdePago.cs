using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VmFormasdePago
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = null!;
        public decimal? CostoFinanciero { get; set; }

    }
}
