using Microsoft.EntityFrameworkCore;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Runtime.Intrinsics.Arm;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaBronx.DAL.Repository
{
    public class CotizacionRepository : ICotizacionesRepository<Cotizacion>
    {

        private readonly SistemaBronxContext _dbcontext;

        public CotizacionRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }


        public async Task<bool> Insertar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {

                // Insertamos el Cotizacion y guardamos cambios para obtener su ID
                _dbcontext.Cotizaciones.Add(Cotizacion);
                await _dbcontext.SaveChangesAsync();

                var idMapping = new Dictionary<int, int>(); // 🔹 Mapeo de ID temporal a ID real

                // **Registrar CotizacionesDetalle**
                foreach (var detalle in CotizacionesDetalle)
                {
                    int idTemporal = detalle.Id; // Guardamos el ID original

                    detalle.Id = 0; // Permitimos que la base de datos genere el ID
                    detalle.IdCotizacion = Cotizacion.Id; // Asociamos al nuevo Cotizacion
                    _dbcontext.CotizacionesDetalles.Add(detalle);
                    await _dbcontext.SaveChangesAsync(); // 🔹 Guardamos para obtener los IDs reales
                    idMapping[idTemporal] = detalle.Id;
                }





                // **Registrar CotizacionesDetalleProceso**
                foreach (var proceso in CotizacionesDetalleProceso)
                {
                    proceso.IdCotizacion = Cotizacion.Id; // Asociamos al nuevo Cotizacion

                    // 🔹 Buscar el ID real del detalle asociado
                    if (proceso.IdDetalle.HasValue && idMapping.TryGetValue(proceso.IdDetalle.Value, out int idReal))
                    {
                        proceso.IdDetalle = idReal; // Asignamos el nuevo ID real del detalle
                    }
                    else
                    {
                        throw new Exception($"No se encontró un IdDetalle válido para el proceso con IdDetalle={proceso.IdDetalle}");
                    }

                    proceso.Id = 0; // Permitimos que la base de datos genere el ID
                    _dbcontext.CotizacionesDetalleProcesos.Add(proceso);
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"Error en la transacción: {ex.Message}");
                return false;
            }
        }




        public async Task<bool> Actualizar(Cotizacion Cotizacion, IQueryable<CotizacionesDetalle> CotizacionesDetalle, IQueryable<CotizacionesDetalleProceso> CotizacionesDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var CotizacionExistente = await _dbcontext.Cotizaciones
                    .Include(p => p.CotizacionesDetalles)
                    .Include(p => p.CotizacionesDetalleProcesos)
                    .FirstOrDefaultAsync(p => p.Id == Cotizacion.Id);

                if (CotizacionExistente == null) return false; // El Cotizacion no existe

                _dbcontext.Entry(CotizacionExistente).CurrentValues.SetValues(Cotizacion);

                // **Actualizar CotizacionesDetalle**
                var idsProductos = CotizacionesDetalle.Select(pd => pd.Id).ToList();
                var detallesAEliminar = CotizacionExistente.CotizacionesDetalles.Where(pd => !idsProductos.Contains(pd.Id)).ToList();
                _dbcontext.CotizacionesDetalles.RemoveRange(detallesAEliminar);

                var idMapping = new Dictionary<int, int>(); // 🔹 Mapear ID temporal a ID real

                foreach (var detalle in CotizacionesDetalle)
                {
                    var detalleExistente = CotizacionExistente.CotizacionesDetalles.FirstOrDefault(pd => pd.Id > 0 && pd.Id == detalle.Id);
                    if (detalleExistente != null)
                    {
                        detalleExistente.Cantidad = detalle.Cantidad;
                        detalleExistente.CostoUnitario = detalle.CostoUnitario;
                        detalleExistente.PrecioVenta = detalle.PrecioVenta;
                        detalleExistente.PorcIva = detalle.PorcIva;
                        detalleExistente.IdCategoria = detalle.IdCategoria;
                        detalleExistente.IdColor = detalle.IdColor;
                        detalleExistente.PorcGanancia = detalle.PorcGanancia;
                        detalleExistente.Producto = detalle.Producto;
                    }
                    else
                    {
                        int idTemporal = detalle.Id; // Guardamos el ID que viene
                        detalle.Id = 0; // Permitimos que la base de datos genere el ID
                        detalle.IdCotizacion = Cotizacion.Id;
                        _dbcontext.CotizacionesDetalles.Add(detalle);
                        await _dbcontext.SaveChangesAsync(); // 🔹 Guardamos para obtener el ID real
                        idMapping[idTemporal] = detalle.Id; // Mapeamos el ID temporal al real
                    }
                }

                // **Actualizar CotizacionesDetalleProceso**
                var idsProcesos = CotizacionesDetalleProceso.Select(pdp => pdp.Id).ToList();
                var procesosAEliminar = CotizacionExistente.CotizacionesDetalleProcesos.Where(pdp => !idsProcesos.Contains(pdp.Id)).ToList();
                _dbcontext.CotizacionesDetalleProcesos.RemoveRange(procesosAEliminar);

                foreach (var proceso in CotizacionesDetalleProceso)
                {
                    var procesoExistente = CotizacionExistente.CotizacionesDetalleProcesos.FirstOrDefault(pdp => pdp.Id > 0 && pdp.Id == proceso.Id);
                    if (procesoExistente != null)
                    {
                        procesoExistente.Cantidad = proceso.Cantidad;
                        procesoExistente.IdCategoria = proceso.IdCategoria;
                        procesoExistente.Comentarios = proceso.Comentarios;
                        procesoExistente.Descripcion = proceso.Descripcion;
                        procesoExistente.Especificacion = proceso.Especificacion;
                        procesoExistente.IdColor = proceso.IdColor;
                        procesoExistente.FechaActualizacion = DateTime.Now;
                        procesoExistente.SubTotal = proceso.SubTotal;
                        procesoExistente.IdEstado = proceso.IdEstado;
                        procesoExistente.IdTipo = proceso.IdTipo;
                        procesoExistente.PrecioUnitario = proceso.PrecioUnitario;
                    }
                    else
                    {
                        proceso.IdCotizacion = Cotizacion.Id;

                        // 🔹 Buscar el ID real en el diccionario
                        if (proceso.IdDetalle.HasValue && idMapping.TryGetValue(proceso.IdDetalle.Value, out int idReal))
                        {
                            proceso.IdDetalle = idReal; // Asignamos el nuevo ID real
                            proceso.Id = 0;
                        }


                        _dbcontext.CotizacionesDetalleProcesos.Add(proceso);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }


        public async Task<bool> ActualizarDetalleProceso(CotizacionesDetalleProceso CotizacionesDetalleProceso)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();

            try
            {
                var CotizacionDetalleExistente = await _dbcontext.CotizacionesDetalleProcesos
                    .FirstOrDefaultAsync(p => p.Id == CotizacionesDetalleProceso.Id);

                if (CotizacionDetalleExistente == null)
                {
                    return false; // El Cotizacion no existe
                }


                CotizacionDetalleExistente.Cantidad = CotizacionesDetalleProceso.Cantidad;
                CotizacionDetalleExistente.Comentarios = CotizacionesDetalleProceso.Comentarios;
                CotizacionDetalleExistente.Descripcion = CotizacionesDetalleProceso.Descripcion;
                CotizacionDetalleExistente.Especificacion = CotizacionesDetalleProceso.Especificacion;
                CotizacionDetalleExistente.IdColor = CotizacionesDetalleProceso.IdColor;
                CotizacionDetalleExistente.FechaActualizacion = DateTime.Now;
                CotizacionDetalleExistente.IdEstado = CotizacionesDetalleProceso.IdEstado;

                // Actualizar datos del Cotizacion
                _dbcontext.Entry(CotizacionDetalleExistente).CurrentValues.SetValues(CotizacionDetalleExistente);


                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }


        public async Task<CotizacionesDetalle> ObtenerProducto(int IdCotizacion, int IdProducto)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var producto = await _dbcontext.CotizacionesDetalles.Where(x => x.IdCotizacion == IdCotizacion && x.IdProducto == IdProducto).FirstOrDefaultAsync();
                if (producto == null)
                {
                    return null;
                }

                return producto;

            }
            catch (Exception ex)
            {
                return null;
            }

        }
        public async Task<List<Cotizacion>> ObtenerCotizaciones(
    DateTime FechaDesde,
    DateTime FechaHasta,
    int IdCliente,
    string Estado,
    int Finalizado)
        {
            try
            {
                // Normalizo rangos: FechaHasta al final del día
                if (FechaHasta != DateTime.MinValue)
                    FechaHasta = FechaHasta.Date.AddDays(1).AddTicks(-1);

                var query = _dbcontext.Cotizaciones
                    .AsNoTracking()
                    .Include(x => x.IdClienteNavigation)
                    .Include(x => x.IdFormaPagoNavigation)
                    .Include(x => x.CotizacionesDetalleProcesos)
                        .ThenInclude(x => x.IdEstadoNavigation)
                    .AsQueryable();

                if (FechaDesde != DateTime.MinValue)
                    query = query.Where(x => x.Fecha >= FechaDesde);

                if (FechaHasta != DateTime.MinValue)
                    query = query.Where(x => x.Fecha <= FechaHasta);

                if (IdCliente != -1)
                    query = query.Where(x => x.IdCliente == IdCliente);

                if (Finalizado != -1)
                    query = query.Where(x => x.Finalizado == Finalizado);

                if (!string.Equals(Estado, "TODOS", StringComparison.OrdinalIgnoreCase))
                {
                    if (Estado == "ENTREGAR")
                        query = query.Where(x => x.Saldo <= 0);
                    else if (Estado == "EN PROCESO")
                        query = query.Where(x => x.Saldo >= 0);
                }

                // 👇 Orden final: fecha desc + (desempate por Id desc)
                return await query
                    .OrderByDescending(x => x.Fecha)
                    .ThenByDescending(x => x.Id)
                    .ToListAsync();
            }
            catch
            {
                return null;
            }
        }


        public async Task<List<CotizacionesDetalleProceso>> ObtenerDetalleProcesos()
        {
            var resultado = new Dictionary<string, object>();

            try 
                {
                    var producto = await _dbcontext.CotizacionesDetalleProcesos
                        .Include(x => x.IdCategoriaNavigation)
                        .Include(x => x.IdProductoNavigation)
                        .Include(x => x.IdEstadoNavigation)
                        .Include(x => x.IdProveedorNavigation)
                        .Include(x => x.IdInsumoNavigation)
                        .ThenInclude(p => p.IdCategoriaNavigation)
                        .Include(x => x.IdColorNavigation)
                        .ToListAsync();

                    return producto;

            }
            catch (Exception ex)
            {
                return null;
            }

        }

        public async Task<CotizacionesDetalleProceso> ObtenerInsumo(int IdCotizacion, int IdInsumo)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var producto = await _dbcontext.CotizacionesDetalleProcesos.Where(x => x.IdCotizacion == IdCotizacion && x.IdInsumo == IdInsumo).FirstOrDefaultAsync();

                return producto;

            }
            catch (Exception ex)
            {
                return null;
            }

        }


        public async Task<Cotizacion> ObtenerCotizacion(int CotizacionId)
        {
            var resultado = new Dictionary<string, object>();

            try
            {
                var Cotizacion = await _dbcontext.Cotizaciones
                    .Include(p => p.IdClienteNavigation)
                    .Include(p => p.IdFormaPagoNavigation) // Formas de Pago
                    .Include(p => p.CotizacionesDetalles)
                        .ThenInclude(pd => pd.IdProductoNavigation)
                    .Include(p => p.CotizacionesDetalles)
                        .ThenInclude(pd => pd.IdColorNavigation)
                    .Include(p => p.CotizacionesDetalles)
                        .ThenInclude(pd => pd.IdCategoriaNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdProductoNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdColorNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdCategoriaNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdInsumoNavigation)
                        .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdTipoNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdProveedorNavigation)
                        .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdEstadoNavigation)
                    .Include(p => p.CotizacionesDetalleProcesos)
                        .ThenInclude(pdp => pdp.IdUnidadMedidaNavigation)
                    .FirstOrDefaultAsync(p => p.Id == CotizacionId);

                return Cotizacion;
            }
            catch (Exception ex)
            {
                return null;
            }

        }


        public async Task<bool> EliminarInsumo(int IdCotizacion, int IdInsumo)
        {
            try
            {
                CotizacionesDetalleProceso model = _dbcontext.CotizacionesDetalleProcesos.First(c => c.IdCotizacion == IdCotizacion && c.IdInsumo == IdInsumo);
                _dbcontext.CotizacionesDetalleProcesos.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

        public async Task<bool> EliminarProducto(int IdCotizacion, int IdProducto)
        {
            try
            {
                CotizacionesDetalle model = _dbcontext.CotizacionesDetalles.First(c => c.IdCotizacion == IdCotizacion && c.IdProducto == IdProducto);
                _dbcontext.CotizacionesDetalles.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }


        public async Task<bool> EliminarCotizacion(int id)
        {
            try
            {
                Cotizacion model = _dbcontext.Cotizaciones.First(c => c.Id == id);
                _dbcontext.Cotizaciones.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }

        }

        public async Task<int> TransformarCotizacionEnPedidoAsync(int idCotizacion, bool eliminarCotizacion)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                // 1) Traer la cotización con productos y procesos
                var cot = await _dbcontext.Cotizaciones
                    .Include(c => c.CotizacionesDetalles)
                    .Include(c => c.CotizacionesDetalleProcesos)
                    .FirstOrDefaultAsync(c => c.Id == idCotizacion);

                if (cot == null)
                    throw new Exception("La cotización no existe.");

                if (cot.CotizacionesDetalles == null || !cot.CotizacionesDetalles.Any())
                    throw new Exception("La cotización no tiene productos.");

                // 2) Crear el Pedido (mapeando campos que ya usás en Pedido)
                var pedido = new Pedido
                {
                    IdCliente = cot.IdCliente,
                    IdFormaPago = cot.IdFormaPago,
                    Fecha = DateTime.Now,
                    Comentarios = cot.Comentarios,
                    SubTotal = cot.SubTotal ?? 0,
                    PorcDescuento = cot.PorcDescuento ?? 0,
                    ImporteAbonado = cot.ImporteAbonado ?? 0,
                    ImporteTotal = cot.ImporteTotal ?? 0,
                    Saldo = cot.Saldo ?? 0,
                    Finalizado = cot.Finalizado // si querés iniciar en 0, cambiá a 0
                };

                _dbcontext.Pedidos.Add(pedido);
                await _dbcontext.SaveChangesAsync(); // <- necesitamos el Id de Pedido

                // 3) Copiar Detalles (y construir mapeo IdDetalle)
                var idMapping = new Dictionary<int, int>(); // CotizacionesDetalle.Id -> PedidosDetalle.Id

                foreach (var d in cot.CotizacionesDetalles)
                {
                    var det = new PedidosDetalle
                    {
                        IdPedido = pedido.Id,
                        // Id lo genera la DB
                        IdProducto = d.IdProducto,
                        IdCategoria = d.IdCategoria,
                        IdColor = d.IdColor,
                        Producto = d.Producto,                       // si guardás texto
                        Cantidad = d.Cantidad,
                        CostoUnitario = d.CostoUnitario ?? 0,
                        PrecioVenta = d.PrecioVenta ?? 0,
                        PorcIva = d.PorcIva ?? 0,
                        PorcGanancia = d.PorcGanancia ?? 0
                    };

                    _dbcontext.PedidosDetalles.Add(det);
                    await _dbcontext.SaveChangesAsync(); // necesitamos el Id real del detalle recién creado

                    idMapping[d.Id] = det.Id; // guardo el mapeo (IdDetalle Cotizacion -> IdDetalle Pedido)
                }

                // 4) Copiar Procesos (si hay), respetando el IdDetalle mapeado
                if (cot.CotizacionesDetalleProcesos != null && cot.CotizacionesDetalleProcesos.Any())
                {
                    foreach (var p in cot.CotizacionesDetalleProcesos)
                    {
                        int? idDetalleNuevo = null;

                        if (p.IdDetalle.HasValue)
                        {
                            if (idMapping.TryGetValue(p.IdDetalle.Value, out var detReal))
                                idDetalleNuevo = detReal;
                            else
                                throw new Exception($"No se pudo mapear IdDetalle={p.IdDetalle} hacia el Pedido.");
                        }

                        var proc = new PedidosDetalleProceso
                        {
                            IdPedido = pedido.Id,
                            IdDetalle = idDetalleNuevo,           // puede ser null si tu modelo lo permite
                                                                  // Id lo genera la DB
                            Cantidad = p.Cantidad,
                            IdCategoria = p.IdCategoria,
                            Comentarios = p.Comentarios,
                            Descripcion = p.Descripcion,
                            Especificacion = p.Especificacion,
                            IdColor = p.IdColor,
                            FechaActualizacion = DateTime.Now,           // normalizamos fecha de copia
                            SubTotal = p.SubTotal,
                            IdEstado = p.IdEstado,
                            IdTipo = p.IdTipo,
                            PrecioUnitario = p.PrecioUnitario,
                            IdUnidadMedida = p.IdUnidadMedida,
                            IdProveedor = p.IdProveedor,
                            IdProducto = p.IdProducto,
                            IdInsumo = p.IdInsumo
                        };

                        _dbcontext.PedidosDetalleProcesos.Add(proc);
                    }

                    await _dbcontext.SaveChangesAsync();
                }

                // 5) Borrar o marcar convertida la cotización
                if (eliminarCotizacion)
                {
                    if (cot.CotizacionesDetalleProcesos?.Any() == true)
                        _dbcontext.CotizacionesDetalleProcesos.RemoveRange(cot.CotizacionesDetalleProcesos);

                    if (cot.CotizacionesDetalles?.Any() == true)
                        _dbcontext.CotizacionesDetalles.RemoveRange(cot.CotizacionesDetalles);

                    _dbcontext.Cotizaciones.Remove(cot);
                }
                else
                {
                    // Marcado "soft": podés ajustar a tu regla (Finalizado=1 o comentario)
                    cot.Finalizado = 1;
                    cot.Comentarios = (cot.Comentarios ?? string.Empty) + $" [Convertida a Pedido #{pedido.Id}]";
                    _dbcontext.Cotizaciones.Update(cot);
                }

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return pedido.Id;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }


    }
}
