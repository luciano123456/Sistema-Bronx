/* =====================================================================
   Índices recomendados para el módulo "Análisis de datos".

   Hoy las tablas Pedidos / PedidosDetalle / Gastos solo tienen la PK, así que
   cada consulta del tablero recorre la tabla completa. Estos índices cubren
   exactamente las columnas que lee AnalisisDatosRepository (filtro por Fecha +
   columnas incluidas) y el JOIN PedidosDetalle -> Pedidos (IdPedido).

   Son opcionales y seguros de ejecutar más de una vez (IF NOT EXISTS).
   Probar primero en la base de test.
   ===================================================================== */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pedidos_Fecha' AND object_id = OBJECT_ID('dbo.Pedidos'))
    CREATE NONCLUSTERED INDEX IX_Pedidos_Fecha
        ON dbo.Pedidos (Fecha)
        INCLUDE (IdCliente, IdFormaPago, ImporteAbonado, ImporteTotal, SubTotal, PorcDescuento, Saldo, CostoFinancieroPorc);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PedidosDetalle_IdPedido' AND object_id = OBJECT_ID('dbo.PedidosDetalle'))
    CREATE NONCLUSTERED INDEX IX_PedidosDetalle_IdPedido
        ON dbo.PedidosDetalle (IdPedido)
        INCLUDE (IdProducto, IdCategoria, Cantidad, CostoUnitario, PrecioVenta);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Gastos_Fecha' AND object_id = OBJECT_ID('dbo.Gastos'))
    CREATE NONCLUSTERED INDEX IX_Gastos_Fecha
        ON dbo.Gastos (Fecha)
        INCLUDE (IdCategoria, IdFormadePago, ImporteTotal, Saldo);
GO
