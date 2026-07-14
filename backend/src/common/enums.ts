export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CASHIER = 'CASHIER',
  CUSTOMER = 'CUSTOMER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
}

export enum OrderSource {
  POS = 'POS',
  ONLINE = 'ONLINE',
}
