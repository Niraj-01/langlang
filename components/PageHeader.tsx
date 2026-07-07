export function PageHeader({
  title,
  jp,
  subtitle,
}: {
  title: string;
  jp: string;
  subtitle: string;
}) {
  return (
    <header className="px-4 pb-4 pt-6">
      <div className="flex items-baseline gap-3">
        <span className="jp text-3xl text-accent">{jp}</span>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </header>
  );
}
