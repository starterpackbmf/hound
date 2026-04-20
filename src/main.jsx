import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Fonts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'

// Design tokens (must come after fonts)
import './styles/tokens.css'

import App from './App.jsx'
import Vitrine from './pages/Vitrine'
import Perfil from './pages/Perfil'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import Login from './pages/Login'
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
import MinhaFicha from './pages/member/MinhaFicha'
import NovoTrade from './pages/member/NovoTrade'
import FinalizarDia from './pages/member/FinalizarDia'
import Feedback from './pages/member/Feedback'
import Operacional from './pages/member/Operacional'
import Settings from './pages/member/Settings'
import Upgrade from './pages/member/Upgrade'
import PremiumGate from './auth/PremiumGate'
import MonitorGuard from './auth/MonitorGuard'
import MonitorLayout from './pages/monitor/MonitorLayout'
import VisaoGeral from './pages/monitor/VisaoGeral'
import MonitorAlunos from './pages/monitor/Alunos'
import MonitorRelatorio from './pages/monitor/Relatorio'
import AlunoDetail from './pages/monitor/AlunoDetail'
import MinhaAgenda from './pages/monitor/MinhaAgenda'
import AdminConteudos from './pages/monitor/AdminConteudos'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/matilha" element={<Vitrine />} />
          <Route path="/p/:id" element={<Perfil />} />
          <Route path="/login" element={<Login />} />
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
            <Route path="jornada" element={<PremiumGate><Jornada /></PremiumGate>} />
            <Route path="historico" element={<PremiumGate><Historico /></PremiumGate>} />
            <Route path="resumo-semanal" element={<PremiumGate><ResumoSemanal /></PremiumGate>} />
            <Route path="novo-trade" element={<PremiumGate><NovoTrade /></PremiumGate>} />
            <Route path="finalizar-dia" element={<PremiumGate><FinalizarDia /></PremiumGate>} />
            <Route path="feedback" element={<PremiumGate><Feedback /></PremiumGate>} />
            <Route path="operacional" element={<PremiumGate><Operacional /></PremiumGate>} />
            <Route path="trade/:id" element={<PremiumGate><NovoTrade /></PremiumGate>} />
            <Route path="plano-execucao" element={<PremiumGate><PlanoExecucao /></PremiumGate>} />
            <Route path="sessoes" element={<PremiumGate><Sessoes /></PremiumGate>} />
            <Route path="estudo" element={<PremiumGate><Estudo /></PremiumGate>} />
            <Route path="estudo/:slug" element={<PremiumGate><Course /></PremiumGate>} />
            <Route path="aulas" element={<PremiumGate><Aulas /></PremiumGate>} />
            <Route path="imersoes" element={<PremiumGate><Imersoes /></PremiumGate>} />
            <Route path="monitoria" element={<PremiumGate><Monitoria /></PremiumGate>} />
            <Route path="diario" element={<PremiumGate><Diario /></PremiumGate>} />
            <Route path="oraculo" element={<PremiumGate><Oraculo /></PremiumGate>} />

            {/* Comunidade (free) */}
            <Route path="comunidade" element={<Comunidade />} />
            <Route path="social" element={<Social />} />
            <Route path="cursos-gratis" element={<CursosGratis />} />
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
