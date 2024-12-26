﻿using SistemaBronx.Models;

namespace SistemaBronx.BLL.Service
{
    public interface IUsuariosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(User model);
        Task<bool> Insertar(User model);

        Task<User> Obtener(int id);

        Task<IQueryable<User>> ObtenerTodos();
    }

}