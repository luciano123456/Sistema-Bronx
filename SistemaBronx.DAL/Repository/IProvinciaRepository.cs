using SistemaBronx.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SistemaBronx.DAL.Repository
{
    public interface IProvinciaRepository<TEntityModel> where TEntityModel : class
    {
        Task<IQueryable<TEntityModel>> ObtenerTodos();
    }
}
