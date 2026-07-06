import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export function useMapaCompleto() {
  return useQuery({
    queryKey: ["mapa", "completo"],
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/mapa/completo", { signal })),
  })
}

export function useMapaRiscos() {
  return useQuery({
    queryKey: ["mapa", "riscos"],
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/mapa/riscos", { signal })),
  })
}

export function useAlertasAtivos() {
  return useQuery({
    queryKey: ["mapa", "alertas"],
    staleTime: 60_000,
    queryFn: ({ signal }) => unwrap(api.GET("/alertas/ativos", { signal })),
  })
}

export function useBuscarProximas() {
  return useMutation({
    mutationFn: (v: { lat: number; lng: number; raioKm: number }) =>
      unwrap(
        api.GET("/hortas/proximas", {
          params: { query: { lat: v.lat, lng: v.lng, raio_km: v.raioKm } },
        }),
      ),
  })
}
