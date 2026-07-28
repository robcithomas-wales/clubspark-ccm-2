import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'
import type { XeroInvoiceInput, XeroInvoiceResult } from './xero-client.service.js'

// QuickBooks uses realmId (company ID) as part of the URL
@Injectable()
export class QuickBooksClientService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private baseUrl(realmId: string): string {
    const env = this.config.get('quickbooks', { infer: true }).environment
    return env === 'production'
      ? `https://quickbooks.api.intuit.com/v3/company/${realmId}`
      : `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`
  }

  private async request<T>(
    method: string,
    url: string,
    accessToken: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`QuickBooks API ${method} ${url} failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<T>
  }

  private async queryEntity<T>(accessToken: string, realmId: string, query: string): Promise<T[]> {
    type QBQueryResponse = { QueryResponse: Record<string, T[]> }
    const url = `${this.baseUrl(realmId)}/query?query=${encodeURIComponent(query)}&minorversion=65`
    const res = await this.request<QBQueryResponse>('GET', url, accessToken)
    const key = Object.keys(res.QueryResponse)[0]
    return (key ? res.QueryResponse[key] : []) ?? []
  }

  async getOrCreateCustomer(
    accessToken: string,
    realmId: string,
    name: string,
    email: string,
  ): Promise<string> {
    type Customer = { Id: string }
    // Escape backslashes then single quotes so a crafted email cannot break out of
    // the quoted literal in the QuickBooks query (QBQL escapes with a backslash).
    const safeEmail = email.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const existing = await this.queryEntity<Customer>(
      accessToken,
      realmId,
      `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${safeEmail}' MAXRESULTS 1`,
    )
    if (existing.length > 0) return existing[0]!.Id

    type CustomerResponse = { Customer: { Id: string } }
    const res = await this.request<CustomerResponse>(
      'POST',
      `${this.baseUrl(realmId)}/customer?minorversion=65`,
      accessToken,
      { DisplayName: name, PrimaryEmailAddr: { Address: email } },
    )
    return res.Customer.Id
  }

  async createInvoice(
    accessToken: string,
    realmId: string,
    input: XeroInvoiceInput,
  ): Promise<XeroInvoiceResult> {
    const customerId = await this.getOrCreateCustomer(accessToken, realmId, input.contactName, input.contactEmail)

    const lineItem: Record<string, unknown> = {
      Description: input.description,
      Amount: input.unitAmount,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        UnitPrice: input.unitAmount,
        Qty: 1,
        ItemAccountRef: { value: input.accountCode },
      },
    }

    const invoice: Record<string, unknown> = {
      CustomerRef: { value: customerId },
      Line: [lineItem],
      CurrencyRef: { value: input.currencyCode },
    }
    if (input.reference) invoice['DocNumber'] = input.reference

    type InvoiceResponse = { Invoice: { Id: string; DocNumber: string; TxnStatus?: string } }
    const res = await this.request<InvoiceResponse>(
      'POST',
      `${this.baseUrl(realmId)}/invoice?minorversion=65`,
      accessToken,
      invoice,
    )

    const created = res.Invoice
    return {
      invoiceId: created.Id,
      invoiceNumber: created.DocNumber ?? created.Id,
      status: created.TxnStatus ?? 'Open',
    }
  }

  async createCreditMemo(
    accessToken: string,
    realmId: string,
    input: Omit<XeroInvoiceInput, 'invoiceMode'>,
  ): Promise<{ creditNoteId: string }> {
    const customerId = await this.getOrCreateCustomer(accessToken, realmId, input.contactName, input.contactEmail)

    type CreditMemoResponse = { CreditMemo: { Id: string } }
    const res = await this.request<CreditMemoResponse>(
      'POST',
      `${this.baseUrl(realmId)}/creditmemo?minorversion=65`,
      accessToken,
      {
        CustomerRef: { value: customerId },
        Line: [
          {
            Description: input.description,
            Amount: input.unitAmount,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              UnitPrice: input.unitAmount,
              Qty: 1,
              ItemAccountRef: { value: input.accountCode },
            },
          },
        ],
        CurrencyRef: { value: input.currencyCode },
      },
    )
    return { creditNoteId: res.CreditMemo.Id }
  }

  async getAccountCodes(accessToken: string, realmId: string) {
    type Account = { Id: string; Name: string; AccountType: string }
    const accounts = await this.queryEntity<Account>(
      accessToken,
      realmId,
      "SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 100",
    )
    return accounts.map((a) => ({ code: a.Id, name: a.Name }))
  }

  async getTaxCodes(accessToken: string, realmId: string) {
    type TaxCode = { Id: string; Name: string; Active: boolean }
    const codes = await this.queryEntity<TaxCode>(
      accessToken,
      realmId,
      'SELECT * FROM TaxCode MAXRESULTS 100',
    )
    return codes.filter((t) => t.Active).map((t) => ({ taxType: t.Id, name: t.Name }))
  }
}
