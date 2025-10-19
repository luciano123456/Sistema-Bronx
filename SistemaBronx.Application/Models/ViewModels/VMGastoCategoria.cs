using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMGastoCategoria
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;
        public string Tipo { get; set; } = null!;

        public int? IdTipo { get; set; }

        public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

        public virtual GastosTipo? IdTipoNavigation { get; set; }

    }
}
