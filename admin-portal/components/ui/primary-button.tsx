import { ButtonHTMLAttributes } from "react"

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        "inline-flex items-center rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1832A8]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  )
}