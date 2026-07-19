import { Suspense } from "react"
import { Navigate, Route, Routes } from "react-router"
import { ErrorBoundary, RouteBoundary } from "@/components/error-boundary"
import { Conexao } from "@/components/conexao"
import { SessaoExpirada } from "@/components/sessao-expirada"
import { ProtectedRoute } from "@/components/protected-route"
import { RoleRoute } from "@/components/role-route"
import { LoginPage } from "@/pages/login"
import { lazyComRetry } from "@/lib/lazy"

const MapaPage = lazyComRetry(() => import("@/pages/mapa").then((m) => ({ default: m.MapaPage })))
const ForumPage = lazyComRetry(() => import("@/pages/forum").then((m) => ({ default: m.ForumPage })))
const ForumPostPage = lazyComRetry(() => import("@/pages/forum-post").then((m) => ({ default: m.ForumPostPage })))
const PreviewCenaPage = lazyComRetry(() => import("@/pages/preview-cena").then((m) => ({ default: m.PreviewCenaPage })))
const PainelLayout = lazyComRetry(() => import("@/components/painel-layout").then((m) => ({ default: m.PainelLayout })))
const PainelHome = lazyComRetry(() => import("@/pages/painel/home").then((m) => ({ default: m.PainelHome })))
const CadastroHortaPage = lazyComRetry(() => import("@/pages/painel/cadastro-horta").then((m) => ({ default: m.CadastroHortaPage })))
const HortasPage = lazyComRetry(() => import("@/pages/painel/hortas").then((m) => ({ default: m.HortasPage })))
const HortaDetalhePage = lazyComRetry(() => import("@/pages/painel/horta-detalhe").then((m) => ({ default: m.HortaDetalhePage })))
const UsuariosPage = lazyComRetry(() => import("@/pages/painel/usuarios").then((m) => ({ default: m.UsuariosPage })))
const MinhaHortaPage = lazyComRetry(() => import("@/pages/painel/minha-horta").then((m) => ({ default: m.MinhaHortaPage })))
const ProdutividadePage = lazyComRetry(() => import("@/pages/painel/produtividade").then((m) => ({ default: m.ProdutividadePage })))
const PlaceholderPainel = lazyComRetry(() => import("@/components/placeholder-painel").then((m) => ({ default: m.PlaceholderPainel })))
const PlantarPage = lazyComRetry(() => import("@/pages/painel/plantar").then((m) => ({ default: m.PlantarPage })))
const ColherPage = lazyComRetry(() => import("@/pages/painel/colher").then((m) => ({ default: m.ColherPage })))
const CalendarioPage = lazyComRetry(() => import("@/pages/painel/calendario").then((m) => ({ default: m.CalendarioPage })))
const ComunidadePage = lazyComRetry(() => import("@/pages/painel/comunidade").then((m) => ({ default: m.ComunidadePage })))
const SolicitacoesPage = lazyComRetry(() => import("@/pages/painel/solicitacoes").then((m) => ({ default: m.SolicitacoesPage })))
const MembrosPage = lazyComRetry(() => import("@/pages/painel/membros").then((m) => ({ default: m.MembrosPage })))
const DemandasPage = lazyComRetry(() => import("@/pages/painel/demandas").then((m) => ({ default: m.DemandasPage })))
const AdminDemandasPage = lazyComRetry(() => import("@/pages/painel/admin-demandas").then((m) => ({ default: m.AdminDemandasPage })))
const ConfiguracoesPage = lazyComRetry(() => import("@/pages/painel/configuracoes").then((m) => ({ default: m.ConfiguracoesPage })))
const PlantaDetalhePage = lazyComRetry(() => import("@/pages/painel/planta").then((m) => ({ default: m.PlantaDetalhePage })))

function Carregando() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-hu-bg">
      <p className="font-pixel text-xs text-hu-bright">Carregando…</p>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Conexao />
      <SessaoExpirada />
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/mapa" element={<RouteBoundary><MapaPage /></RouteBoundary>} />
          <Route path="/forum" element={<RouteBoundary><ForumPage /></RouteBoundary>} />
          <Route path="/forum/:id" element={<RouteBoundary><ForumPostPage /></RouteBoundary>} />
          <Route path="/preview/cena" element={<RouteBoundary><PreviewCenaPage /></RouteBoundary>} />

          <Route element={<ProtectedRoute />}>
            <Route path="/painel" element={<PainelLayout />}>
              <Route index element={<PainelHome />} />
              <Route
                path="cadastrar"
                element={
                  <RoleRoute roles={["ADMIN_SUPREMO"]}>
                    <CadastroHortaPage />
                  </RoleRoute>
                }
              />
              <Route path="hortas" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><HortasPage /></RoleRoute>} />
              <Route path="hortas/:id" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><HortaDetalhePage /></RoleRoute>} />
              <Route path="usuarios" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><UsuariosPage /></RoleRoute>} />
              <Route path="riscos" element={<PlaceholderPainel titulo="Zonas de risco" />} />
              <Route path="config" element={<ConfiguracoesPage />} />
              <Route path="horta" element={<RoleRoute roles={["LIDER_HORTA"]}><MinhaHortaPage /></RoleRoute>} />
              <Route path="produtividade" element={<RoleRoute roles={["LIDER_HORTA"]}><ProdutividadePage /></RoleRoute>} />
              <Route path="solicitacoes" element={<RoleRoute roles={["LIDER_HORTA", "ADMIN_SUPREMO"]}><SolicitacoesPage /></RoleRoute>} />
              <Route path="demandas" element={<RoleRoute roles={["LIDER_HORTA"]}><DemandasPage /></RoleRoute>} />
              <Route path="admin-demandas" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><AdminDemandasPage /></RoleRoute>} />
              <Route path="membros" element={<RoleRoute roles={["LIDER_HORTA", "ADMIN_SUPREMO"]}><MembrosPage /></RoleRoute>} />
              <Route path="plantar" element={<RoleRoute roles={["MEMBRO_CANTEIRO"]}><PlantarPage /></RoleRoute>} />
              <Route path="planta/:id" element={<RoleRoute roles={["MEMBRO_CANTEIRO"]}><PlantaDetalhePage /></RoleRoute>} />
              <Route path="colher" element={<RoleRoute roles={["MEMBRO_CANTEIRO"]}><ColherPage /></RoleRoute>} />
              <Route path="calendario" element={<RoleRoute roles={["MEMBRO_CANTEIRO"]}><CalendarioPage /></RoleRoute>} />
              <Route path="comunidade" element={<RoleRoute roles={["MEMBRO_CANTEIRO"]}><ComunidadePage /></RoleRoute>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
