import {
  getActiveModels,
  getAllGatewayModels,
  getCapabilities,
  isDemo,
} from "@/lib/ai/models";

export async function GET() {
  const headers = {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  };

  const activeModels = getActiveModels();
  const allCapabilities = await getCapabilities();
  const curatedCapabilities = Object.fromEntries(
    activeModels.map((model) => [model.id, allCapabilities[model.id]])
  );

  if (isDemo) {
    const curatedIds = new Set(activeModels.map((model) => model.id));
    const gatewayModels = await getAllGatewayModels();
    const models = [
      ...activeModels,
      ...gatewayModels.filter((model) => !curatedIds.has(model.id)),
    ];
    const capabilities = Object.fromEntries(
      models.map((model) => [
        model.id,
        "capabilities" in model
          ? model.capabilities
          : curatedCapabilities[model.id],
      ])
    );

    return Response.json({ capabilities, models }, { headers });
  }

  return Response.json(
    { capabilities: curatedCapabilities, models: activeModels },
    { headers }
  );
}
