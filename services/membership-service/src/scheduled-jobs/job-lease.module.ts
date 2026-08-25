import { Module } from '@nestjs/common'
import { JobLeaseService } from './job-lease.service'

@Module({
  providers: [JobLeaseService],
  exports: [JobLeaseService],
})
export class JobLeaseModule {}
