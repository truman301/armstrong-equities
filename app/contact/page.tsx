export const metadata = {
  title: 'Contact',
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Get in touch
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Contact
      </h2>
      <p className="mt-5 text-[17px] leading-relaxed text-ink-mute">
        Research correspondence, sector suggestions, and expert-network introductions
        are all welcome.
      </p>

      <div className="mt-14 border-t border-divider pt-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">Email</p>
        <p className="mt-3 font-mono text-lg">
          <a
            href="mailto:truman301@gmail.com"
            className="text-accent underline decoration-from-font underline-offset-[6px] hover:no-underline"
          >
            truman301@gmail.com
          </a>
        </p>
      </div>

      <div className="mt-10 border-t border-divider pt-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Analyst
        </p>
        <p className="mt-3 text-lg">Truman Armstrong</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-mute">
          Wharton &apos;26. Previously equity research, trading, and investment banking
          internships.
        </p>
      </div>
    </div>
  )
}
