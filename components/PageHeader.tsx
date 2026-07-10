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
      <div className="rise flex items-baseline gap-3">
        <span className="jp text-3xl text-accent">{jp}</span>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <p
        className="rise mt-1 text-sm text-muted"
        style={{ "--rise-delay": "0.08s" } as React.CSSProperties}
      >
        {subtitle}
      </p>
    </header>
  );
}
