import { getAdminContext } from "@/lib/admin";
import { NextResponse } from "next/server";

// Salva o checklist no evento para sincronizá-lo entre celular e computador.
export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const items = Array.isArray(body.items)
    ? body.items
        .filter(
          (item: unknown): item is string =>
            typeof item === "string" && item.length <= 100,
        )
        .slice(0, 100)
    : null;

  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !items)
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const { error } = await context.database
    .from("events")
    .update({ shopping_checked: [...new Set(items)] })
    .eq("id", eventId)
    .eq("owner_id", context.user.id);

  return error
    ? NextResponse.json(
        { message: "Não foi possível salvar a lista." },
        { status: 500 },
      )
    : NextResponse.json({ message: "Lista atualizada." });
}
