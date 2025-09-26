import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

// Pages
import LoginPage from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

// Hooks
import { useSessionMonitor } from "./hooks/useAuth";
import useAuthStore from "./store/authStore";

// Styles
import "./styles/index.css";

//Auth
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import QueryManagementPage from "./pages/queries/QueryManagementPage";
import { MachineDetail, Machines } from "./pages/machines";
import { Customers, CustomerForm, CustomerDetail } from "./pages/customers";
import QuotationList from "./pages/quotations/QuotationList";
import QuotationForm from "./pages/quotations/QuotationForm";
import QuotationDetail from "./pages/quotations/QuotationDetail";
import TermsConditionsPage from "./pages/termsAndConditions/TermsConditionsPage";
import ServicesPage from "./pages/services/ServicesPage";
import AddServicePage from "./pages/services/AddServicePage";
import EditServicePage from "./pages/services/EditServicePage";
import CategoriesPage from "./pages/services/CategoriesPage";
import { ServiceDetailPage } from "./components/services";
import CompanySettings from "./pages/CompanySettings";

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

const SessionMonitor = ({ children }) => {
  useSessionMonitor();
  return children;
};

const AppInitializer = ({ children }) => {
  const { _hasHydrated, setHasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) {
      setTimeout(() => {
        setHasHydrated(true);
      }, 100);
    }
  }, [_hasHydrated, setHasHydrated]);

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router basename="/admin">
        <AppInitializer>
          <SessionMonitor>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/reset-password/:token"
                  element={<ResetPasswordPage />}
                />
                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="queries" element={<QueryManagementPage />} />
                  <Route path="machines" element={<Machines />} />
                  <Route path="machines/:id" element={<MachineDetail />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/new" element={<CustomerForm />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="customers/:id/edit" element={<CustomerForm />} />
                  <Route path="quotations" element={<QuotationList />} />
                  <Route path="quotations/new" element={<QuotationForm />} />
                  <Route path="quotations/:id" element={<QuotationDetail />} />
                  <Route
                    path="quotations/:id/edit"
                    element={<QuotationForm />}
                  />
                  <Route
                    path="documents"
                    element={
                      <div className="p-6 text-center text-gray-500">
                        Documents Page - Coming Soon
                      </div>
                    }
                  />
                  <Route
                    path="terms-and-conditions"
                    element={<TermsConditionsPage />}
                  />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="services/new" element={<AddServicePage />} />
                  <Route
                    path="services/:id/edit"
                    element={<EditServicePage />}
                  />
                  <Route
                    path="services/categories"
                    element={<CategoriesPage />}
                  />
                  <Route
                    path="services/:serviceId"
                    element={<ServiceDetailPage />}
                  />
                  <Route path="settings" element={<CompanySettings />} />
                </Route>
                {/* Catch all route */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </div>
          </SessionMonitor>
        </AppInitializer>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#333",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          },
          success: {
            iconTheme: {
              primary: "#0081C9",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
