// Códigos de error de la aplicación
export enum ErrorCode {
  // Errores de validación (400)
  REQUIRED_FIELDS = 'REQUIRED_FIELDS',
  INVALID_EMAIL_LIST = 'INVALID_EMAIL_LIST',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_UUID = 'INVALID_UUID',
  CERTIFICATE_ALREADY_DELETED = 'CERTIFICATE_ALREADY_DELETED',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_EXPIRATION_STATUS = 'INVALID_EXPIRATION_STATUS',
  ERROR_MESSAGE_REQUIRED = 'ERROR_MESSAGE_REQUIRED',
  
  // Errores de recursos no encontrados (404)
  CERTIFICATE_NOT_FOUND = 'CERTIFICATE_NOT_FOUND',
  
  // Errores internos (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// Clase de error personalizada con code y message
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message
    };
  }
}

// Factory functions para crear errores comunes
export class ValidationError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Error interno del servidor') {
    super(ErrorCode.INTERNAL_ERROR, message, 500);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}
