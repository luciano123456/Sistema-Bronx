﻿using Microsoft.AspNetCore.Mvc;
using SistemaBronx.Application.Models;
using SistemaBronx.Application.Models.ViewModels;
using SistemaBronx.BLL.Service;
using SistemaBronx.Models;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;

namespace SistemaBronx.Application.Controllers
{

    [Authorize]

    public class PedidosTiposController : Controller
    {
        private readonly IPedidoTipoService _PedidosTiposService;

        public PedidosTiposController(IPedidoTipoService PedidosTiposService)
        {
            _PedidosTiposService = PedidosTiposService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Tipos = await _PedidosTiposService.ObtenerTodos();

            var lista = Tipos.Select(c => new VMPedidoTipo
            {
                Id = c.Id,
                Nombre = c.Nombre,

            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPedidoTipo model)
        {
            var Tipo = new PedidosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosTiposService.Insertar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPedidoTipo model)
        {
            var Tipo = new PedidosTipo
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _PedidosTiposService.Actualizar(Tipo);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _PedidosTiposService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Tipo = await _PedidosTiposService.Obtener(id);

            if (Tipo != null)
            {
                return StatusCode(StatusCodes.Status200OK, Tipo);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }
        public IActionResult Privacy()
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