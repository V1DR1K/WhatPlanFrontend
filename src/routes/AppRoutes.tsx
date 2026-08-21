import { BrowserRouter,Navigate,Route,Routes } from 'react-router-dom';
import { session } from '../lib/api';
import { LoginPage } from '../features/auth/LoginPage';
import { AppLayout } from '../layouts/AppLayout';
import { DiscoverPage } from '../features/places/DiscoverPage';
import { PlaceDetailPage } from '../features/places/PlaceDetailPage';
import { CategoryManager } from '../features/categories/CategoryManager';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { WhichFilmPage } from '../features/films/WhichFilmPage';
import { FilmDetailPage } from '../features/films/FilmDetailPage';
import { PlatformManager } from '../features/films/PlatformManager';
import { HomeRecipesPage } from '../features/home-recipes/HomeRecipesPage';
import { WhyFunPage } from '../features/why-fun/WhyFunPage';
import { FunVenueDetailPage } from '../features/why-fun/FunVenueDetailPage';
import { FunCatalogManager } from '../features/why-fun/FunCatalogManager';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
function Protected(){return session.get()?<AppLayout/>:<Navigate to="/login" replace/>}
function PasswordGate(){return session.get()?.user?.mustChangePassword?<ChangePasswordPage/>:<Navigate to="/" replace/>}
function Admin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<CategoryManager/>:<Navigate to="/" replace/>}
function PlatformAdmin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<PlatformManager/>:<Navigate to="/" replace/>}
function FunAdmin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<FunCatalogManager/>:<Navigate to="/" replace/>}
export function AppRoutes(){return <BrowserRouter><Routes><Route path="/login" element={<LoginPage/>}/><Route path="/change-password" element={<PasswordGate/>}/><Route element={<Protected/>}><Route index element={<DashboardPage/>}/><Route path="food" element={<DiscoverPage/>}/><Route path="food/home" element={<Navigate to="/how-cook" replace/>}/><Route path="food/places/:id" element={<PlaceDetailPage/>}/><Route path="food/categories" element={<Admin/>}/><Route path="films" element={<WhichFilmPage/>}/><Route path="films/:id" element={<FilmDetailPage/>}/><Route path="films/platforms" element={<PlatformAdmin/>}/><Route path="how-cook" element={<HomeRecipesPage/>}/><Route path="why-fun" element={<WhyFunPage/>}/><Route path="why-fun/:id" element={<FunVenueDetailPage/>}/><Route path="why-fun/categories" element={<FunAdmin/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
