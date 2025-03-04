﻿using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMPedidoDetalle
    {
        public int Id { get; set; }

        public int? IdPedido { get; set; }

        public int? IdProducto { get; set; }

        public decimal? Cantidad { get; set; }

        public int? IdColor { get; set; }

        public int? IdCategoria { get; set; }

        public decimal? CostoInicial { get; set; }

        public int? PorcGanancia { get; set; }

        public virtual PedidosCategoria? IdCategoriaNavigation { get; set; }

        public virtual Color? IdColorNavigation { get; set; }

        public virtual Pedido? IdPedidoNavigation { get; set; }

        public virtual Producto? IdProductoNavigation { get; set; }

        public virtual ICollection<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; } = new List<PedidosDetalleProceso>();
    }
}
