import { ApiProperty } from '@nestjs/swagger';

export class TelemetryValueDto {
  @ApiProperty({ description: 'Raw value serialized as a string — never a JS number, per docs/rules/api.md' })
  value!: string;

  @ApiProperty({ description: 'Unix timestamp (ms) of this reading' })
  ts!: number;

  @ApiProperty({
    required: false,
    description:
      'Display decimals for this key, from telemetry_definitions. Not yet populated — no catalog exists in V1 REST yet.',
  })
  decimals?: number;
}
