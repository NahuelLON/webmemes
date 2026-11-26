import { createPublicKey, verify } from "node:crypto";

function responder(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  });
}

// Comprueba que la petición viene realmente de Discord
function firmaValida(cuerpo, firma, marca, clavePublica) {
  const prefijo = Buffer.from("302a300506032b6570032100", "hex");
  const clave = createPublicKey({
    key: Buffer.concat([prefijo, Buffer.from(clavePublica, "hex")]),
    format: "der",
    type: "spki",
  });
  return verify(null, Buffer.from(marca + cuerpo), clave, Buffer.from(firma, "hex"));
}

export default async (req) => {
  const cuerpo = await req.text();
  const firma = req.headers.get("x-signature-ed25519");
  const marca = req.headers.get("x-signature-timestamp");

  let valida = false;
  try {
    valida = firmaValida(cuerpo, firma, marca, process.env.DISCORD_PUBLIC_KEY);
  } catch (e) {
    valida = false;
  }
  if (!valida) return new Response("Firma inválida", { status: 401 });

  const inter = JSON.parse(cuerpo);

  // Discord comprueba que el enlace funciona
  if (inter.type === 1) return responder({ type: 1 });

  // Clic en un botón
  if (inter.type === 3) {
    const accion = inter.data.custom_id;
    const mensaje = inter.message;
    const quien = inter.member && inter.member.user ? inter.member.user.id : "";

    if (accion === "aprobar") {
      const adjunto = mensaje.attachments && mensaje.attachments[0];
      if (!adjunto) {
        return responder({ type: 4, data: { content: "No encuentro la imagen.", flags: 64 } });
      }

      const imagen = await fetch(adjunto.url);
      const archivo = await imagen.blob();

      const envio = new FormData();
      envio.append(
        "payload_json",
        JSON.stringify({
          content: mensaje.content.replace("Nuevo meme de", "Meme de"),
          allowed_mentions: { parse: [] },
        })
      );
      envio.append("files[0]", archivo, adjunto.filename);

      const r = await fetch(process.env.DISCORD_WEBHOOK_PUBLICO, {
        method: "POST",
        body: envio,
      });
      if (!r.ok) {
        return responder({ type: 4, data: { content: "No se pudo publicar el meme.", flags: 64 } });
      }
    }

    const sello = accion === "aprobar" ? "✅ Aprobado" : "❌ Rechazado";
    return responder({
      type: 7,
      data: {
        content: mensaje.content + "\n" + sello + " por <@" + quien + ">",
        components: [],
        allowed_mentions: { parse: [] },
      },
    });
  }

  return responder({ error: "No soportado" }, 400);
};

export const config = { path: "/api/interacciones" };
