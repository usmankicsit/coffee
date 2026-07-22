export type UserRole = 'SUPER_ADMIN' | 'CASHIER' | 'CUSTOMER';

export type OrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD';

export type OrderSource = 'POS' | 'ONLINE';

export type SellingTag = 'MOST_SELLING' | 'TOP_LISTED' | 'POPULAR';

export type ClaimStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  price: number | string;
  categoryId: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  description?: string | null;
  category?: Category;
  inventory?: Inventory;
  sellingTag?: SellingTag | null;
  sellingLabel?: string | null;
  quantitySold?: number;
  ratingAvg?: number | null;
  ratingCount?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  source: OrderSource;
  paymentMethod: PaymentMethod;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  note?: string | null;
  createdById: string;
  createdBy?: User;
  items: OrderItem[];
  createdAt: string;
}

export interface ProductReview {
  id: string;
  orderId: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface OrderClaim {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  details: string;
  status: ClaimStatus;
  staffNote?: string | null;
  createdAt: string;
  order?: Order;
  user?: User;
}

export interface ShopSettings {
  id: string;
  name: string;
  taxPercent: number | string;
  currency: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  logoUrl?: string | null;
  aboutText?: string;
}

export interface Expense {
  id: string;
  title: string;
  note?: string | null;
  amount: number | string;
  expenseDate: string;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseListResponse {
  from: string;
  to: string;
  count: number;
  totalAmount: number;
  items: Expense[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  roleTitle: string;
  bio?: string | null;
  photoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SalesReport {
  from: string;
  to: string;
  orderCount: number;
  completedCount: number;
  revenue: number;
  byStatus: Record<string, number>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
