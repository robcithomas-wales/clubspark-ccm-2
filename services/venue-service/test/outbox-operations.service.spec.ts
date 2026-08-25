import { describe, expect, it, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { OutboxOperationsService } from '../src/outbox/outbox-operations.service.js'

describe('OutboxOperationsService', () => {
  it('reports tenant-scoped pending age and dead letters', async () => {
    const oldestPendingAt = new Date(Date.now() - 5_000)
    const outbox = {
      operationalStatus: vi
        .fn()
        .mockResolvedValue({ pending: 2, deadLettered: 1, oldestPendingAt }),
    }
    const result = await new OutboxOperationsService(outbox as never).status('tenant')
    expect(outbox.operationalStatus).toHaveBeenCalledWith('tenant')
    expect(result.oldestPendingAgeSeconds).toBeGreaterThanOrEqual(5)
  })

  it('rejects replay when the tenant does not own an unpublished event', async () => {
    const outbox = { replay: vi.fn().mockResolvedValue(false) }
    const service = new OutboxOperationsService(outbox as never)
    await expect(service.replay('tenant', 'event')).rejects.toBeInstanceOf(NotFoundException)
  })
})
