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

    public virtual DbSet<Chofer> Choferes { get; set; }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<EstadosUsuario> EstadosUsuarios { get; set; }

    public virtual DbSet<ProductosMarca> ProductosMarcas { get; set; }

    public virtual DbSet<PagosPedidosCliente> PagosPedidosClientes { get; set; }

    public virtual DbSet<PagosPedidosProveedor> PagosPedidosProveedores { get; set; }

    public virtual DbSet<Pedido> Pedidos { get; set; }

    public virtual DbSet<PedidosProducto> PedidosProductos { get; set; }


    public virtual DbSet<ProductosCategoria> ProductosCategorias { get; set; }

    public virtual DbSet<ProductosUnidadesDeMedida> ProductosUnidadesDeMedida { get; set; }

    public virtual DbSet<Proveedor> Proveedores { get; set; }

    public virtual DbSet<Provincia> Provincias { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<User> Usuarios { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=DESKTOP-J2J16BG\\SQLEXPRESS; Database=Sistema_Bronx; Integrated Security=true; Trusted_Connection=True; Encrypt=False");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Chofer>(entity =>
        {
            entity.Property(e => e.Direccion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

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

        modelBuilder.Entity<EstadosUsuario>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PagosPedidosCliente>(entity =>
        {
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Total).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalArs)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("TotalARS");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PagosPedidosClientes)
                .HasForeignKey(d => d.IdPedido)
                .HasConstraintName("FK_PagosPedidosClientes_Pedidos");
        });

        modelBuilder.Entity<PagosPedidosProveedor>(entity =>
        {
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Total).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalArs)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("TotalARS");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PagosPedidosProveedores)
                .HasForeignKey(d => d.IdPedido)
                .HasConstraintName("FK_PagosPedidosProveedores_Pedidos");
        });

        modelBuilder.Entity<Pedido>(entity =>
        {
            entity.Property(e => e.CostoFlete).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Estado)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaEntrega).HasColumnType("datetime");
            entity.Property(e => e.NroRemito)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.RestanteCliente).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.RestanteProveedor).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalCliente).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalProveedor).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_Pedidos_Clientes");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_Pedidos_Proveedores");
        });

        modelBuilder.Entity<PedidosProducto>(entity =>
        {
            entity.Property(e => e.Precio).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PedidosProductos)
                .HasForeignKey(d => d.IdPedido)
                .HasConstraintName("FK_PedidosProductos_PedidosProductos");

        });

      

        modelBuilder.Entity<ProductosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosMarca>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosUnidadesDeMedida>(entity =>
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
