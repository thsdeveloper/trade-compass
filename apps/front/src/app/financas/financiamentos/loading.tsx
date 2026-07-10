import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/organisms/PageShell';

export default function FinanciamentosLoading() {
  return (
    <PageShell
      title="Financiamentos"
      description="Gerencie seus financiamentos imobiliarios"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[280px] rounded-lg" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
