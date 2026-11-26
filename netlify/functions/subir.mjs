const TIPOS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

function responder(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return responder({ error: "Método no permitido" }, 405);
  }

  try {
    const form = await req.formData();

    // Campo trampa para bots: si viene relleno, fingimos que todo va bien.
    if (form.get("web")) return responder({ ok: true });

    const archivo = form.get("meme");
    const autor = String(form.get("autor") || "Anónimo").slice(0, 40);

    if (!archivo || typeof archivo === "string") {
      return responder({ error: "Falta la imagen." }, 400);
    }
    if (!TIPOS[archivo.type]) {
      return responder({ error: "Solo PNG, JPG, GIF o WEBP." }, 400);
    }
    if (archivo.size > 5 * 1024 * 1024) {
      return responder({ error: "La imagen pesa más de 5 MB." }, 400);
    }

    const envio = new FormData();
    envio.append(
      "payload_json",
      JSON.stringify({
        content: "Nuevo meme de **" + autor + "**",
        allowed_mentions: { parse: [] }, // evita que alguien haga @everyone
      })
    );
    envio.append("files[0]", archivo, "meme." + TIPOS[archivo.type]);

    const respuesta = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: envio,
    });

    if (!respuesta.ok) {
      return responder({ error: "Discord rechazó el envío." }, 502);
    }
    return responder({ ok: true });
  } catch (error) {
    return responder({ error: "Error del servidor." }, 500);
  }
};

export const config = { path: "/api/subir" };