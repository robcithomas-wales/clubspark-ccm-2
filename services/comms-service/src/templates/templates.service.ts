import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { SYSTEM_TEMPLATES } from './seed/system-templates.seed.js'

export interface RenderedTemplate {
  subject: string
  htmlBody: string
  smsBody?: string
  replyTo?: string
  fromName?: string
}

/**
 * Template Service
 * ─────────────────
 * Resolves and renders templates with variable substitution.
 *
 * Resolution order:
 *   1. Tenant-specific override (allows orgs to customise system templates)
 *   2. Global system template (seeded at startup)
 *   3. In-memory seed (fallback if DB unavailable)
 *
 * Variable substitution uses a simple {{variableName}} syntax.
 * In production, consider switching to a proper templating engine (Handlebars / MJML)
 * for rich HTML layouts:
 *   TODO: npm install handlebars mjml
 *   import mjml2html from 'mjml'
 *   import Handlebars from 'handlebars'
 *   const { html } = mjml2html(Handlebars.compile(template.bodyTemplate)(variables))
 */
@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Seed system templates on startup — idempotent (find-or-create per key) */
  async seedSystemTemplates(): Promise<void> {
    for (const tpl of SYSTEM_TEMPLATES) {
      const existing = await this.prisma.write.template.findFirst({
        where: { key: tpl.key, tenantId: null, isSystem: true },
      })
      if (existing) {
        await this.prisma.write.template.update({
          where: { id: existing.id },
          data: {
            name: tpl.name,
            subjectTemplate: tpl.subjectTemplate,
            bodyTemplate: tpl.bodyTemplate,
            smsTemplate: tpl.smsTemplate,
            variables: tpl.variables,
          },
        })
      } else {
        await this.prisma.write.template.create({
          data: {
            key: tpl.key,
            name: tpl.name,
            channel: tpl.channel,
            isSystem: true,
            subjectTemplate: tpl.subjectTemplate,
            bodyTemplate: tpl.bodyTemplate,
            smsTemplate: tpl.smsTemplate,
            variables: tpl.variables,
          },
        })
      }
    }
    this.logger.log(`Seeded ${SYSTEM_TEMPLATES.length} system templates`)
  }

  async render(
    tenantId: string,
    templateKey: string,
    variables: Record<string, string | number | undefined>,
  ): Promise<RenderedTemplate> {
    // Resolve: tenant-specific → global system → in-memory fallback
    const tpl =
      (await this.prisma.read.template.findFirst({
        where: { tenantId, key: templateKey, isActive: true },
      })) ??
      (await this.prisma.read.template.findFirst({
        where: { tenantId: null, key: templateKey, isSystem: true, isActive: true },
      })) ??
      SYSTEM_TEMPLATES.find((t) => t.key === templateKey)

    if (!tpl) {
      throw new NotFoundException(`No template found for key: ${templateKey}`)
    }

    const vars = this.stringifyVars(variables)

    const subject = tpl.subjectTemplate ? this.interpolate(tpl.subjectTemplate, vars) : ''
    const bodyCore = tpl.bodyTemplate ? this.interpolate(tpl.bodyTemplate, vars) : ''
    const customFooter = (tpl as { customFooter?: string }).customFooter ?? ''
    const htmlBody = this.wrapHtml(bodyCore, customFooter)
    const smsBody = tpl.smsTemplate ? this.interpolate(tpl.smsTemplate, vars) : undefined

    return {
      subject,
      htmlBody,
      smsBody,
      replyTo: (tpl as { replyTo?: string }).replyTo ?? undefined,
      fromName: (tpl as { fromName?: string }).fromName ?? undefined,
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.read.template.findMany({
      where: { OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      orderBy: { key: 'asc' },
    })
  }

  async updateCustomisation(
    tenantId: string,
    key: string,
    data: { customFooter?: string; replyTo?: string; isActive?: boolean },
  ) {
    // Verify a base system template exists for this key
    const base = await this.prisma.read.template.findFirst({
      where: { key, isSystem: true, tenantId: null },
    })
    if (!base) throw new NotFoundException(`Template key not found: ${key}`)

    // Upsert a tenant-level record that overrides the system template
    return this.prisma.write.template.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: data,
      create: {
        tenantId,
        key,
        name: base.name,
        channel: base.channel,
        isSystem: false,
        ...data,
      },
    })
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
  }

  private stringifyVars(vars: Record<string, string | number | undefined>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, v !== undefined ? String(v) : '']),
    )
  }

  /**
   * Minimal branded HTML wrapper.
   * TODO: replace with MJML template for responsive, fully-branded email layouts.
   * See: https://documentation.mjml.io/
   */
  private wrapHtml(body: string, footer: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .header { background: #1857E0; padding: 24px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; }
  .body { padding: 32px; line-height: 1.6; }
  .footer { padding: 16px 32px; background: #f1f5f9; font-size: 12px; color: #64748b; }
  .footer p { margin: 4px 0; }
  a { color: #1857E0; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>ClubSpark</h1></div>
    <div class="body">${body}</div>
    <div class="footer">
      ${footer ? `<p>${footer}</p>` : ''}
      <p>You are receiving this email because you have an account with this organisation.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  }
}
