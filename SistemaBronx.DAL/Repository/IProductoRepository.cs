using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IProductoRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Producto model);
        Task<bool> Insertar(Producto model, List<ProductosInsumo> insumos);
        Task<Producto> Obtener(int id);
        Task<List<Producto>> ObtenerTodos();
        Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto);
        Task<bool> ActualizarInsumos(List<ProductosInsumo> insumos);
        Task<IQueryable<ProductosCategoria>> ObtenerCategorias();
    }
}
