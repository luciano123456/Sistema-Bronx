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

// Configurar la conexi�n a la base de datos
builder.Services.AddDbContext<SistemaBronxContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("cadenaSQL"));
});

// Agregar Razor Pages
builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

// Registrar repositorios y servicios
builder.Services.AddScoped<IGenericRepository<Cliente>, ClienteRepository>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IProvinciaRepository<Provincia>, ProvinciaRepository>();
builder.Services.AddScoped<IProvinciaService, ProvinciaService>();
builder.Services.AddScoped<IGenericRepository<SistemaBronx.Models.Proveedor>, ProveedorRepository>();
builder.Services.AddScoped<IProveedorService, ProveedorService>();
builder.Services.AddScoped<IGenericRepository<ProductosMarca>, MarcaRepository>();
builder.Services.AddScoped<IMarcaService, MarcaService>();
builder.Services.AddScoped<IGenericRepository<ProductosCategoria>, CategoriaRepository>();
builder.Services.AddScoped<ICategoriaService, CategoriaService>();
builder.Services.AddScoped<IGenericRepository<ProductosUnidadesDeMedida>, UnidadDeMedidaRepository>();
builder.Services.AddScoped<IUnidadDeMedidaService, UnidadDeMedidaService>();

builder.Services.AddScoped<IPedidosRepository<Pedido>, PedidosRepository>();
builder.Services.AddScoped<IPedidoService, PedidoService>();

builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<IRolesRepository<Rol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<IEstadosUsuariosRepository<EstadosUsuario>, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

// Configurar autenticaci�n con cookies
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login/Index";  // Ruta para redirigir al login si no est� autenticado
        options.LogoutPath = "/Login/Logout"; // Ruta para cerrar sesi�n
    });


var app = builder.Build();

// Configurar el pipeline de middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication(); // Habilitar la autenticaci�n con cookies
app.UseAuthorization();  // Habilitar la autorizaci�n

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Aseg�rate de que las rutas de login est�n excluidas del middleware de autenticaci�n
app.MapControllerRoute(
    name: "login",
    pattern: "Login/{action=Index}",
    defaults: new { controller = "Login", action = "Index" });
app.Run();