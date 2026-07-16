import { BrowserRouter,Navigate,Route,Routes } from 'react-router-dom';
import { session } from '../lib/api';
import { LoginPage } from '../features/auth/LoginPage';
import { AppLayout } from '../layouts/AppLayout';
import { DiscoverPage } from '../features/places/DiscoverPage';
import { PlaceDetailPage } from '../features/places/PlaceDetailPage';
import { CategoryManager } from '../features/categories/CategoryManager';
function Protected(){return session.get()?<AppLayout/>:<Navigate to="/login" replace/>}
function Admin(){const user=session.get();return user?.role==='ADMIN'||user?.username==='avril'?<CategoryManager/>:<Navigate to="/" replace/>}
export function AppRoutes(){return <BrowserRouter><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route index element={<DiscoverPage/>}/><Route path="places/:id" element={<PlaceDetailPage/>}/><Route path="categories" element={<Admin/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
