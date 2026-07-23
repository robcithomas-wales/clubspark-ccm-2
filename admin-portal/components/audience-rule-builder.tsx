"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

export interface AudienceRule {
  field: string
  operator: string
  value: string
}

export interface AudienceRulesJson {
  logic: "and" | "or"
  rules: AudienceRule[]
}

const FIELDS = [
  { value: "membershipStatus", label: "Membership status", operators: ["eq", "neq"], type: "select", options: ["active", "expired", "pending", "cancelled"] },
  { value: "ageMin", label: "Age (minimum)", operators: ["gte"], type: "number" },
  { value: "ageMax", label: "Age (maximum)", operators: ["lte"], type: "number" },
  { value: "tag", label: "Has tag", operators: ["eq", "contains"], type: "text" },
  { value: "bookingCountMin", label: "Total bookings (minimum)", operators: ["gte"], type: "number" },
  { value: "paymentStatus", label: "Payment status", operators: ["eq", "neq"], type: "select", options: ["paid", "overdue", "pending"] },
  { value: "lifecycleStage", label: "Lifecycle stage", operators: ["eq", "neq"], type: "select", options: ["prospect", "active", "lapsed", "churned"] },
]

const OPERATOR_LABELS: Record<string, string> = {
  eq: "is",
  neq: "is not",
  gte: "≥",
  lte: "≤",
  contains: "contains",
}

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] bg-white"

function emptyRule(): AudienceRule {
  return { field: "membershipStatus", operator: "eq", value: "active" }
}

interface Props {
  value: AudienceRulesJson
  onChange: (v: AudienceRulesJson) => void
}

export function AudienceRuleBuilder({ value, onChange }: Props) {
  function setLogic(logic: "and" | "or") {
    onChange({ ...value, logic })
  }

  function addRule() {
    onChange({ ...value, rules: [...value.rules, emptyRule()] })
  }

  function removeRule(i: number) {
    onChange({ ...value, rules: value.rules.filter((_, idx) => idx !== i) })
  }

  function updateRule(i: number, patch: Partial<AudienceRule>) {
    const rules = value.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    onChange({ ...value, rules })
  }

  return (
    <div className="space-y-3">
      {/* Logic toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Match</span>
        {(["and", "or"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLogic(l)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition border ${
              value.logic === l
                ? "bg-[#1857E0] text-white border-[#1857E0]"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
            }`}
          >
            {l === "and" ? "ALL rules" : "ANY rule"}
          </button>
        ))}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {value.rules.length === 0 && (
          <p className="text-xs text-slate-400 italic">No rules yet — add one below to filter your audience.</p>
        )}

        {value.rules.map((rule, i) => {
          const fieldDef = FIELDS.find((f) => f.value === rule.field) ?? FIELDS[0]
          return (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              {i > 0 && (
                <span className="text-xs font-semibold text-slate-500 uppercase w-10 text-right">
                  {value.logic}
                </span>
              )}

              {/* Field */}
              <select
                value={rule.field}
                onChange={(e) => {
                  const newField = FIELDS.find((f) => f.value === e.target.value) ?? FIELDS[0]
                  updateRule(i, {
                    field: e.target.value,
                    operator: newField.operators[0],
                    value: newField.type === "select" ? (newField.options?.[0] ?? "") : "",
                  })
                }}
                className={inputCls}
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={rule.operator}
                onChange={(e) => updateRule(i, { operator: e.target.value })}
                className={inputCls}
              >
                {fieldDef.operators.map((op) => (
                  <option key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</option>
                ))}
              </select>

              {/* Value */}
              {fieldDef.type === "select" ? (
                <select
                  value={rule.value}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                  className={inputCls}
                >
                  {(fieldDef.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={fieldDef.type === "number" ? "number" : "text"}
                  value={rule.value}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                  min={0}
                  className={`${inputCls} w-28`}
                />
              )}

              <button
                type="button"
                onClick={() => removeRule(i)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg"
                title="Remove rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="inline-flex items-center gap-1.5 text-xs text-[#1857E0] hover:text-[#1832A8] transition"
      >
        <Plus className="h-3.5 w-3.5" />
        Add rule
      </button>
    </div>
  )
}
