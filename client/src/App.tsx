import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/msme/RegisterPage";
import { BankDashboardPage } from "./pages/bank/DashboardPage";
import { BankPortfolioPage } from "./pages/bank/PortfolioPage";
import { BankLoansPage } from "./pages/bank/LoansPage";
import { BankReportPage } from "./pages/bank/ReportPage";
import { MsmeDashboardPage } from "./pages/msme/DashboardPage";
import { MsmeProfilePage } from "./pages/msme/ProfilePage";
import { MsmeImportPage } from "./pages/msme/ImportPage";
import { MsmeAssessPage } from "./pages/msme/AssessPage";
import { MsmeReportPage } from "./pages/msme/ReportPage";
import { MsmeLoansPage } from "./pages/msme/LoansPage";
import { GovtDashboardPage } from "./pages/govt/DashboardPage";
import { GovtSchemesPage } from "./pages/govt/SchemesPage";
import { RegulatoryDashboardPage } from "./pages/regulatory/DashboardPage";
import { RegulatoryReviewPage } from "./pages/regulatory/ReviewPage";

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/msme/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute portal="bank" />}>
            <Route path="/bank/dashboard" element={<BankDashboardPage />} />
            <Route path="/bank/portfolio" element={<BankPortfolioPage />} />
            <Route path="/bank/loans" element={<BankLoansPage />} />
            <Route path="/bank/report" element={<BankReportPage />} />
          </Route>

          <Route element={<ProtectedRoute portal="msme" />}>
            <Route path="/msme/dashboard" element={<MsmeDashboardPage />} />
            <Route path="/msme/profile" element={<MsmeProfilePage />} />
            <Route path="/msme/import" element={<MsmeImportPage />} />
            <Route path="/msme/assess" element={<MsmeAssessPage />} />
            <Route path="/msme/report" element={<MsmeReportPage />} />
            <Route path="/msme/loans" element={<MsmeLoansPage />} />
          </Route>

          <Route element={<ProtectedRoute portal="govt" />}>
            <Route path="/govt/dashboard" element={<GovtDashboardPage />} />
            <Route path="/govt/schemes" element={<GovtSchemesPage />} />
          </Route>

          <Route element={<ProtectedRoute portal="regulatory" />}>
            <Route path="/regulatory/dashboard" element={<RegulatoryDashboardPage />} />
            <Route path="/regulatory/review" element={<RegulatoryReviewPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
