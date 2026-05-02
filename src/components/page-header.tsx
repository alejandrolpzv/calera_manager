import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
