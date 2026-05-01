import { PayrollAiPanel } from "@/components/ai/payroll-ai-panel";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";

export default async function AiPayrollPage() {
  await requireSession();

  return (
    <>
      <PageHeader
        eyebrow="Captura inteligente"
        title="IA para planilla escrita"
        description="Sube una foto de la planilla manuscrita y obtén un desglose preliminar por empleado para revisarlo antes de guardarlo."
      />

      <PayrollAiPanel />
    </>
  );
}
