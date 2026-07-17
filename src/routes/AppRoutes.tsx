import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { session } from '../lib/api';
import { LoginPage } from '../features/auth/LoginPage';

const AuthenticatedApp = lazy(() => import('../layouts/AuthenticatedApp').then(({ AuthenticatedApp }) => ({ default: AuthenticatedApp })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const DiscoverPage = lazy(() => import('../features/places/DiscoverPage').then(({ DiscoverPage }) => ({ default: DiscoverPage })));
const PlaceDetailPage = lazy(() => import('../features/places/PlaceDetailPage').then(({ PlaceDetailPage }) => ({ default: PlaceDetailPage })));
const CategoryManager = lazy(() => import('../features/categories/CategoryManager').then(({ CategoryManager }) => ({ default: CategoryManager })));
const WhichFilmPage = lazy(() => import('../features/films/WhichFilmPage').then(({ WhichFilmPage }) => ({ default: WhichFilmPage })));
const FilmDetailPage = lazy(() => import('../features/films/FilmDetailPage').then(({ FilmDetailPage }) => ({ default: FilmDetailPage })));
const PlatformManager = lazy(() => import('../features/films/PlatformManager').then(({ PlatformManager }) => ({ default: PlatformManager })));
const HomeRecipesPage = lazy(() => import('../features/home-recipes/HomeRecipesPage').then(({ HomeRecipesPage }) => ({ default: HomeRecipesPage })));
const WhyFunPage = lazy(() => import('../features/why-fun/WhyFunPage').then(({ WhyFunPage }) => ({ default: WhyFunPage })));
const FunVenueDetailPage = lazy(() => import('../features/why-fun/FunVenueDetailPage').then(({ FunVenueDetailPage }) => ({ default: FunVenueDetailPage })));
const FunCatalogManager = lazy(() => import('../features/why-fun/FunCatalogManager').then(({ FunCatalogManager }) => ({ default: FunCatalogManager })));

function LoadingPage() {
  return <main className="login-shell" aria-busy="true"><p>Cargando…</p></main>;
}

function Protected() {
  return session.get() ? <Suspense fallback={<LoadingPage />}><AuthenticatedApp /></Suspense> : <Navigate to="/login" replace />;
}

function Admin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={<LoadingPage />}><CategoryManager /></Suspense>
    : <Navigate to="/" replace />;
}

function PlatformAdmin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={<LoadingPage />}><PlatformManager /></Suspense>
    : <Navigate to="/" replace />;
}

function FunAdmin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={<LoadingPage />}><FunCatalogManager /></Suspense>
    : <Navigate to="/" replace />;
}

export function AppRoutes() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<Protected />}>
      <Route index element={<Suspense fallback={<LoadingPage />}><DashboardPage /></Suspense>} />
      <Route path="food" element={<Suspense fallback={<LoadingPage />}><DiscoverPage /></Suspense>} />
      <Route path="food/home" element={<Navigate to="/how-cook" replace />} />
      <Route path="food/places/:id" element={<Suspense fallback={<LoadingPage />}><PlaceDetailPage /></Suspense>} />
      <Route path="food/categories" element={<Admin />} />
      <Route path="films" element={<Suspense fallback={<LoadingPage />}><WhichFilmPage /></Suspense>} />
      <Route path="films/:id" element={<Suspense fallback={<LoadingPage />}><FilmDetailPage /></Suspense>} />
      <Route path="films/platforms" element={<PlatformAdmin />} />
      <Route path="how-cook" element={<Suspense fallback={<LoadingPage />}><HomeRecipesPage /></Suspense>} />
      <Route path="why-fun" element={<Suspense fallback={<LoadingPage />}><WhyFunPage /></Suspense>} />
      <Route path="why-fun/:id" element={<Suspense fallback={<LoadingPage />}><FunVenueDetailPage /></Suspense>} />
      <Route path="why-fun/categories" element={<FunAdmin />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
