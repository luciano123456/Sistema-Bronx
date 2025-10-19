using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMGenericModelConfCombo
    {
        public int Id { get; set; }
        public int IdCombo { get; set; }

        public string? Nombre { get; set; }
        public string? NombreCombo { get; set; }
    }
}
