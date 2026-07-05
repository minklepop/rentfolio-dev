import { requireLandlord } from "@/lib/auth";
import AssistantChat from "@/components/AssistantChat";
import { PageHeader } from "@/components/ui";

export default async function AssistantPage() {
  await requireLandlord();
  return (
    <div>
      <PageHeader
        title="Ask the data"
        subtitle="Plain-English question in, a read-only SQL query out, you always see exactly what ran. Requires GEMINI_API_KEY in your environment (free key at aistudio.google.com)."
      />
      <AssistantChat />
    </div>
  );
}
