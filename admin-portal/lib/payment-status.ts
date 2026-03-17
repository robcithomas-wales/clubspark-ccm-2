export type PaymentStatus = "free" | "paid" | "unpaid" | "refunded" | "pending"

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  free: "Free",
  paid: "Paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
  pending: "Request sent",
}

export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  free: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  unpaid: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  refunded: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  pending: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
}

export function getPaymentStatusClasses(status?: string | null) {
  return PAYMENT_STATUS_CLASSES[(status as PaymentStatus) ?? "unpaid"] ?? PAYMENT_STATUS_CLASSES.unpaid
}

export function getPaymentStatusLabel(status?: string | null) {
  return PAYMENT_STATUS_LABELS[(status as PaymentStatus) ?? "unpaid"] ?? (status || "Unpaid")
}
