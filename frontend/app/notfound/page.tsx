import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-xl text-gray-600 dark:text-gray-300">
          Oops! The page you're looking for could not be found.
        </p>
        <Link href="/" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
}