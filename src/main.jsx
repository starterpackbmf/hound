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
import Settings from './pages/member/Settings'
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

            {/* Matilha (premium) */}
            <Route path="inicio" element={<Inicio />} />
            <Route path="jornada" element={<Jornada />} />
            <Route path="historico" element={<Historico />} />
            <Route path="resumo-semanal" element={<ResumoSemanal />} />
            <Route path="minha-ficha" element={<MinhaFicha />} />
            <Route path="config" element={<Settings />} />
            <Route path="novo-trade" element={<NovoTrade />} />
            <Route path="trade/:id" element={<NovoTrade />} />
            <Route path="plano-execucao" element={<PlanoExecucao />} />
            <Route path="sessoes" element={<Sessoes />} />
            <Route path="desafios" element={<Desafios />} />
            <Route path="estudo" element={<Estudo />} />
            <Route path="estudo/:slug" element={<Course />} />
            <Route path="aulas" element={<Aulas />} />
            <Route path="imersoes" element={<Imersoes />} />
            <Route path="monitoria" element={<Monitoria />} />
            <Route path="diario" element={<Diario />} />
            <Route path="oraculo" element={<Oraculo />} />
            <Route path="destaques" element={<Destaques />} />

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
