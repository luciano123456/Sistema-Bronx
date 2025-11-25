using System;
using System.Collections.Generic;

namespace SistemaBronx.Application.Models.ViewModels
{
    public class VMStockViewModels
    {
        // ===============================================
        // MOVIMIENTO (Cabecera)
        // ===============================================
        public class VMStockMovimiento
        {
            public int Id { get; set; }
            public int IdTipoMovimiento { get; set; }
            public string? Observacion { get; set; }

            public bool EsEntrada { get; set; }

            public bool EsAnulado { get; set; }   // 👈 NUEVO

            public string Usuario { get; set; }
            public int? IdUsuario { get; set; }

            public DateTime FechaCreado { get; set; }

            public List<VMStockMovimientoDetalle> Detalles { get; set; } = new();
        }



        // ===============================================
        // DETALLE
        // ===============================================
        public class VMStockMovimientoDetalle
        {
            public int Id { get; set; }

            /// <summary>
            /// "P" producto, "I" insumo
            /// </summary>
            public string TipoItem { get; set; }

            public int? IdProducto { get; set; }
            public int? IdInsumo { get; set; }
            public int? IdMovimiento { get; set; }

            public decimal Cantidad { get; set; }

            public string NombreItem { get; set; } // Producto/Insumo

            // ===== CAMPOS EXTRA PARA HISTORIAL POR ÍTEM =====
            public DateTime Fecha { get; set; }
            public string TipoMovimiento { get; set; }
            public string Comentario { get; set; }
            public bool EsEntrada { get; set; }
            public bool EsAnulado { get; set; }
        }


        // ===============================================
        // SALDO
        // ===============================================
        public class VMStockSaldo
        {
            public string TipoItem { get; set; }
            public int? IdProducto { get; set; }
            public int? IdInsumo { get; set; }

            public string Nombre { get; set; }

            public decimal CantidadActual { get; set; }
            public DateTime FechaUltMovimiento { get; set; }
        }
    }
}
