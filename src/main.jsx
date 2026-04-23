import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'

// Helpers p/ redirect com param (estudo/:slug e aulas/ao-vivo/:id → /cursos/*)
function NavigateEstudoSlug() {
  const { slug } = useParams()
  return <Navigate to={`/cursos/estudo/${slug}`} replace />
}
function NavigateAulaAoVivo() {
  const { id } = useParams()
  return <Navigate to={`/cursos/aulas/ao-vivo/${id}`} replace />
}

// Fonts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/instrument-serif'

// Design tokens (must come after fonts)
import './styles/tokens.css'
import './styles/matilha-glass.css'
import './styles/diary-tokens.css'

import App from './App.jsx'
import Vitrine from './pages/Vitrine'
import Perfil from './pages/Perfil'
import DiaryLayout from './pages/diary/DiaryLayout'
import Evolucao from './pages/diary/Evolucao'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MemberLayout from './pages/member/MemberLayout'
import Inicio from './pages/member/Inicio'
import Estudo from './pages/member/Estudo'
import Course from './pages/member/Course'
import Aulas from './pages/member/Aulas'
import Imersoes from './pages/member/Imersoes'
import Monitoria from './pages/member/Monitoria'
import PlanoExecucao from './pages/member/PlanoExecucao'
import Sessoes from './pages/member/Sessoes'
import Desafios from './pages/member/Desafios'
import Diario from './pages/member/Diario'
import Oraculo from './pages/member/Oraculo'
import Destaques from './pages/member/Destaques'
import Comunidade from './pages/member/Comunidade'
import Social from './pages/member/Social'
import CursosGratis from './pages/member/CursosGratis'
import Relatorio from './pages/member/Relatorio'
import Packstore from './pages/member/Packstore'
import Parcerias from './pages/member/Parcerias'
import Jornada from './pages/member/Jornada'
import Historico from './pages/member/Historico'
import ResumoSemanal from './pages/member/ResumoSemanal'
import WolfAI from './pages/diary/WolfAI'
import CursosLayout from './pages/cursos/CursosLayout'
import MinhaFicha from './pages/member/MinhaFicha'
import NovoTrade from './pages/member/NovoTrade'
import AulaAoVivo from './pages/member/AulaAoVivo'
import NovaAula from './pages/monitor/NovaAula'
import AulaAttendance from './pages/monitor/AulaAttendance'
import FinalizarDia from './pages/member/FinalizarDia'
import Feedback from './pages/member/Feedback'
import Operacional from './pages/member/Operacional'
import Settings from './pages/member/Settings'
import Upgrade from './pages/member/Upgrade'
import CalcRiscoRetorno from './pages/member/CalcRiscoRetorno'
import PremiumGate from './auth/PremiumGate'
import MonitorGuard from './auth/MonitorGuard'
import MonitorLayout from './pages/monitor/MonitorLayout'
import VisaoGeral from './pages/monitor/VisaoGeral'
import MonitorAlunos from './pages/monitor/Alunos'
import MonitorRelatorio from './pages/monitor/Relatorio'
import AlunoDetail from './pages/monitor/AlunoDetail'
import MinhaAgenda from './pages/monitor/MinhaAgenda'
import AdminConteudos from './pages/monitor/AdminConteudos'
import ConfigZoom from './pages/monitor/ConfigZoom'
import Feedbacks from './pages/monitor/Feedbacks'
import Resgates from './pages/monitor/Resgates'
import Solicitacoes from './pages/monitor/Solicitacoes'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/matilha" element={<Vitrine />} />
          <Route path="/calc" element={<CalcRiscoRetorno />} />

          {/* Ambiente Diário — sub-app com layout próprio */}
          <Route
            path="/diary"
            element={
              <ProtectedRoute>
                <PremiumGate>
                  <DiaryLayout />
                </PremiumGate>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="evolucao" replace />} />
            <Route path="evolucao" element={<Evolucao />} />
            <Route path="diario" element={<Diario />} />
            <Route path="historico" element={<Historico />} />
            <Route path="finalizar-dia" element={<FinalizarDia />} />
            <Route path="operacional" element={<Operacional />} />
            <Route path="plano" element={<PlanoExecucao />} />
            <Route path="jornada" element={<Jornada />} />
            <Route path="wolf" element={<WolfAI />} />
          </Route>

          {/* Sub-app de Cursos — sidebar pill glass próprio */}
          <Route
            path="/cursos"
            element={
              <ProtectedRoute>
                <CursosLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="aulas" replace />} />
            <Route path="aulas" element={<PremiumGate><Aulas /></PremiumGate>} />
            <Route path="aulas/ao-vivo/:id" element={<PremiumGate><AulaAoVivo /></PremiumGate>} />
            <Route path="estudo" element={<PremiumGate><Estudo /></PremiumGate>} />
            <Route path="estudo/:slug" element={<PremiumGate><Course /></PremiumGate>} />
            <Route path="imersoes" element={<PremiumGate><Imersoes /></PremiumGate>} />
            <Route path="gratis" element={<CursosGratis />} />
          </Route>

          <Route path="/p/:id" element={<Perfil />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/cadastro" element={<Signup />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="inicio" replace />} />

            {/* Sempre acessível */}
            <Route path="inicio" element={<Inicio />} />
            <Route path="minha-ficha" element={<MinhaFicha />} />
            <Route path="config" element={<Settings />} />
            <Route path="desafios" element={<Desafios />} />
            <Route path="destaques" element={<Destaques />} />
            <Route path="upgrade" element={<Upgrade />} />

            {/* Premium (mentorado) */}
            {/* Rotas duplicadas redirecionam pra /diary (source of truth) */}
            <Route path="jornada"        element={<Navigate to="/diary/jornada" replace />} />
            <Route path="historico"      element={<Navigate to="/diary/historico" replace />} />
            <Route path="resumo-semanal" element={<Navigate to="/diary/wolf" replace />} />
            <Route path="novo-trade"     element={<Navigate to="/diary/diario" replace />} />
            <Route path="finalizar-dia"  element={<Navigate to="/diary/diario" replace />} />
            <Route path="operacional"    element={<Navigate to="/diary/operacional" replace />} />
            <Route path="plano-execucao" element={<Navigate to="/diary/plano" replace />} />
            <Route path="diario"         element={<Navigate to="/diary/diario" replace />} />

            {/* Rotas que continuam no /app */}
            <Route path="feedback" element={<PremiumGate><Feedback /></PremiumGate>} />
            <Route path="trade/:id" element={<PremiumGate><NovoTrade /></PremiumGate>} />
            <Route path="sessoes" element={<PremiumGate><Sessoes /></PremiumGate>} />
            <Route path="monitoria" element={<PremiumGate><Monitoria /></PremiumGate>} />
            <Route path="oraculo" element={<PremiumGate><Oraculo /></PremiumGate>} />

            {/* Rotas de cursos/aulas — redirect pro sub-app /cursos (source of truth) */}
            <Route path="estudo"              element={<Navigate to="/cursos/estudo" replace />} />
            <Route path="estudo/:slug"        element={<NavigateEstudoSlug />} />
            <Route path="aulas"               element={<Navigate to="/cursos/aulas" replace />} />
            <Route path="aulas/ao-vivo/:id"   element={<NavigateAulaAoVivo />} />
            <Route path="imersoes"            element={<Navigate to="/cursos/imersoes" replace />} />
            <Route path="cursos-gratis"       element={<Navigate to="/cursos/gratis" replace />} />

            {/* Comunidade (free) */}
            <Route path="comunidade" element={<Comunidade />} />
            <Route path="social" element={<Social />} />
            <Route path="relatorio" element={<Relatorio />} />
            <Route path="packstore" element={<Packstore />} />
            <Route path="parcerias" element={<Parcerias />} />
          </Route>
          {/* Área do Monitor — gated por role */}
          <Route
            path="/mentor"
            element={
              <ProtectedRoute>
                <MonitorGuard>
                  <MonitorLayout />
                </MonitorGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="visao-geral" replace />} />
            <Route path="visao-geral" element={<VisaoGeral />} />
            <Route path="alunos" element={<MonitorAlunos />} />
            <Route path="relatorio" element={<MonitorRelatorio />} />
            <Route path="alunos/:id" element={<AlunoDetail />} />
            <Route path="agenda" element={<MinhaAgenda />} />
            <Route path="conteudos" element={<AdminConteudos />} />
            <Route path="config-zoom" element={<ConfigZoom />} />
            <Route path="feedbacks" element={<Feedbacks />} />
            <Route path="resgates" element={<Resgates />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="aulas/nova" element={<NovaAula />} />
            <Route path="aulas/relatorio/:id" element={<AulaAttendance />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
