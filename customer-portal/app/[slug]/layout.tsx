import { notFound } from "next/navigation"
import { OrgProvider } from "@/lib/org-context"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { SideNav } from "@/components/side-nav"
import { fetchOrgBySlug } from "@/lib/api"

// Google Fonts URL for a given font name
function googleFontUrl(font: string | null): string | null {
  if (!font || font === "Inter") return null
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800&display=swap`
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const org = await fetchOrgBySlug(slug)
  if (!org) notFound()

  const headingFontUrl = googleFontUrl(org.headingFont)
  const bodyFontUrl = googleFontUrl(org.bodyFont)

  const headingFamily = org.headingFont ?? "Inter"
  const bodyFamily = org.bodyFont ?? "Inter"

  return (
    <OrgProvider org={org}>
      {/* Favicon */}
      {org.faviconUrl && <link rel="icon" href={org.faviconUrl} />}

      {/* Inject selected fonts */}
      {headingFontUrl && <link rel="stylesheet" href={headingFontUrl} />}
      {bodyFontUrl && bodyFontUrl !== headingFontUrl && <link rel="stylesheet" href={bodyFontUrl} />}

      {/* CSS variables for font + colour theming */}
      <style>{`
        :root {
          --font-heading: '${headingFamily}', system-ui, sans-serif;
          --font-body: '${bodyFamily}', system-ui, sans-serif;
          --colour-primary: ${org.primaryColour};
          --colour-secondary: ${org.secondaryColour ?? org.primaryColour};
        }
        body { font-family: var(--font-body); }
        h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
      `}</style>

      {org.portalTemplate === "club" ? (
        /* ── Club template: fixed sidebar + scrollable content area ── */
        <div className="flex min-h-screen bg-slate-50">
          <SideNav />
          {/* Offset for desktop sidebar (w-60 = 240px) and mobile top bar (h-14) */}
          <div className="flex flex-1 flex-col lg:ml-60">
            <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
              {children}
            </main>
            {/* Slim footer for club template */}
            <footer className="mt-auto border-t border-slate-200 px-4 py-4 lg:px-8">
              <p className="text-xs text-slate-400">© {new Date().getFullYear()} {org.name}</p>
            </footer>
          </div>
        </div>
      ) : (
        /* ── Bold template: top nav + full-width content + footer ── */
        <div className="flex min-h-screen flex-col">
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      )}
    </OrgProvider>
  )
}
