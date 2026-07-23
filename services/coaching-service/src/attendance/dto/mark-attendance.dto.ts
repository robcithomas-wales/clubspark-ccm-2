import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class MarkAttendanceDto {
  @IsString()
  enrolmentId!: string

  @IsOptional() @IsBoolean()
  attended?: boolean

  @IsOptional() @IsString()
  notes?: string
}
