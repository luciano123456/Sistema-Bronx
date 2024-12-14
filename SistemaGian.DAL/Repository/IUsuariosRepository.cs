﻿using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaGian.DAL.Repository
{
    public interface IUsuariosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(User model);
        Task<bool> Insertar(User model);
        Task<User> Obtener(int id);
        Task<IQueryable<User>> ObtenerTodos();
    }
}