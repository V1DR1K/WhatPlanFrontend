import { Link,Outlet,useNavigate } from 'react-router-dom';
import { session } from '../lib/api';
import { logout } from '../features/auth/auth';
export function AppLayout(){const navigate=useNavigate();const user=session.get();const canManage=user?.role==='ADMIN'||user?.username==='avril';return <main className="app-shell"><header><Link className="brand" to="/">where<span>food</span><i>✦</i></Link><div className="header-actions">{canManage&&<Link className="round" to="/categories">⚙</Link>}<button className="avatar" onClick={()=>{logout();navigate('/login')}}>{user?.username[0].toUpperCase()}</button></div></header><Outlet/></main>}
