-- Precio y stock se calculan en subconsultas ya agrupadas.
-- No hacer JOIN directo a StockSaldos: cada color duplica los insumos y multiplica el costo.

USE [Sistema_Bronx]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[ObtenerProductosConCosto]
AS
BEGIN
   SELECT
        p.Id,
        p.Nombre,
        p.PorcGanancia,
        p.PorcIva,
        p.IdCategoria,
        cat.Id AS CategoriaId,
        cat.Nombre AS CategoriaNombre,
        ISNULL(costo.BaseInsumos, 0)
            + (ISNULL(costo.BaseInsumos, 0) * p.PorcGanancia / 100)
            + ((ISNULL(costo.BaseInsumos, 0) + (ISNULL(costo.BaseInsumos, 0) * p.PorcGanancia / 100)) * p.PorcIva / 100) AS CostoUnitario,
        ISNULL(stock.Cantidad, 0) AS Stock
   FROM Productos p
   LEFT JOIN ProductosCategorias cat ON p.IdCategoria = cat.Id
   LEFT JOIN (
        SELECT pi.IdProducto, SUM(pi.Cantidad * i.PrecioVenta) AS BaseInsumos
        FROM ProductosInsumos pi
        INNER JOIN Insumos i ON pi.IdInsumo = i.Id
        GROUP BY pi.IdProducto
   ) costo ON costo.IdProducto = p.Id
   LEFT JOIN (
        SELECT ss.IdProducto, SUM(ss.CantidadActual) AS Cantidad
        FROM StockSaldos ss
        WHERE ss.TipoItem = 'P' AND ss.IdProducto IS NOT NULL
        GROUP BY ss.IdProducto
   ) stock ON stock.IdProducto = p.Id
END
GO

ALTER PROCEDURE [dbo].[ObtenerProductoConCostoId]
    @Id INT
AS
BEGIN
    SELECT
        p.Id,
        p.Nombre,
        p.PorcGanancia,
        p.PorcIva,
        p.IdCategoria,
        cat.Id AS CategoriaId,
        cat.Nombre AS CategoriaNombre,
        ISNULL(costo.BaseInsumos, 0)
            + (ISNULL(costo.BaseInsumos, 0) * p.PorcGanancia / 100)
            + ((ISNULL(costo.BaseInsumos, 0) + (ISNULL(costo.BaseInsumos, 0) * p.PorcGanancia / 100)) * p.PorcIva / 100) AS CostoUnitario,
        ISNULL(stock.Cantidad, 0) AS Stock
    FROM Productos p
    LEFT JOIN ProductosCategorias cat ON p.IdCategoria = cat.Id
    LEFT JOIN (
        SELECT pi.IdProducto, SUM(pi.Cantidad * i.PrecioVenta) AS BaseInsumos
        FROM ProductosInsumos pi
        INNER JOIN Insumos i ON pi.IdInsumo = i.Id
        GROUP BY pi.IdProducto
    ) costo ON costo.IdProducto = p.Id
    LEFT JOIN (
        SELECT ss.IdProducto, SUM(ss.CantidadActual) AS Cantidad
        FROM StockSaldos ss
        WHERE ss.TipoItem = 'P' AND ss.IdProducto IS NOT NULL
        GROUP BY ss.IdProducto
    ) stock ON stock.IdProducto = p.Id
    WHERE p.Id = @Id
END
GO
