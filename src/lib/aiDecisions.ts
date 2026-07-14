import { db } from "./db";

type LogDecisionInput = {
  userId?: string | null;
  feature: string;
  entityType?: string | null;
  entityId?: string | null;
  input: unknown;
  output: string | unknown;
  model?: string;
};

export async function logAiDecision(input: LogDecisionInput) {
  return db.aiDecision.create({
    data: {
      userId: input.userId ?? null,
      feature: input.feature,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      inputJson: JSON.stringify(input.input),
      outputText: typeof input.output === "string" ? input.output : JSON.stringify(input.output),
      model: input.model ?? process.env.ASSISTANT_MODEL ?? "gemini-2.5-flash",
    },
  });
}
