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
function Protected(){return session.get()?<AppLayout/>:<Navigate to="/login" replace/>}
function Admin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<CategoryManager/>:<Navigate to="/" replace/>}
function PlatformAdmin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<PlatformManager/>:<Navigate to="/" replace/>}
export function AppRoutes(){return <BrowserRouter><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route index element={<DashboardPage/>}/><Route path="food" element={<DiscoverPage/>}/><Route path="food/home" element={<HomeRecipesPage/>}/><Route path="food/places/:id" element={<PlaceDetailPage/>}/><Route path="food/categories" element={<Admin/>}/><Route path="films" element={<WhichFilmPage/>}/><Route path="films/:id" element={<FilmDetailPage/>}/><Route path="films/platforms" element={<PlatformAdmin/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
