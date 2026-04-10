import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'

export enum MessageAudienceDto {
  ALL_ENTRANTS = 'ALL_ENTRANTS',
  CONFIRMED_ENTRANTS = 'CONFIRMED_ENTRANTS',
  PENDING_ENTRANTS = 'PENDING_ENTRANTS',
  DIVISION = 'DIVISION',
  SPECIFIC = 'SPECIFIC',
}

export class SendMessageDto {
  @IsString() @IsNotEmpty() subject!: string
  @IsString() @IsNotEmpty() body!: string
  @IsOptional() @IsEnum(MessageAudienceDto) audience?: MessageAudienceDto
  @IsOptional() @IsString() divisionId?: string
}
