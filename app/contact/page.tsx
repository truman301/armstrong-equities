import ContactForm from './contact-form'

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

      <div className="mt-12">
        <ContactForm />
      </div>
    </div>
  )
}
