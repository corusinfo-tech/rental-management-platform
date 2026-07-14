import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound(): React.ReactElement {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you requested does not exist.</p>
        <Button className="mt-6" type="button">
          <Link href="/login">Back to login</Link>
        </Button>
      </section>
    </main>
  );
}
