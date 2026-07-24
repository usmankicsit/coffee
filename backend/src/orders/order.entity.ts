import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../common/enums';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Index()
  @Column({ type: 'varchar', length: 20, default: OrderSource.POS })
  source: OrderSource;

  /** Null until cashier collects payment on waiter orders. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column()
  createdById: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
