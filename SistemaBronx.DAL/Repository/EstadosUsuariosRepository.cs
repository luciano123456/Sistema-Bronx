﻿using Microsoft.EntityFrameworkCore;
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
    public class EstadosUsuariosRepository : IEstadosUsuariosRepository<EstadosUsuario>
    {

        private readonly SistemaBronxContext _dbcontext;

        public EstadosUsuariosRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(EstadosUsuario model)
        {
            _dbcontext.EstadosUsuarios.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            EstadosUsuario model = _dbcontext.EstadosUsuarios.First(c => c.Id == id);
            _dbcontext.EstadosUsuarios.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(EstadosUsuario model)
        {
            _dbcontext.EstadosUsuarios.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<EstadosUsuario> Obtener(int id)
        {
            EstadosUsuario model = await _dbcontext.EstadosUsuarios.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<EstadosUsuario>> ObtenerTodos()
        {
            IQueryable<EstadosUsuario> query = _dbcontext.EstadosUsuarios;
            return await Task.FromResult(query);
        }




    }
}
