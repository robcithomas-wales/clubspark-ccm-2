import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service.js'

export interface JobLease {
  jobName: string
  ownerId: string
}

@Injectable()
export class JobLeaseService {
  constructor(private readonly prisma: PrismaService) {}

  async tryAcquire(jobName: string, leaseSeconds: number): Promise<JobLease | null> {
    const ownerId = randomUUID()
    const rows = await this.prisma.write.$queryRaw<{ jobName: string }[]>`
      INSERT INTO analytics.scheduled_job_leases AS lease (job_name, owner_id, lease_until)
      VALUES (${jobName}, ${ownerId}, now() + make_interval(secs => ${leaseSeconds}))
      ON CONFLICT (job_name) DO UPDATE
      SET owner_id = EXCLUDED.owner_id,
          lease_until = EXCLUDED.lease_until,
          updated_at = now()
      WHERE lease.lease_until <= now()
      RETURNING job_name AS "jobName"
    `
    return rows.length === 1 ? { jobName, ownerId } : null
  }

  async release(lease: JobLease): Promise<void> {
    await this.prisma.write.$executeRaw`
      DELETE FROM analytics.scheduled_job_leases
      WHERE job_name = ${lease.jobName} AND owner_id = ${lease.ownerId}
    `
  }
}
