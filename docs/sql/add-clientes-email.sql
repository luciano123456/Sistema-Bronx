-- Agregar Email a Clientes (nullable).
-- Ejecutar en Sistema_Bronx_Test y en producción cuando corresponda.

IF COL_LENGTH('Clientes', 'Email') IS NULL
BEGIN
    ALTER TABLE Clientes ADD Email varchar(255) NULL;
    PRINT 'Columna Email agregada a Clientes.';
END
ELSE
    PRINT 'La columna Email ya existe en Clientes.';
GO
