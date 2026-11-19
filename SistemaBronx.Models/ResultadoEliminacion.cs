using System;
using System.Collections.Generic;

namespace SistemaBronx.Models;

/// <summary>
/// Resultado de eliminar un producto/insumo con soporte de eliminación en cascada.
/// </summary>
public class ResultadoEliminacion
{
    /// <summary>true si el registro quedó eliminado.</summary>
    public bool Eliminado { get; set; }

    /// <summary>true si tiene registros asociados y no se eliminó porque no se pidió cascada.</summary>
    public bool EnUso { get; set; }

    /// <summary>Descripción de los registros asociados (ej. "3 pedido(s)").</summary>
    public List<string> Detalle { get; set; } = new();

    /// <summary>Mensaje de error si falló la operación.</summary>
    public string? Error { get; set; }
}
