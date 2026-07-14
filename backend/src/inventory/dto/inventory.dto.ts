import { IsInt, IsOptional, Min } from 'class-validator';

export class AdjustInventoryDto {
  @IsInt()
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
