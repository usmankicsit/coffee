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

  @Column({ default: 'The Brewing Cottage' })
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ default: 'PKR' })
  currency: string;

  @Column({ default: '+92 312 8671544' })
  phone: string;

  @Column({ default: '+923128671544' })
  whatsapp: string;

  @Column({
    default: 'Shop No. 02, Sector B, Family B Park, DHA Phase 2, Islamabad',
  })
  address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({
    type: 'text',
    default:
      'The Brewing Cottage is your neighborhood café in DHA Phase 2, Islamabad — serving coffee, comfort food, burgers, pasta, and cool drinks in a warm cottage vibe.',
  })
  aboutText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
