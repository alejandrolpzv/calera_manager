import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="industrial-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.15),transparent_32%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.12),transparent_28%)]" />
      <div className="relative z-10 flex w-full max-w-5xl flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-teal-700">
            Planta de carbonato de calcio
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Control diario de fabrica que empieza simple y escala sin friccion.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Registra gastos, ventas, produccion e inventario hoy mientras mantienes la
            arquitectura lista para maquinas, turnos, diesel y mantenimiento manana.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
