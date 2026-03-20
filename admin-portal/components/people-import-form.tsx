"use client"

import { useRef, useState } from "react"
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react"

type ParsedRow = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  addressLine1?: string
  city?: string
  postcode?: string
}

type ImportResult = { created: number; skipped: number; errors: number }

const REQUIRED_HEADERS = ["firstName", "lastName"]
const OPTIONAL_HEADERS = ["email", "phone", "addressLine1", "city", "postcode"]
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]

// Normalise common CSV header variants to our field names
const HEADER_ALIASES: Record<string, string> = {
  "first name": "firstName",
  "first_name": "firstName",
  "firstname": "firstName",
  "last name": "lastName",
  "last_name": "lastName",
  "lastname": "lastName",
  "email address": "email",
  "email_address": "email",
  "mobile": "phone",
  "telephone": "phone",
  "phone number": "phone",
  "address": "addressLine1",
  "address line 1": "addressLine1",
  "address_line_1": "addressLine1",
  "town": "city",
  "town/city": "city",
  "post code": "postcode",
  "post_code": "postcode",
  "zip": "postcode",
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h.toLowerCase()] ?? h)

  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { if (values[i]) row[h] = values[i] })
    return row
  })

  return { headers, rows }
}

function rowsToDto(rows: Record<string, string>[]): ParsedRow[] {
  return rows
    .filter((r) => r.firstName?.trim() && r.lastName?.trim())
    .map((r) => ({
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      email: r.email?.trim() || undefined,
      phone: r.phone?.trim() || undefined,
      addressLine1: r.addressLine1?.trim() || undefined,
      city: r.city?.trim() || undefined,
      postcode: r.postcode?.trim() || undefined,
    }))
}

export function PeopleImportForm() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  function handleFile(file: File) {
    setParseError(null)
    setResult(null)
    setImportError(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)

      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
      if (missing.length > 0) {
        setParseError(
          `CSV is missing required columns: ${missing.join(", ")}. ` +
          `Expected headers: firstName, lastName (plus optional: email, phone, addressLine1, city, postcode).`
        )
        setParsed(null)
        return
      }

      const dtos = rowsToDto(rows)
      if (dtos.length === 0) {
        setParseError("No valid rows found. Each row needs at least a firstName and lastName.")
        setParsed(null)
        return
      }
      setParsed(dtos)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      })
      const json = await res.json()
      if (!res.ok) { setImportError(json?.error ?? `Error ${res.status}`); return }
      setResult(json)
      setParsed(null)
      setFileName("")
    } catch (e: any) {
      setImportError(e?.message ?? "Unknown error")
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setParsed(null)
    setFileName("")
    setParseError(null)
    setResult(null)
    setImportError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-6">
      {/* Template hint */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Expected CSV format</p>
        <p className="mt-1 font-mono text-xs text-slate-500">
          firstName,lastName,email,phone,addressLine1,city,postcode
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Only <span className="font-medium">firstName</span> and <span className="font-medium">lastName</span> are required.
          Rows where email already exists will be skipped (no duplicates).
        </p>
      </div>

      {/* Drop zone */}
      {!parsed && !result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center transition hover:border-[#1857E0]/40"
        >
          <Upload className="h-8 w-8 text-slate-300" />
          <div>
            <p className="text-sm font-medium text-slate-700">Drop a CSV file here, or</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-1 text-sm font-medium text-[#1857E0] hover:underline"
            >
              browse to upload
            </button>
          </div>
          {fileName && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              <FileText className="h-3.5 w-3.5" />
              {fileName}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-rose-700">{parseError}</p>
            <button onClick={reset} className="mt-1 text-xs text-rose-600 hover:underline">Try a different file</button>
          </div>
        </div>
      )}

      {/* Preview table */}
      {parsed && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{parsed.length} rows ready to import</p>
              <p className="text-xs text-slate-500 mt-0.5">{fileName}</p>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {ALL_HEADERS.map((h) => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    {ALL_HEADERS.map((h) => (
                      <td key={h} className="px-4 py-2.5 text-slate-700">
                        {(row as any)[h] ?? <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.length > 10 && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Showing first 10 of {parsed.length} rows.
            </p>
          )}
          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${parsed.length} contacts`}
            </button>
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          {importError && (
            <p className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">{importError}</p>
          )}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">Import complete</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
              <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
              <div className="text-xs text-slate-500 mt-0.5">Created</div>
            </div>
            <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
              <div className="text-2xl font-bold text-slate-500">{result.skipped}</div>
              <div className="text-xs text-slate-500 mt-0.5">Skipped</div>
            </div>
            <div className="rounded-xl bg-white px-3 py-3 shadow-sm">
              <div className={`text-2xl font-bold ${result.errors > 0 ? "text-rose-600" : "text-slate-300"}`}>{result.errors}</div>
              <div className="text-xs text-slate-500 mt-0.5">Errors</div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <a href="/people" className="text-sm font-medium text-emerald-700 hover:underline">View all contacts</a>
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">Import another file</button>
          </div>
        </div>
      )}
    </div>
  )
}
