using Microsoft.EntityFrameworkCore;
using SistemaBronx.BLL.Service;
using SistemaBronx.DAL.DataContext;
using SistemaBronx.DAL.Repository;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<SistemaBronxContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SistemaDB")));


// Agregar Razor Pages
builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

// Registrar repositorios y servicios
builder.Services.AddScoped<IClienteRepository<Cliente>, ClienteRepository>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IProvinciaRepository<Provincia>, ProvinciaRepository>();
builder.Services.AddScoped<IProvinciaService, ProvinciaService>();
builder.Services.AddScoped<IGenericRepository<Proveedor>, ProveedorRepository>();
builder.Services.AddScoped<IProveedorService, ProveedorService>();
builder.Services.AddScoped<IGenericRepository<ProductosMarca>, MarcaRepository>();
builder.Services.AddScoped<IMarcaService, MarcaService>();
builder.Services.AddScoped<IGenericRepository<InsumosCategoria>, InsumoCategoriaRepository>();
builder.Services.AddScoped<IInsumoCategoriaService, InsumoCategoriaService>();

builder.Services.AddScoped<IGenericRepository<UnidadesDeMedida>, UnidadDeMedidaRepository>();
builder.Services.AddScoped<IUnidadDeMedidaService, UnidadDeMedidaService>();

builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<IRolesRepository<Rol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<IEstadosUsuariosRepository<EstadosUsuario>, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddScoped<IInsumoRepository<Insumo>, InsumoRepository>();
builder.Services.AddScoped<IInsumoService, Insumoservice>();

builder.Services.AddScoped<IGenericRepository<Color>, ColorRepository>();
builder.Services.AddScoped<IColorService, ColorService>();

builder.Services.AddScoped<IGenericRepository<InsumosTipo>, InsumosTipoRepository>();
builder.Services.AddScoped<IInsumosTipoService, InsumosTipoService>();

builder.Services.AddScoped<IProductoRepository<Producto>, ProductoRepository>();
builder.Services.AddScoped<IProductoService, ProductoService>();

builder.Services.AddScoped<IGenericRepository<GastosCategoria>, GastoCategoriaRepository>();
builder.Services.AddScoped<IGastoCategoriaService, GastoCategoriaService>();

builder.Services.AddScoped<IGenericRepository<FormasdePago>, FormasdePagoRepository>();
builder.Services.AddScoped<IFormasdePagoService, FormasdePagoService>();

builder.Services.AddScoped<IGastosRepository<Gasto>, GastosRepository>();
builder.Services.AddScoped<IGastoService, GastoService>();

builder.Services.AddScoped<IGenericRepository<ProductosCategoria>, ProductoCategoriaRepository>();
builder.Services.AddScoped<IProductoCategoriaService, ProductoCategoriaService>();

builder.Services.AddScoped<IGenericRepository<PedidosCategoria>, PedidoCategoriaRepository>();
builder.Services.AddScoped<IPedidoCategoriaService, PedidoCategoriaService>();


builder.Services.AddScoped<IGenericRepository<PedidosTipo>, PedidoTipoRepository>();
builder.Services.AddScoped<IPedidoTipoService, PedidoTipoService>();

builder.Services.AddScoped<IGenericRepository<PedidosEstado>, PedidoEstadoRepository>();
builder.Services.AddScoped<IPedidoEstadoService, PedidoEstadoService>();

builder.Services.AddScoped<IPedidosRepository<Pedido>, PedidoRepository>();
builder.Services.AddScoped<IPedidoService, PedidoService>();

builder.Services.AddScoped<ICotizacionesRepository<Cotizacion>, CotizacionRepository>();
builder.Services.AddScoped<ICotizacioneservice, Cotizacioneservice>();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

// Configurar autenticación con cookies
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Index";  // Ruta para redirigir al login si no está autenticado
        options.LogoutPath = "/Login/Logout"; // Ruta para cerrar sesión
    });


var app = builder.Build();

// Configurar el pipeline de middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Pedidos/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=600");
    }
});

app.UseRouting();

app.UseAuthentication(); // Habilitar la autenticación con cookies
app.UseAuthorization();  // Habilitar la autorización

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Pedidos}/{action=Index}/{id?}");

// Asegúrate de que las rutas de login estén excluidas del middleware de autenticación
app.MapControllerRoute(
    name: "login",
    pattern: "Login/{action=Index}",
    defaults: new { controller = "Login", action = "Index" });
app.Run();
