using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;              // <-- importante
using SistemaBronx.DAL.DataContext;
using TuProyecto.Repositories.Interfaces;

namespace SistemaBronx.DAL.Repository
{
    public class AnalisisDatosRepository : IAnalisisDatosRepository
    {
        private readonly SistemaBronxContext _dbcontext;

        public AnalisisDatosRepository(SistemaBronxContext context)
        {
            _dbcontext = context;
        }

        public async Task<DataSet> ObtenerDashboardAsync(DateTime? desde, DateTime? hasta, int? idCliente, int topN)
        {
            var ds = new DataSet();

            // Tomo el connection string del contexto y creo un SqlConnection "propio".
            var cs = _dbcontext.Database.GetDbConnection().ConnectionString;
            using var conn = new SqlConnection(cs);

            using (var cmd = new SqlCommand("dbo.usp_Dashboard_Full", conn))
            using (var da = new SqlDataAdapter(cmd))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;

                cmd.Parameters.AddWithValue("@FechaDesde", (object?)desde ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@FechaHasta", (object?)hasta ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IdCliente", (object?)idCliente ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TopN", topN);

                await conn.OpenAsync().ConfigureAwait(false);

                da.Fill(ds); // <<< trae TODOS los result sets del SP

                // opcional: nombres para debug
                var names = new[]{
                    "RS0_KPIs","RS1_Mensual","RS2_Crecimiento","RS3_Interanual","RS4_MediosPago",
                    "RS5_TopMasVendidos","RS6_TopMenosVendidos","RS7_TopMasRentables","RS8_TopMenosRentables",
                    "RS9_PorCategoria","RS10_PorProveedor"
                };
                for (int i = 0; i < ds.Tables.Count && i < names.Length; i++)
                    ds.Tables[i].TableName = names[i];
            }

            return ds;
        }
    }
}
