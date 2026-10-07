import { Suspense } from "react"
import { Navigate, Route, Routes } from "react-router"
import { ErrorBoundary, RouteBoundary } from "@/components/error-boundary"
import { Conexao } from "@/components/conexao"
import { SessaoExpirada } from "@/components/sessao-expirada"
import { VoltarAndroid } from "@/components/voltar-android"
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
const ResumoPage = lazyComRetry(() => import("@/pages/painel/resumo").then((m) => ({ default: m.ResumoPage })))
const ProducaoPage = lazyComRetry(() => import("@/pages/painel/producao").then((m) => ({ default: m.ProducaoPage })))
const HorticultoresPage = lazyComRetry(() => import("@/pages/painel/horticultores").then((m) => ({ default: m.HorticultoresPage })))
const ModeracaoPage = lazyComRetry(() => import("@/pages/painel/moderacao").then((m) => ({ default: m.ModeracaoPage })))
const MinhaHortaPage = lazyComRetry(() => import("@/pages/painel/minha-horta").then((m) => ({ default: m.MinhaHortaPage })))
const PlaceholderPainel = lazyComRetry(() => import("@/components/placeholder-painel").then((m) => ({ default: m.PlaceholderPainel })))
const PlantarPage = lazyComRetry(() => import("@/pages/painel/plantar").then((m) => ({ default: m.PlantarPage })))
const ColherPage = lazyComRetry(() => import("@/pages/painel/colher").then((m) => ({ default: m.ColherPage })))
const CalendarioPage = lazyComRetry(() => import("@/pages/painel/calendario").then((m) => ({ default: m.CalendarioPage })))
const ComunidadePage = lazyComRetry(() => import("@/pages/painel/comunidade").then((m) => ({ default: m.ComunidadePage })))
const SolicitacoesPage = lazyComRetry(() => import("@/pages/painel/solicitacoes").then((m) => ({ default: m.SolicitacoesPage })))
const MembrosPage = lazyComRetry(() => import("@/pages/painel/membros").then((m) => ({ default: m.MembrosPage })))
const DemandasPage = lazyComRetry(() => import("@/pages/painel/demandas").then((m) => ({ default: m.DemandasPage })))
const AdminDemandasPage = lazyComRetry(() => import("@/pages/painel/admin-demandas").then((m) => ({ default: m.AdminDemandasPage })))
const AdminPedidosHortaPage = lazyComRetry(() => import("@/pages/painel/admin-demandas").then((m) => ({ default: m.AdminPedidosHortaPage })))
const ConfiguracoesPage = lazyComRetry(() => import("@/pages/painel/configuracoes").then((m) => ({ default: m.ConfiguracoesPage })))
const PlantaDetalhePage = lazyComRetry(() => import("@/pages/painel/planta").then((m) => ({ default: m.PlantaDetalhePage })))
const MeuCanteiroPage = lazyComRetry(() => import("@/pages/painel/meu-canteiro").then((m) => ({ default: m.MeuCanteiroPage })))

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
      <VoltarAndroid />
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
              <Route path="resumo" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><ResumoPage /></RoleRoute>} />
              <Route path="producao" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><ProducaoPage /></RoleRoute>} />
              <Route path="horticultores" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><HorticultoresPage /></RoleRoute>} />
              <Route path="moderacao" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><ModeracaoPage /></RoleRoute>} />
              <Route path="riscos" element={<PlaceholderPainel titulo="Zonas de risco" />} />
              <Route path="config" element={<ConfiguracoesPage />} />
              <Route path="horta" element={<RoleRoute roles={["LIDER_HORTA"]}><MinhaHortaPage /></RoleRoute>} />
              {/* Fundida na tela da horta: a lista de canteiros agora vive lá. */}
              <Route path="produtividade" element={<Navigate to="/painel/horta" replace />} />
              <Route path="solicitacoes" element={<RoleRoute roles={["LIDER_HORTA", "ADMIN_SUPREMO"]}><SolicitacoesPage /></RoleRoute>} />
              <Route path="demandas" element={<RoleRoute roles={["LIDER_HORTA"]}><DemandasPage /></RoleRoute>} />
              <Route path="admin-demandas" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><AdminDemandasPage /></RoleRoute>} />
              <Route path="admin-demandas/:hortaId" element={<RoleRoute roles={["ADMIN_SUPREMO"]}><AdminPedidosHortaPage /></RoleRoute>} />
              <Route path="membros" element={<RoleRoute roles={["LIDER_HORTA", "ADMIN_SUPREMO"]}><MembrosPage /></RoleRoute>} />
              <Route path="meu-canteiro" element={<RoleRoute roles={["LIDER_HORTA"]}><MeuCanteiroPage /></RoleRoute>} />
              {/* Líder também cuida do próprio canteiro — mesmas telas do membro. */}
              <Route path="plantar" element={<RoleRoute roles={["MEMBRO_CANTEIRO", "LIDER_HORTA"]}><PlantarPage /></RoleRoute>} />
              <Route path="planta/:id" element={<RoleRoute roles={["MEMBRO_CANTEIRO", "LIDER_HORTA"]}><PlantaDetalhePage /></RoleRoute>} />
              <Route path="colher" element={<RoleRoute roles={["MEMBRO_CANTEIRO", "LIDER_HORTA"]}><ColherPage /></RoleRoute>} />
              <Route path="calendario" element={<RoleRoute roles={["MEMBRO_CANTEIRO", "LIDER_HORTA"]}><CalendarioPage /></RoleRoute>} />
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
