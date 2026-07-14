import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shop_settings')
export class ShopSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'Coffee Shop' })
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ default: 'PKR' })
  currency: string;

  @Column({ default: '+92 300 1234567' })
  phone: string;

  @Column({ default: '+923001234567' })
  whatsapp: string;

  @Column({ default: '12 MM Alam Road, Gulberg III, Lahore' })
  address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({
    type: 'text',
    default:
      'Brew & Bean is a neighborhood coffee shop serving carefully roasted beans, handcrafted drinks, and fresh pastries in the heart of Lahore.',
  })
  aboutText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
