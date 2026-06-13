import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="industrial-grid flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-teal-700 via-amber-400 to-slate-950" />
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-teal-600/15 blur-3xl" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="px-2">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-teal-700">
            Planta de carbonato de calcio
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.075em] text-slate-950 sm:text-6xl">
            Control diario de fabrica que empieza simple y escala sin friccion.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Registra gastos, ventas, produccion e inventario hoy mientras mantienes la
            arquitectura lista para maquinas, turnos, diesel y mantenimiento manana.
          </p>
          <div className="mt-6 grid max-w-xl grid-cols-3 gap-2">
            {["Ventas", "Gastos", "Produccion"].map((item) => (
              <div key={item} className="rounded-[20px] bg-white/65 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700 ring-1 ring-slate-900/5">
                {item}
              </div>
            ))}
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
