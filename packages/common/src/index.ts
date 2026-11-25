export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  STOCK_RESERVED = 'STOCK_RESERVED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function createPage<T>(
  items: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): PageResult<T> {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('page must be a positive integer');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer');
  }

  return { items, page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) };
}

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' was not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, code, 409);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, code, 400);
  }
}
