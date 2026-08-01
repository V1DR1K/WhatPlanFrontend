import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { session } from '../lib/api';
import { LoginPage } from '../features/auth/LoginPage';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { AuthenticatedApp } from '../layouts/AuthenticatedApp';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const DiscoverPage = lazy(() => import('../features/places/DiscoverPage').then(({ DiscoverPage }) => ({ default: DiscoverPage })));
const PlaceDetailPage = lazy(() => import('../features/places/PlaceDetailPage').then(({ PlaceDetailPage }) => ({ default: PlaceDetailPage })));
const CategoryManager = lazy(() => import('../features/categories/CategoryManager').then(({ CategoryManager }) => ({ default: CategoryManager })));
const WhichFilmPage = lazy(() => import('../features/films/WhichFilmPage').then(({ WhichFilmPage }) => ({ default: WhichFilmPage })));
const FilmDetailPage = lazy(() => import('../features/films/FilmDetailPage').then(({ FilmDetailPage }) => ({ default: FilmDetailPage })));
const PlatformManager = lazy(() => import('../features/films/PlatformManager').then(({ PlatformManager }) => ({ default: PlatformManager })));
const HomeRecipesPage = lazy(() => import('../features/home-recipes/HomeRecipesPage').then(({ HomeRecipesPage }) => ({ default: HomeRecipesPage })));
const HomeRecipeDetailPage = lazy(() => import('../features/home-recipes/HomeRecipeDetailPage').then(({ HomeRecipeDetailPage }) => ({ default: HomeRecipeDetailPage })));
const WhyFunPage = lazy(() => import('../features/why-fun/WhyFunPage').then(({ WhyFunPage }) => ({ default: WhyFunPage })));
const FunVenueDetailPage = lazy(() => import('../features/why-fun/FunVenueDetailPage').then(({ FunVenueDetailPage }) => ({ default: FunVenueDetailPage })));
const FunCatalogManager = lazy(() => import('../features/why-fun/FunCatalogManager').then(({ FunCatalogManager }) => ({ default: FunCatalogManager })));
const SettingsPage = lazy(() => import('../features/special-dates/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })));
const WhenDatesPage = lazy(() => import('../features/when-dates/WhenDatesPage').then(({ WhenDatesPage }) => ({ default: WhenDatesPage })));
const WhenDateDetailPage = lazy(() => import('../features/when-dates/WhenDateDetailPage').then(({ WhenDateDetailPage }) => ({ default: WhenDateDetailPage })));
const WhenDatesSettingsPage = lazy(() => import('../features/when-dates/WhenDatesSettingsPage').then(({ WhenDatesSettingsPage }) => ({ default: WhenDatesSettingsPage })));

const routeFallback = <LoadingSkeleton variant="route" />;

function Protected() {
  return session.get() ? <AuthenticatedApp /> : <Navigate to="/login" replace />;
}

function Admin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={routeFallback}><CategoryManager /></Suspense>
    : <Navigate to="/" replace />;
}

function PlatformAdmin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={routeFallback}><PlatformManager /></Suspense>
    : <Navigate to="/" replace />;
}

function FunAdmin() {
  const user = session.get();
  return user?.role === 'ADMIN' || user?.username === 'avril'
    ? <Suspense fallback={routeFallback}><FunCatalogManager /></Suspense>
    : <Navigate to="/" replace />;
}

function SettingsAdmin() {
  return session.get()?.role === 'ADMIN'
    ? <Suspense fallback={routeFallback}><SettingsPage /></Suspense>
    : <Navigate to="/" replace />;
}

function WhenDatesSettingsAdmin() {
  return session.get()?.role === 'ADMIN'
    ? <Suspense fallback={routeFallback}><WhenDatesSettingsPage /></Suspense>
    : <Navigate to="/" replace />;
}

export function AppRoutes() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<Protected />}>
      <Route index element={<Suspense fallback={routeFallback}><DashboardPage /></Suspense>} />
      <Route path="food" element={<Suspense fallback={routeFallback}><DiscoverPage /></Suspense>} />
      <Route path="food/home" element={<Navigate to="/how-cook" replace />} />
      <Route path="food/places/:id" element={<Suspense fallback={routeFallback}><PlaceDetailPage /></Suspense>} />
      <Route path="food/categories" element={<Admin />} />
      <Route path="films" element={<Suspense fallback={routeFallback}><WhichFilmPage /></Suspense>} />
      <Route path="films/:id" element={<Suspense fallback={routeFallback}><FilmDetailPage /></Suspense>} />
      <Route path="films/platforms" element={<PlatformAdmin />} />
      <Route path="how-cook" element={<Suspense fallback={routeFallback}><HomeRecipesPage /></Suspense>} />
      <Route path="how-cook/:id" element={<Suspense fallback={routeFallback}><HomeRecipeDetailPage /></Suspense>} />
      <Route path="why-fun" element={<Suspense fallback={routeFallback}><WhyFunPage /></Suspense>} />
      <Route path="why-fun/:id" element={<Suspense fallback={routeFallback}><FunVenueDetailPage /></Suspense>} />
      <Route path="why-fun/categories" element={<FunAdmin />} />
      <Route path="when-dates" element={<Suspense fallback={routeFallback}><WhenDatesPage /></Suspense>} />
      <Route path="when-dates/settings" element={<WhenDatesSettingsAdmin />} />
      <Route path="when-dates/:specialDateId/:date" element={<Suspense fallback={routeFallback}><WhenDateDetailPage /></Suspense>} />
      <Route path="settings" element={<SettingsAdmin />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
