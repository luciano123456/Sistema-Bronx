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
    public class ProvinciaRepository : IProvinciaRepository<Provincia>
    {

        private readonly SistemaBronxContext _dbcontext;

        public ProvinciaRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }
       
        public async Task<IQueryable<Provincia>> ObtenerTodos()
        {
            IQueryable<Provincia> query = _dbcontext.Provincias;
            return query;
        }

  


    }
}
