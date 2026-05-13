using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IProductoService
    {
        Task<bool> Insertar(Producto model, List<ProductosInsumo> insumos);
        Task<bool> Actualizar(Producto model, List<ProductosInsumo> insumos);
        Task<bool> Eliminar(int id);
        Task<Producto> Obtener(int id);
        Task<List<Producto>> ObtenerTodos();
        Task<IQueryable<ProductosCategoria>> ObtenerCategorias();

        Task<List<ProductosInsumo>> ObtenerInsumos(int idProducto, int? idColorFiltro = null);

        Task<decimal> ObtenerStockSaldoProductoAsync(int idProducto, int? idColorFiltro = null);

        Task<bool> ActualizarInsumos(List<ProductosInsumo> insumos);

        Task<bool> ActualizarSoloProducto(Producto model);

        Task<CatalogoPedidoModalResult> ObtenerCatalogoPedidoModalAsync();
    }
}
