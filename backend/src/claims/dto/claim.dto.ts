import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ClaimStatus } from '../order-claim.entity';

export class CreateClaimDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  reason: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  details: string;
}

export class UpdateClaimDto {
  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;
}
