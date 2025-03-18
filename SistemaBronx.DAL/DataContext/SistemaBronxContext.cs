using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SistemaBronx.Models;

namespace SistemaBronx.DAL.DataContext;

public partial class SistemaBronxContext : DbContext
{
    public SistemaBronxContext()
    {
    }

    public SistemaBronxContext(DbContextOptions<SistemaBronxContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<Color> Colores { get; set; }

    public virtual DbSet<Estado> Estados { get; set; }

    public virtual DbSet<EstadosUsuario> EstadosUsuarios { get; set; }

    public virtual DbSet<FormasdePago> FormasdePagos { get; set; }

    public virtual DbSet<Gasto> Gastos { get; set; }

    public virtual DbSet<GastosCategoria> GastosCategorias { get; set; }

    public virtual DbSet<Insumo> Insumos { get; set; }

    public virtual DbSet<InsumosCategoria> InsumosCategorias { get; set; }

    public virtual DbSet<InsumosTipo> InsumosTipos { get; set; }

    public virtual DbSet<Pedido> Pedidos { get; set; }

    public virtual DbSet<PedidosCategoria> PedidosCategorias { get; set; }

    public virtual DbSet<PedidosDetalle> PedidosDetalles { get; set; }

    public virtual DbSet<PedidosDetalleProceso> PedidosDetalleProcesos { get; set; }

    public virtual DbSet<PedidosEstado> PedidosEstados { get; set; }

    public virtual DbSet<PedidosTipo> PedidosTipos { get; set; }

    public virtual DbSet<Producto> Productos { get; set; }

    public virtual DbSet<ProductosCategoria> ProductosCategorias { get; set; }

    public virtual DbSet<ProductosInsumo> ProductosInsumos { get; set; }

    public virtual DbSet<ProductosMarca> ProductosMarcas { get; set; }

    public virtual DbSet<Proveedor> Proveedores { get; set; }

    public virtual DbSet<Provincia> Provincias { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<UnidadesDeMedida> UnidadesDeMedida { get; set; }

    public virtual DbSet<User> Usuarios { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
        //=> optionsBuilder.UseSqlServer("Server=DESKTOP-3MT5F5F; Database=Sistema_Bronx; Integrated Security=true; Trusted_Connection=True; Encrypt=False");\
        => optionsBuilder.UseSqlServer("Server=200.73.140.119; Database=Sistema_Bronx; Integrated Security=true; Trusted_Connection=True; Encrypt=False");


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.Property(e => e.Direccion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DNI");
            entity.Property(e => e.Localidad)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Saldo).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.SaldoAfavor)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("SaldoAFavor");
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_Clientes_Provincias");
        });

        modelBuilder.Entity<Color>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Estado>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<EstadosUsuario>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<FormasdePago>(entity =>
        {
            entity.ToTable("FormasdePago");

            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Gasto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_Gastos_1");

            entity.Property(e => e.Comentarios)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.ImporteAbonado).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PorcIva).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Saldo).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.SubtotalNeto).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_Gastos_GastosCategorias");

            entity.HasOne(d => d.IdFormadePagoNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdFormadePago)
                .HasConstraintName("FK_Gastos_FormasdePago");
        });

        modelBuilder.Entity<GastosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Insumo>(entity =>
        {
            entity.Property(e => e.Descripcion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Especificacion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.IdProveedor).HasDefaultValueSql("((0))");
            entity.Property(e => e.PorcGanancia).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PrecioCosto).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_Insumos_InsumosCategorias");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Insumos_Proveedores");

            entity.HasOne(d => d.IdTipoNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdTipo)
                .HasConstraintName("FK_Insumos_InsumosTipos");

            entity.HasOne(d => d.IdUnidadMedidaNavigation).WithMany(p => p.Insumos)
                .HasForeignKey(d => d.IdUnidadMedida)
                .HasConstraintName("FK_Insumos_UnidadesDeMedida");
        });

        modelBuilder.Entity<InsumosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<InsumosTipo>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Pedido>(entity =>
        {
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.ImporteAbonado).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Saldo).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.SubTotal).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_Pedidos_Pedidos");

            entity.HasOne(d => d.IdFormaPagoNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdFormaPago)
                .HasConstraintName("FK_Pedidos_FormasdePago");
        });

        modelBuilder.Entity<PedidosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PedidosDetalle>(entity =>
        {
            entity.ToTable("PedidosDetalle");

            entity.Property(e => e.Cantidad).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.PedidosDetalles)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_PedidosDetalle_PedidosCategorias");

            entity.HasOne(d => d.IdColorNavigation).WithMany(p => p.PedidosDetalles)
                .HasForeignKey(d => d.IdColor)
                .HasConstraintName("FK_PedidosDetalle_Colores");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PedidosDetalles)
                .HasForeignKey(d => d.IdPedido)
                .HasConstraintName("FK_PedidosDetalle_Pedidos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.PedidosDetalles)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PedidosDetalle_Productos");
        });

        modelBuilder.Entity<PedidosDetalleProceso>(entity =>
        {
            entity.Property(e => e.Cantidad).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Comentarios)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Descripcion)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Especificacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.FechaActualizacion).HasColumnType("datetime");
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.SubTotal).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_PedidosDetalleProcesos_PedidosCategorias");

            entity.HasOne(d => d.IdColorNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdColor)
                .HasConstraintName("FK_PedidosDetalleProcesos_Colores");

            entity.HasOne(d => d.IdDetalleNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdDetalle)
                .HasConstraintName("FK_PedidosDetalleProcesos_PedidosDetalle");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdEstado)
                .HasConstraintName("FK_PedidosDetalleProcesos_PedidosEstados");

            entity.HasOne(d => d.IdInsumoNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdInsumo)
                .HasConstraintName("FK_PedidosDetalleProcesos_Insumos");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdPedido)
                .HasConstraintName("FK_PedidosDetalleProcesos_Pedidos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_PedidosDetalleProcesos_Productos");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_PedidosDetalleProcesos_Proveedores");

            entity.HasOne(d => d.IdTipoNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdTipo)
                .HasConstraintName("FK_PedidosDetalleProcesos_PedidosTipos");

            entity.HasOne(d => d.IdUnidadMedidaNavigation).WithMany(p => p.PedidosDetalleProcesos)
                .HasForeignKey(d => d.IdUnidadMedida)
                .HasConstraintName("FK_PedidosDetalleProcesos_UnidadesDeMedida");
        });

        modelBuilder.Entity<PedidosEstado>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PedidosTipo>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_Productos_ProductosCategorias");
        });

        modelBuilder.Entity<ProductosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosInsumo>(entity =>
        {
            entity.Property(e => e.Cantidad).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Especificacion)
                .HasMaxLength(255)
                .IsUnicode(false);

            entity.HasOne(d => d.IdInsumoNavigation).WithMany(p => p.ProductosInsumos)
                .HasForeignKey(d => d.IdInsumo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosInsumos_Insumos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosInsumos)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_ProductosInsumos_ProductosInsumos");
        });

        modelBuilder.Entity<ProductosMarca>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Proveedor>(entity =>
        {
            entity.Property(e => e.Apodo)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Cbu)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("CBU");
            entity.Property(e => e.Cuit)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("CUIT");
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Ubicacion)
                .HasMaxLength(500)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Provincia>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UnidadesDeMedida>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_ProductosUnidadesDeMedida");

            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Contrasena)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Direccion)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Usuario)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("Usuario");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_EstadosUsuarios");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdRol)
                .HasConstraintName("FK_Usuarios_Roles");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
