import { useState } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { CONTENT_TYPE } from "@/features/forum/fotos"
import type { components } from "@/lib/api/schema"

type PostCreate = components["schemas"]["PostCreate"]
type RespostaCreate = components["schemas"]["RespostaCreate"]
type Feed = components["schemas"]["FeedRead"]
type Detalhe = components["schemas"]["PostDetalhe"]
type Like = components["schemas"]["LikeRead"]

const FEED_KEY = ["forum", "feed"] as const
const postKey = (id: number) => ["forum", "post", id] as const

export function useFeed() {
  return useInfiniteQuery({
    queryKey: FEED_KEY,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/forum/posts", {
          params: { query: { cursor: pageParam, limit: 20 } },
          signal,
        }),
      ),
    getNextPageParam: (ultima) => ultima.proximo_cursor ?? undefined,
  })
}

export function usePost(id: number) {
  return useQuery({
    queryKey: postKey(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET("/forum/posts/{id}", { params: { path: { id } }, signal })),
  })
}

export function useCriarPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Pick<PostCreate, "conteudo">) =>
      unwrap(api.POST("/forum/posts", { body: { ...body, tipo: "AJUDA" } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY, refetchType: "all" }),
  })
}

async function putComRetry(url: string, foto: File, tentativas = 3) {
  for (let i = 1; ; i++) {
    try {
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": foto.type || CONTENT_TYPE },
        body: foto,
        signal: AbortSignal.timeout(60_000),
      })
      if (!resp.ok) throw new Error(`Falha ao enviar a foto (${resp.status}).`)
      return
    } catch (e) {
      if (i >= tentativas) throw e
      await new Promise((r) => setTimeout(r, 500 * i))
    }
  }
}

async function enviarFoto(postId: number, foto: File) {
  const { upload_url, key } = await unwrap(
    api.POST("/forum/posts/{id}/images/presign", {
      params: { path: { id: postId } },
      body: { content_type: CONTENT_TYPE },
    }),
  )
  await putComRetry(upload_url, foto)
  await unwrap(
    api.POST("/forum/posts/{id}/images/confirm", {
      params: { path: { id: postId } },
      body: { key },
    }),
  )
}

export function useCriarPostComFotos() {
  const qc = useQueryClient()
  const [enviadas, setEnviadas] = useState(0)
  const [total, setTotal] = useState(0)

  const mutation = useMutation({
    mutationFn: async ({ conteudo, fotos }: { conteudo: string; fotos: File[] }) => {
      setTotal(fotos.length)
      setEnviadas(0)
      const post = await unwrap(api.POST("/forum/posts", { body: { conteudo, tipo: "AJUDA" } }))
      for (const foto of fotos) {
        await enviarFoto(post.id, foto)
        setEnviadas((n) => n + 1)
      }
      return post
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY, refetchType: "all" }),
  })

  return { ...mutation, progresso: { enviadas, total } }
}

export function useResponder(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RespostaCreate) =>
      unwrap(api.POST("/forum/posts/{id}/respostas", { params: { path: { id: postId } }, body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKey(postId) })
      qc.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}

export function useApagarPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/forum/posts/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY, refetchType: "all" }),
  })
}

export function useApagarResposta(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/forum/respostas/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKey(postId) })
      qc.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}

export function useDenunciarPost() {
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      unwrap(api.POST("/forum/posts/{id}/denuncia", { params: { path: { id } }, body: { motivo } })),
  })
}

export function useDenunciarResposta() {
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      unwrap(api.POST("/forum/respostas/{id}/denuncia", { params: { path: { id } }, body: { motivo } })),
  })
}

function lerLike(qc: QueryClient, postId: number): Like | undefined {
  const detalhe = qc.getQueryData<Detalhe>(postKey(postId))
  if (detalhe) return { likes_count: detalhe.likes_count, eu_curti: detalhe.eu_curti }
  const feed = qc.getQueryData<InfiniteData<Feed>>(FEED_KEY)
  const item = feed?.pages.flatMap((p) => p.items).find((i) => i.id === postId)
  return item ? { likes_count: item.likes_count, eu_curti: item.eu_curti } : undefined
}

function escreverLike(qc: QueryClient, postId: number, patch: Like) {
  qc.setQueryData<InfiniteData<Feed>>(FEED_KEY, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((pg) => ({
            ...pg,
            items: pg.items.map((it) => (it.id === postId ? { ...it, ...patch } : it)),
          })),
        }
      : old,
  )
  qc.setQueryData<Detalhe>(postKey(postId), (old) => (old ? { ...old, ...patch } : old))
}

export function useAlternarLike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) =>
      unwrap(api.POST("/forum/posts/{id}/like", { params: { path: { id: postId } } })),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ["forum"] })
      const anterior = lerLike(qc, postId)
      if (anterior) {
        escreverLike(qc, postId, {
          eu_curti: !anterior.eu_curti,
          likes_count: anterior.likes_count + (anterior.eu_curti ? -1 : 1),
        })
      }
      return { anterior }
    },
    onError: (_e, postId, ctx) => {
      if (ctx?.anterior) escreverLike(qc, postId, ctx.anterior)
    },
    onSuccess: (data, postId) => escreverLike(qc, postId, data),
  })
}
