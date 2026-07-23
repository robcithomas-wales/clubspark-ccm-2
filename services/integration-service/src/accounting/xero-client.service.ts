import { Injectable, Logger } from '@nestjs/common'

const XERO_API = 'https://api.xero.com/api.xro/2.0'

export interface XeroInvoiceInput {
  contactName: string
  contactEmail: string
  description: string
  unitAmount: number       // pounds (not pence)
  currencyCode: string
  invoiceMode: string      // 'DRAFT' | 'AUTHORISED'
  accountCode: string
  taxType?: string         // e.g. 'OUTPUT2' for 20% VAT
  reference?: string
  dueDate?: string         // YYYY-MM-DD
}

export interface XeroInvoiceResult {
  invoiceId: string
  invoiceNumber: string
  status: string
}

@Injectable()
export class XeroClientService {
  private readonly logger = new Logger(XeroClientService.name)

  private async request<T>(
    method: string,
    path: string,
    accessToken: string,
    xeroTenantId: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${XERO_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-tenant-id': xeroTenantId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Xero API ${method} ${path} failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<T>
  }

  async getOrCreateContact(
    accessToken: string,
    xeroTenantId: string,
    name: string,
    email: string,
  ): Promise<string> {
    type ContactsResponse = { Contacts: Array<{ ContactID: string }> }
    const existing = await this.request<ContactsResponse>(
      'GET',
      `/Contacts?searchTerm=${encodeURIComponent(email)}`,
      accessToken,
      xeroTenantId,
    )

    if (existing.Contacts.length > 0) {
      return existing.Contacts[0]!.ContactID
    }

    const created = await this.request<ContactsResponse>(
      'PUT',
      '/Contacts',
      accessToken,
      xeroTenantId,
      { Contacts: [{ Name: name, EmailAddress: email }] },
    )
    return created.Contacts[0]!.ContactID
  }

  async createInvoice(
    accessToken: string,
    xeroTenantId: string,
    input: XeroInvoiceInput,
  ): Promise<XeroInvoiceResult> {
    const contactId = await this.getOrCreateContact(accessToken, xeroTenantId, input.contactName, input.contactEmail)

    const lineItem: Record<string, unknown> = {
      Description: input.description,
      Quantity: 1,
      UnitAmount: input.unitAmount,
      AccountCode: input.accountCode,
    }
    if (input.taxType) lineItem['TaxType'] = input.taxType

    const invoice: Record<string, unknown> = {
      Type: 'ACCREC',
      Contact: { ContactID: contactId },
      LineItems: [lineItem],
      Status: input.invoiceMode,
      CurrencyCode: input.currencyCode,
    }
    if (input.reference) invoice['Reference'] = input.reference
    if (input.dueDate) invoice['DueDate'] = input.dueDate

    type InvoicesResponse = { Invoices: Array<{ InvoiceID: string; InvoiceNumber: string; Status: string }> }
    const res = await this.request<InvoicesResponse>('PUT', '/Invoices', accessToken, xeroTenantId, {
      Invoices: [invoice],
    })

    const created = res.Invoices[0]!
    return { invoiceId: created.InvoiceID, invoiceNumber: created.InvoiceNumber, status: created.Status }
  }

  async createCreditNote(
    accessToken: string,
    xeroTenantId: string,
    input: Omit<XeroInvoiceInput, 'invoiceMode'> & { originalInvoiceId?: string },
  ): Promise<{ creditNoteId: string }> {
    const contactId = await this.getOrCreateContact(accessToken, xeroTenantId, input.contactName, input.contactEmail)

    const lineItem: Record<string, unknown> = {
      Description: input.description,
      Quantity: 1,
      UnitAmount: input.unitAmount,
      AccountCode: input.accountCode,
    }
    if (input.taxType) lineItem['TaxType'] = input.taxType

    type CreditNotesResponse = { CreditNotes: Array<{ CreditNoteID: string }> }
    const res = await this.request<CreditNotesResponse>('PUT', '/CreditNotes', accessToken, xeroTenantId, {
      CreditNotes: [
        {
          Type: 'ACCRECCREDIT',
          Contact: { ContactID: contactId },
          LineItems: [lineItem],
          Status: 'AUTHORISED',
          CurrencyCode: input.currencyCode,
        },
      ],
    })

    return { creditNoteId: res.CreditNotes[0]!.CreditNoteID }
  }

  async getAccountCodes(accessToken: string, xeroTenantId: string) {
    type AccountsResponse = { Accounts: Array<{ Code: string; Name: string; Type: string }> }
    const res = await this.request<AccountsResponse>('GET', '/Accounts', accessToken, xeroTenantId)
    return res.Accounts.filter((a) => ['REVENUE', 'SALES', 'OTHERINCOME'].includes(a.Type)).map((a) => ({
      code: a.Code,
      name: a.Name,
    }))
  }

  async getTaxRates(accessToken: string, xeroTenantId: string) {
    type TaxRatesResponse = { TaxRates: Array<{ TaxType: string; Name: string; Status: string }> }
    const res = await this.request<TaxRatesResponse>('GET', '/TaxRates', accessToken, xeroTenantId)
    return res.TaxRates.filter((t) => t.Status === 'ACTIVE').map((t) => ({
      taxType: t.TaxType,
      name: t.Name,
    }))
  }
}
