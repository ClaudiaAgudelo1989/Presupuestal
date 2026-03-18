use database presupuesto; 


CREATE TABLE `seguimiento_presupuestal` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `Numero_Documento` VARCHAR(50) NULL, -- Cambiado a VARCHAR para evitar problemas con ceros a la izquierda
    `Fecha_Registro` VARCHAR(100) NULL,
    `Fecha_Creacion` VARCHAR(100) NULL,
    `Tipo_de_CDP` VARCHAR(100) NULL,
    `Estado` VARCHAR(100) NULL,
    `Dependencia` VARCHAR(50) NULL,      -- Cambiado a VARCHAR
    `Dependencia_Descripcion` VARCHAR(255) NULL,
    `Rubro` VARCHAR(100) NULL,
    `Descripcion` VARCHAR(255) NULL,
    `Fuente` VARCHAR(100) NULL,
    `Recurso` VARCHAR(100) NULL,
    `Sit` VARCHAR(100) NULL,
    `Valor_Inicial` DECIMAL(18,2) NULL,
    `Valor_Operaciones` DECIMAL(18,2) NULL,
    `Valor_Actual` DECIMAL(18,2) NULL,
    `Saldo_por_Comprometer` DECIMAL(18,2) NULL,
    `Objeto` TEXT NULL,                  -- Cambiado a TEXT por si el objeto es muy largo
    `Solicitud_CDP` VARCHAR(50) NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `CRP` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `Numero Documento` VARCHAR(100) NULL,
    `Fecha de Registro` DATETIME NULL,
    `Fecha de Creacion` DATETIME NULL,
    `Estado` VARCHAR(100) NULL,
    `Dependencia` VARCHAR(100) NULL,
    `Dependencia Descripcion` VARCHAR(255) NULL,
    `Rubro` VARCHAR(150) NULL,
    `Descripcion` LONGTEXT NULL,
    `Fuente` VARCHAR(100) NULL,
    `Recurso` VARCHAR(100) NULL,
    `Situacion` VARCHAR(50) NULL,
    `Valor Inicial` DECIMAL(18,2) NULL,
    `Valor Operaciones` DECIMAL(18,2) NULL,
    `Valor Actual` DECIMAL(18,2) NULL,
    `Saldo por Utilizar` DECIMAL(18,2) NULL,
    `Tipo Identificacion` VARCHAR(100) NULL,
    `Identificacion` VARCHAR(100) NULL,
    `Nombre Razon Social` VARCHAR(255) NULL,
    `Medio de Pago` VARCHAR(100) NULL,
    `Tipo Cuenta` VARCHAR(100) NULL,
    `Numero Cuenta` VARCHAR(100) NULL,
    `Estado Cuenta` VARCHAR(100) NULL,
    `Entidad Nit` VARCHAR(100) NULL,
    `Entidad Descripcion` VARCHAR(255) NULL,
    `Solicitud CDP` VARCHAR(100) NULL,
    `CDP` VARCHAR(100) NULL,
    `Compromisos` DECIMAL(18,2) NULL,
    `Cuentas por Pagar` DECIMAL(18,2) NULL,
    `Obligaciones` DECIMAL(18,2) NULL,
    `Ordenes de Pago` DECIMAL(18,2) NULL,
    `Reintegros` DECIMAL(18,2) NULL
);
CREATE TABLE `CDP` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `Numero Documento` VARCHAR(100) NULL,
    `Fecha de Registro` DATETIME NULL,
    `Fecha de Creacion` DATETIME NULL,
    `Tipo de CDP` VARCHAR(100) NULL,
    `Estado` VARCHAR(100) NULL,
    `Dependencia` VARCHAR(100) NULL,
    `Dependencia Descripcion` VARCHAR(255) NULL,
    `Rubro` VARCHAR(150) NULL,
    `Descripcion` LONGTEXT NULL,
    `Fuente` VARCHAR(100) NULL,
    `Recurso` VARCHAR(100) NULL,
    `Sit` VARCHAR(50) NULL,
    `Valor Inicial` DECIMAL(18,2) NULL,
    `Valor Operaciones` DECIMAL(18,2) NULL,
    `Valor Actual` DECIMAL(18,2) NULL,
    `Saldo por Comprometer` DECIMAL(18,2) NULL,
    `Objeto` LONGTEXT NULL,
    `Solicitud CDP` VARCHAR(100) NULL
);


