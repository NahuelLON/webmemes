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

    // Campo trampa para bots
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

    const botones = [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Aprobar", emoji: { name: "✅" }, custom_id: "aprobar" },
          { type: 2, style: 4, label: "Rechazar", emoji: { name: "❌" }, custom_id: "rechazar" },
        ],
      },
    ];

    const envio = new FormData();
    envio.append(
      "payload_json",
      JSON.stringify({
        content: "Nuevo meme de **" + autor + "**",
        allowed_mentions: { parse: [] },
        components: botones,
      })
    );
    envio.append("files[0]", archivo, "meme." + TIPOS[archivo.type]);

        const canalId = String(process.env.CANAL_MODERACION_ID || "").trim().split("/").pop();
    console.log("Canal usado:", canalId);
    const respuesta = await fetch(
      "https://discord.com/api/v10/channels/" + canalId + "/messages",
      
        method: "POST",
        headers: { Authorization: "Bot " + process.env.DISCORD_BOT_TOKEN },
        body: envio,
      }
    );

        if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.log("Discord respondió", respuesta.status, detalle);
      return responder({ error: "Discord rechazó el envío." }, 502);
    }
    return responder({ ok: true });
  } catch (error) {
    return responder({ error: "Error del servidor." }, 500);
  }
};

export const config = { path: "/api/subir" };
