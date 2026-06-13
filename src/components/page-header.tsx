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
    <div className="control-ruler overflow-hidden rounded-[30px] bg-white/45 px-4 pb-4 pt-5 ring-1 ring-slate-900/5 backdrop-blur sm:px-5">
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <div className="mt-3 min-w-0">
        <h2 className="text-3xl font-black tracking-[-0.055em] text-slate-950 sm:text-4xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
