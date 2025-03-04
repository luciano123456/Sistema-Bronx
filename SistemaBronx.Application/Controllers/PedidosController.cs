using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;

namespace SistemaBronx.Application.Controllers
{

    [Authorize]

    public class PedidosController : Controller
    {
        //private readonly IPedidoervice _PedidosService;

        //public PedidosController(IPedidoervice PedidosService)
        //{
        //    _PedidosService = PedidosService;
        //}


        public IActionResult Index()
        {
            return View();
        }


        public IActionResult NuevoModif()
        {
            return View();
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}