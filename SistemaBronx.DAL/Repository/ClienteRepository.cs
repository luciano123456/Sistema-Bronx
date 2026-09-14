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
    public class ClienteRepository : IClienteRepository<Cliente>
    {

        private readonly SistemaBronxContext _dbcontext;

        public ClienteRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            var existente = await _dbcontext.Clientes.FirstOrDefaultAsync(c => c.Id == model.Id);
            if (existente == null)
                return false;

            existente.Nombre = model.Nombre;
            existente.Telefono = model.Telefono;
            existente.Email = model.Email;
            existente.Direccion = model.Direccion;
            existente.IdProvincia = model.IdProvincia;
            existente.Localidad = model.Localidad;
            existente.Dni = model.Dni;

            if (model.Saldo.HasValue)
                existente.Saldo = model.Saldo;
            if (model.SaldoAfavor.HasValue)
                existente.SaldoAfavor = model.SaldoAfavor;

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cliente model = _dbcontext.Clientes.First(c => c.Id == id);
            _dbcontext.Clientes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<int> Insertar(Cliente model)
        {
            try
            {
                _dbcontext.Clientes.Add(model);
                await _dbcontext.SaveChangesAsync();
                return model.Id;
            } catch (Exception ex)
            {
                return 0;
            }
        }


        public async Task<Cliente> Obtener(int id)
        {
            Cliente model = await _dbcontext.Clientes.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            IQueryable<Cliente> query = _dbcontext.Clientes.Include(c => c.IdProvinciaNavigation);
            return await Task.FromResult(query);
        }




    }
}
