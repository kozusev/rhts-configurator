import { loginAction } from "../auth-actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 p-4">
      <form action={loginAction} className="card w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RHTS" className="mx-auto mb-4 h-10 w-auto" />
          <h1 className="text-xl font-bold">Admin panel</h1>
          <p className="text-sm text-slate-400">Sign in to manage the configurator</p>
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="field" autoComplete="username" autoFocus />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" className="field" autoComplete="current-password" />
        </div>
        {searchParams.error && <p className="text-sm text-red-400">Incorrect email or password.</p>}
        <button type="submit" className="btn-primary w-full">Sign in</button>
      </form>
    </div>
  );
}
