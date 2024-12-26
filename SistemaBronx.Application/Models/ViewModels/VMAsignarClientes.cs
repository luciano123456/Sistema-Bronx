using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMAsignarClientes
    {
        public string productos { get; set; }
        public int idCliente { get; set; }
        public int idProveedor { get; set; }

    }
}
