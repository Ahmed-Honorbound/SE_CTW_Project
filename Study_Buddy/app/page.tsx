import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50 text-gray-900">
      <nav className="flex items-center justify-between px-8 py-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-purple-700">
          Study Buddy
        </h1>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-purple-300 px-5 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-8 py-20 text-center">
        <p className="mb-4 rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
          Stay organized. Study smarter.
        </p>

        <h2 className="max-w-4xl text-5xl font-extrabold leading-tight md:text-6xl">
          Your all-in-one student planner for tasks, deadlines, and success.
        </h2>

        <p className="mt-6 max-w-2xl text-lg text-gray-600">
          Study Buddy helps students stay on top of assignments, manage time
          better, and keep school life organized in one place.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full bg-pink-600 px-7 py-3 text-base font-semibold text-white shadow-md transition hover:bg-pink-700"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-7 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-8 pb-20">
        <h3 className="mb-10 text-center text-3xl font-bold text-purple-800">
          Why students love Study Buddy
        </h3>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-pink-100 bg-white p-8 shadow-sm">
            <h4 className="mb-3 text-xl font-semibold text-pink-700">
              Track Assignments
            </h4>
            <p className="text-gray-600">
              Keep all your homework, quizzes, projects, and due dates in one
              simple place.
            </p>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm">
            <h4 className="mb-3 text-xl font-semibold text-purple-700">
              Stay Focused
            </h4>
            <p className="text-gray-600">
              Organize your responsibilities so you can study with less stress
              and more confidence.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-sm">
            <h4 className="mb-3 text-xl font-semibold text-blue-700">
              Build Better Habits
            </h4>
            <p className="text-gray-600">
              Create a better routine by seeing what needs to be done and when
              it is due.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 px-8 py-6 text-center text-sm text-gray-500">
        © 2026 Study Buddy. Designed for students who want to stay ahead.
      </footer>
    </main>
  );
}