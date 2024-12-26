﻿using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMAumentoProductos
    {
        public string productos { get; set; }
        public int idProveedor { get; set; }
        public int idCliente { get; set; }
        public decimal porcentajeCosto { get; set; }
        public decimal porcentajeVenta { get; set; }

    }
}