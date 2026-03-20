-- Script para crear la tabla EJE en la BD presupuesto
-- Ejecuta este script en MySQL Workbench si la tabla no existe o está con NULL

USE presupuesto;

-- Eliminar tabla si existe (OPCIONAL - descomenta solo si necesitas recrearla)
-- DROP TABLE IF EXISTS `eje`;

-- Crear tabla EJE
CREATE TABLE IF NOT EXISTS `eje` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `Dependencia` VARCHAR(255) NULL,
    `Tipo` VARCHAR(50) NULL,
    `Concepto` VARCHAR(255) NULL,
    `Fuente` VARCHAR(100) NULL,
    `Situacion` VARCHAR(50) NULL,
    `Recurso` VARCHAR(100) NULL,
    `Apropiacion_Vigente` DECIMAL(18,2) NULL,
    `Total_CDP` DECIMAL(18,2) NULL,
    `Apropiacion_Disponible` DECIMAL(18,2) NULL,
    `Total_CDP_Modificacion` DECIMAL(18,2) NULL,
    `Total_Compromiso` DECIMAL(18,2) NULL,
    `CDP_Por_Comprometer` DECIMAL(18,2) NULL,
    `Total_Obligaciones` DECIMAL(18,2) NULL,
    `Compromiso_Por_Obligar` DECIMAL(18,2) NULL,
    `Total_Ordenes_Pago` DECIMAL(18,2) NULL,
    `Obligaciones_Por_Ordenar` DECIMAL(18,2) NULL,
    `Pagos` DECIMAL(18,2) NULL,
    `Ordenes_Pago_Por_Pagar` DECIMAL(18,2) NULL,
    `Total_Reintegros` DECIMAL(18,2) NULL,
    `Vigencia` INT NULL,
    INDEX idx_vigencia (Vigencia),
    INDEX idx_dependencia (Dependencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verificar que la tabla se creó
SELECT TABLE_NAME FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'presupuesto' AND TABLE_NAME = 'eje';
