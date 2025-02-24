﻿using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMProductoInsumo
    {
        public int Id { get; set; }

        public int IdProducto { get; set; }

        public int IdInsumo { get; set; }


        public string? Especificacion { get; set; }
        public string? Nombre { get; set; }

        public decimal Cantidad { get; set; }
        public string Nombre { get; set; }
        public decimal CostoUnitario { get; set; }
        public virtual Insumo IdInsumoNavigation { get; set; } = null!;

        public virtual Producto IdProductoNavigation { get; set; } = null!;

    }
}
