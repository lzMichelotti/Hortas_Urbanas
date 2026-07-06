import { Camera, MediaTypeSelection } from "@capacitor/camera"
import imageCompression from "browser-image-compression"

export const MAX_FOTOS = 3
export const CONTENT_TYPE = "image/jpeg" as const

const COMPRESSAO = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1280,
  initialQuality: 0.7,
  useWebWorker: true,
  fileType: CONTENT_TYPE,
}

async function garantirPermissao(tipo: "camera" | "photos") {
  try {
    const atual = await Camera.checkPermissions()
    if (atual[tipo] === "granted" || atual[tipo] === "limited") return
    const novo = await Camera.requestPermissions({ permissions: [tipo] })
    if (novo[tipo] === "granted" || novo[tipo] === "limited") return
    throw new Error(tipo === "camera" ? "Permissão de câmera negada." : "Permissão de galeria negada.")
  } catch (e) {
    if (e instanceof Error && /not implemented|unavailable/i.test(e.message)) return
    throw e
  }
}

async function paraArquivo(webPath: string): Promise<File> {
  const blob = await (await fetch(webPath)).blob()
  return imageCompression(new File([blob], "foto", { type: blob.type || CONTENT_TYPE }), COMPRESSAO)
}

export async function escolherDaGaleria(limite = MAX_FOTOS): Promise<File[]> {
  await garantirPermissao("photos")
  const { results } = await Camera.chooseFromGallery({
    mediaType: MediaTypeSelection.Photo,
    allowMultipleSelection: true,
    limit: limite,
    webUseInput: true,
  })
  const caminhos = results.map((r) => r.webPath).filter((p): p is string => Boolean(p))
  return Promise.all(caminhos.map(paraArquivo))
}

export async function tirarFoto(): Promise<File> {
  await garantirPermissao("camera")
  const foto = await Camera.takePhoto({
    quality: 80,
    targetWidth: 1280,
    targetHeight: 1280,
    webUseInput: true,
  })
  if (!foto.webPath) throw new Error("Não foi possível obter a foto.")
  return paraArquivo(foto.webPath)
}
