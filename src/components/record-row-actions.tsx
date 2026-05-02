"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { startTransition, useRef, useState } from "react";

type RecordRowActionsProps = {
  editId: string;
  deleteEndpoint?: string;
  editBasePath?: string;
  hideDelete?: boolean;
};

export function RecordRowActions({
  editId,
  deleteEndpoint,
  editBasePath,
  hideDelete = false,
}: RecordRowActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const deletingRef = useRef(false);

  const params = new URLSearchParams(searchParams.toString());
  params.set("edit", editId);
  const editHref = `${editBasePath || pathname}?${params.toString()}`;

  async function onDelete() {
    if (deletingRef.current) {
      return;
    }

    if (!deleteEndpoint) {
      return;
    }

    const confirmed = window.confirm("¿Seguro que quieres eliminar este registro?");

    if (!confirmed) {
      return;
    }

    deletingRef.current = true;
    setLoading(true);

    const response = await fetch(deleteEndpoint, {
      method: "DELETE",
    });

    setLoading(false);
    deletingRef.current = false;

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "No se pudo eliminar." }));
      window.alert(result.error || "No se pudo eliminar.");
      return;
    }

    setDeleted(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextParams.get("edit") === editId) {
      nextParams.delete("edit");
    }

    router.replace(
      nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname,
    );
    startTransition(() => router.refresh());
  }

  if (deleted) {
    return <p className="mt-3 text-sm font-semibold text-teal-700">Registro eliminado.</p>;
  }

  return (
    <div className="mt-3 flex gap-2">
      <Link
        href={editHref}
        className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        <Pencil className="mr-1 h-4 w-4" />
        Editar
      </Link>
      {!hideDelete && deleteEndpoint ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={loading}
          className="inline-flex items-center rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {loading ? "Eliminando..." : "Eliminar"}
        </button>
      ) : null}
    </div>
  );
}
