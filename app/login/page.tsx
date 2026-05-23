import LoginForm from './login-form'

export const metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            Armstrong Equities
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-ink-mute">
            Sign in to continue
          </p>
        </div>
        <div className="mt-10 border border-divider bg-paper-dim/30 p-8 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.25em] text-ink-soft">
          Private research firm. Invite only.
        </p>
      </div>
    </div>
  )
}
