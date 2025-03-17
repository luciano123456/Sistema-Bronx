using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMPedido
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        public int? IdCliente { get; set; }

        public decimal? SubTotal { get; set; }

        public int? PorcDescuento { get; set; }

        public decimal? ImporteAbonado { get; set; }
        public decimal? ImporteTotal { get; set; }

        public decimal? Saldo { get; set; }

        public int? IdFormaPago { get; set; }

        public int? IdTipo { get; set; }


        public int? Finalizado { get; set; }

        public string Tipo { get; set; }
        public string Estado { get; set; }
        public string FormaPago { get; set; }
        public string Cliente { get; set; }
        public string Comentarios { get; set; }


        public virtual Cliente? IdClienteNavigation { get; set; }

        public virtual FormasdePago IdNavigation { get; set; } = null!;

        public virtual PedidosTipo? IdTipoNavigation { get; set; }

        public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();

        public virtual ICollection<PedidosDetalle> PedidosDetalles { get; set; } = new List<PedidosDetalle>();


    }
}
