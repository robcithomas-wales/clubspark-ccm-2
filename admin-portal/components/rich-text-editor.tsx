"use client"

import { useRef, useEffect, useCallback } from "react"
import {
  Bold,
  Italic,
  Heading2,
  Link2,
  List,
  ListOrdered,
  Minus,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

const btnCls =
  "p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message here…",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)

  // Sync external value → DOM only on mount or when externally reset
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, val)
    // Flush HTML back to parent after format
    if (editorRef.current) {
      isInternalChange.current = true
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  function handleInput() {
    if (editorRef.current) {
      isInternalChange.current = true
      onChange(editorRef.current.innerHTML)
    }
  }

  function handleLink() {
    const url = window.prompt("Enter URL:", "https://")
    if (url) exec("createLink", url)
  }

  function toggleHeading() {
    // Check if we're already in a heading
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const parent = sel.getRangeAt(0).commonAncestorContainer as Element
    const heading = (parent.nodeType === 3 ? parent.parentElement : parent)?.closest("h2")
    if (heading) {
      exec("formatBlock", "<p>")
    } else {
      exec("formatBlock", "<h2>")
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden focus-within:border-[#1857E0] focus-within:ring-1 focus-within:ring-[#1857E0]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          title="Bold (Ctrl+B)"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); exec("bold") }}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); exec("italic") }}
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          title="Heading"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); toggleHeading() }}
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          title="Bullet list"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList") }}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Numbered list"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList") }}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          title="Insert link"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); handleLink() }}
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Horizontal rule"
          className={btnCls}
          onMouseDown={(e) => { e.preventDefault(); exec("insertHorizontalRule") }}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={[
          "px-4 py-3 text-sm text-slate-900 outline-none",
          "prose prose-sm max-w-none",
          "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-2",
          "[&_a]:text-[#1857E0] [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
          "[&_hr]:border-slate-200 [&_hr]:my-3",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none",
        ].join(" ")}
      />
    </div>
  )
}
