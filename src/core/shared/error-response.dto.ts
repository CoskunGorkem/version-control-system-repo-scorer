import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  timestamp: string;

  @ApiPropertyOptional()
  uid?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  path?: string;

  @ApiPropertyOptional()
  method?: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'May contain extra error details',
  })
  // Note: actual response may include additional top-level fields from error details
  extra?: Record<string, unknown>;
}
