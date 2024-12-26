using Azure;
using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaBronx.DAL.Repository
{
    public class PedidosRepository : IPedidosRepository<Pedido>
    {

        private readonly SistemaBronxContext _dbcontext;

        public PedidosRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarPedido(int idPedido)
        {
            Pedido pedido = _dbcontext.Pedidos.First(c => c.Id == idPedido);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> InsertarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            foreach (PagosPedidosCliente p in pagos)
            {
                _dbcontext.PagosPedidosClientes.Add(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> InsertarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                _dbcontext.PagosPedidosProveedores.Add(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> NuevoPedido(Pedido model)
        {
            _dbcontext.Pedidos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            List<PagosPedidosProveedor> pagos = _dbcontext.PagosPedidosProveedores.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            List<PagosPedidosCliente> pagos = _dbcontext.PagosPedidosClientes.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<Pedido> ObtenerPedido(int idPedido)
        {
            Pedido pedido = _dbcontext.Pedidos.FirstOrDefault(c => c.Id == idPedido);
            return pedido;
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            List<PedidosProducto> productos = _dbcontext.PedidosProductos.Where(c => c.IdPedido == idPedido).ToList();
            return productos;
        }
    }
}
