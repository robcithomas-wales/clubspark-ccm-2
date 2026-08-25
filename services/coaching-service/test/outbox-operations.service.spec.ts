import { describe, expect, it, vi } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { OutboxOperationsService } from '../src/outbox/outbox-operations.service.js'

describe('OutboxOperationsService', () => {
  it('caps dead-letter listings and preserves tenant scope', async () => {
    const outbox = { deadLetters: vi.fn().mockResolvedValue([]) }
    await new OutboxOperationsService(outbox as never).deadLetters('tenant', 1_000)
    expect(outbox.deadLetters).toHaveBeenCalledWith('tenant', 100)
  })

  it('rejects replay when the tenant does not own an unpublished event', async () => {
    const outbox = { replay: vi.fn().mockResolvedValue(false) }
    const service = new OutboxOperationsService(outbox as never)
    await expect(service.replay('tenant', 'event')).rejects.toBeInstanceOf(NotFoundException)
  })
})
