import React,{Suspense,lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,useLocation} from 'react-router-dom';
import '@fontsource/cormorant-garamond/latin-ext-400.css';
import '@fontsource/cormorant-garamond/latin-ext-500.css';
import '@fontsource/cormorant-garamond/latin-ext-400-italic.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import './styles.css';
import {StoreProvider,useStore} from './context';
import {Header,Footer,CartDrawer,RevealObserver} from './components';
import Home from './Home';
const Pages=lazy(()=>import('./Pages'));
const Admin=lazy(()=>import('./Admin'));
function App(){const loc=useLocation(),s=useStore();const admin=loc.pathname.startsWith('/admin');return <><RevealObserver/>{admin?<Suspense fallback={<div className="loading">Se încarcă atelierul…</div>}><Admin/></Suspense>:<div className="storefront"><Header/><main><Routes><Route path="/" element={<Home/>}/><Route path="*" element={<Suspense fallback={<div className="loading">Se încarcă…</div>}><Pages/></Suspense>}/></Routes></main><Footer/><CartDrawer/></div>}{!s.data&&<div className="loading">Pregătim florile pentru tine…</div>}</>;}
createRoot(document.getElementById('root')).render(<BrowserRouter><StoreProvider><App/></StoreProvider></BrowserRouter>);
