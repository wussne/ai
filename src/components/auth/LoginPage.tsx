import {useState, type FormEvent} from 'react';
import {ArrowRight, LoaderCircle, LockKeyhole, Zap} from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({onLogin}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось выполнить вход',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden overflow-hidden bg-slate-950 p-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold tracking-tight">Бизнес-ИИ</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Enterprise</div>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <LockKeyhole className="h-6 w-6 text-slate-300" />
          </div>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight">
            Рабочее пространство бизнес-процессов
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-400">
            Анализируйте процессы, формируйте регламенты и сохраняйте результаты в едином защищённом пространстве.
          </p>
        </div>

        <p className="text-xs text-slate-600">Доступ только для сотрудников организации</p>
      </section>

      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-bold">Бизнес-ИИ</span>
          </div>

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Вход в систему</h2>
            <p className="text-sm text-slate-500">Используйте корпоративную учётную запись.</p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="b2b-label">Email</span>
              <input
                className="b2b-input h-11"
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.ru"
              />
            </label>

            <label className="block">
              <span className="b2b-label">Пароль</span>
              <input
                className="b2b-input h-11"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
              />
            </label>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="b2b-button-primary h-11 w-full"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Войти
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
