import React, {useEffect, useId, useRef, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {ArrowDownWideNarrow, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Flower2, Leaf, RotateCcw, Search, SlidersHorizontal, Sparkles, X} from 'lucide-react';
import {useStore} from './context';
import {api} from './api';
import {Dialog, ProductCard} from './components';
import './shop-premium.css';

const priceRanges = [
  {label: 'Până la 150 lei', min: '', max: '150'},
  {label: '150 – 300 lei', min: '150', max: '300'},
  {label: '300 – 500 lei', min: '300', max: '500'},
  {label: 'De la 500 lei', min: '500', max: ''}
];
const sortOptions = [['recommended', 'Recomandate'], ['price_asc', 'Preț crescător'], ['price_desc', 'Preț descrescător'], ['newest', 'Cele mai noi'], ['name', 'Nume A–Z']];
const countLabel = count => `${count} ${count === 1 ? 'creație' : 'creații'}`;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function FilterPanel({categories, category, categoryHref, onCategory, params, prices, setPrices, priceError, applyPrices, chooseRange, clearFilters, activeCount}) {
  const id = useId();
  return <div className="catalog-filter-content">
    <div className="catalog-filter-intro"><span className="catalog-filter-symbol"><Flower2 size={25}/></span><div><span className="catalog-kicker">SELECȚIA FLORALIS</span><h2>Alege cu <em>inima.</em></h2></div></div>
    <div className="catalog-filter-scroll" tabIndex={0} aria-label="Colecții și buget">
    <div className="catalog-filter-section">
      <div className="catalog-filter-label"><h3>Colecții</h3><span>{categories.filter(c => !c.parent_id).length}</span></div>
      <nav className="catalog-collections" aria-label="Filtrează după colecție">
        <Link className={'catalog-collection' + (!category ? ' is-active' : '')} to={categoryHref()} onClick={onCategory} aria-current={!category ? 'page' : undefined}><span className="catalog-radio"/><span>Toate creațiile</span><Sparkles size={15}/></Link>
        {categories.filter(c => !c.parent_id).map(c => <div key={c.id} className="catalog-collection-group">
          <Link className={'catalog-collection' + (category === c.slug ? ' is-active' : '')} to={categoryHref(c.slug)} onClick={onCategory} aria-current={category === c.slug ? 'page' : undefined}><span className="catalog-radio"/><span>{c.name}</span><small>{c.product_count}</small></Link>
          {categories.filter(child => child.parent_id === c.id).map(child => <Link key={child.id} className={'catalog-subcollection' + (category === child.slug ? ' is-active' : '')} to={categoryHref(child.slug)} onClick={onCategory} aria-current={category === child.slug ? 'page' : undefined}><span/>{child.name}{category === child.slug && <Check size={13}/>}</Link>)}
        </div>)}
      </nav>
    </div>
    <div className="catalog-filter-section catalog-budget">
      <div className="catalog-filter-label"><h3>Bugetul tău</h3><span>LEI</span></div>
      <div className="catalog-price-presets">{priceRanges.map(range => <button key={range.label} type="button" className={params.get('min') === (range.min || null) && params.get('max') === (range.max || null) ? 'is-active' : ''} onClick={() => chooseRange(range)}>{range.label}</button>)}</div>
      <form onSubmit={e => {e.preventDefault(); applyPrices();}}>
        <div className="catalog-price-inputs"><label htmlFor={id + '-min'}>De la<div><input id={id + '-min'} aria-label="Preț minim" type="number" min="0" step="any" inputMode="decimal" placeholder="0" value={prices.min} onChange={e => setPrices(p => ({...p, min: e.target.value}))} aria-invalid={!!priceError} aria-describedby={priceError ? id + '-error' : undefined}/><span>lei</span></div></label><span className="catalog-price-dash">—</span><label htmlFor={id + '-max'}>Până la<div><input id={id + '-max'} aria-label="Preț maxim" type="number" min="0" step="any" inputMode="decimal" placeholder="Oricât" value={prices.max} onChange={e => setPrices(p => ({...p, max: e.target.value}))} aria-invalid={!!priceError} aria-describedby={priceError ? id + '-error' : undefined}/><span>lei</span></div></label></div>
        {priceError && <p className="catalog-price-error" id={id + '-error'} role="alert">{priceError}</p>}
        <button className="catalog-apply-price" type="submit">Aplică bugetul<ArrowRight size={15}/></button>
      </form>
    </div>
    {activeCount > 0 && <button className="catalog-reset" type="button" onClick={clearFilters}><RotateCcw size={14}/>Șterge filtrele<span>{activeCount}</span></button>}
    <div className="catalog-filter-note"><Leaf size={19}/><p>Fiecare creație începe cu flori<br/>alese cu grijă.</p></div>
    </div>
  </div>;
}

export default function Shop({category}) {
  const store = useStore(), navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const [prices, setPrices] = useState({min: params.get('min') || '', max: params.get('max') || ''});
  const [priceError, setPriceError] = useState('');
  const [result, setResult] = useState({data: null, loading: true, error: ''});
  const [retry, setRetry] = useState(0);
  const controlsRef = useRef(null), gridRef = useRef(null), searchRef = useRef(null);
  const categories = store.data?.categories || [];
  const selectedCategory = categories.find(c => c.slug === category);
  const q = params.get('q') || '', min = params.get('min') || '', max = params.get('max') || '';
  const query = new URLSearchParams(params);
  if (category) query.set('category', category);
  else query.delete('category');
  const queryString = query.toString();
  const activeCount = Number(!!category) + Number(!!q) + Number(!!(min || max));

  useEffect(() => {
    const controller = new AbortController();
    setResult(previous => ({...previous, loading: true, error: ''}));
    api('/products?' + queryString, {signal: controller.signal})
      .then(data => {if (!controller.signal.aborted) setResult({data, loading: false, error: ''});})
      .catch(error => {if (!controller.signal.aborted) setResult({data: null, loading: false, error: error.message});});
    return () => controller.abort();
  }, [queryString, retry]);

  useEffect(() => {setSearch(q);}, [q, category]);
  useEffect(() => {setPrices({min, max}); setPriceError('');}, [min, max]);
  useEffect(() => {
    if (search.trim() === q) return;
    const timeout = window.setTimeout(() => {
      setParams(previous => {
        const next = new URLSearchParams(previous);
        search.trim() ? next.set('q', search.trim()) : next.delete('q');
        next.delete('page');
        return next;
      }, {replace: true});
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search, q, setParams]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 1000px)');
    const closeOnDesktop = () => {if (media.matches) setFiltersOpen(false);};
    media.addEventListener('change', closeOnDesktop);
    return () => {document.body.style.overflow = previous; media.removeEventListener('change', closeOnDesktop);};
  }, [filtersOpen]);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll('.catalog-card') || [];
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('is-visible'); observer.unobserve(entry.target);}
    }), {threshold: 0.06, rootMargin: '0px 0px 35px 0px'});
    cards.forEach(card => {card.classList.add('catalog-card-ready'); observer.observe(card);});
    return () => observer.disconnect();
  }, [result.data, result.loading]);

  const scrollToCatalog = () => window.requestAnimationFrame(() => controlsRef.current?.scrollIntoView({block: 'start', behavior: prefersReducedMotion() ? 'instant' : 'smooth'}));
  const updateParams = (values, scroll = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(values).forEach(([key, value]) => value !== '' && value !== null ? next.set(key, value) : next.delete(key));
      if (!('page' in values)) next.delete('page');
      return next;
    });
    if (scroll) scrollToCatalog();
  };
  const categoryHref = slug => {
    const next = new URLSearchParams(params);
    next.delete('page'); next.delete('category');
    return (slug ? '/categorie/' + slug : '/magazin') + (next.size ? '?' + next.toString() : '');
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    ['q', 'min', 'max', 'page', 'category'].forEach(key => next.delete(key));
    setSearch(''); setPrices({min: '', max: ''}); setPriceError('');
    navigate('/magazin' + (next.size ? '?' + next.toString() : ''));
  };
  const applyPrices = (close = false) => {
    if ([prices.min, prices.max].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
      setPriceError('Introdu un buget valid, mai mare sau egal cu 0.'); return false;
    }
    if (prices.min !== '' && prices.max !== '' && Number(prices.min) > Number(prices.max)) {
      setPriceError('Suma maximă trebuie să fie cel puțin egală cu suma minimă.'); return false;
    }
    setPriceError(''); updateParams({min: prices.min, max: prices.max}, !filtersOpen);
    if (close) {setFiltersOpen(false); scrollToCatalog();}
    return true;
  };
  const chooseRange = range => {
    setPriceError(''); setPrices({min: range.min, max: range.max});
    updateParams({min: range.min, max: range.max}, !filtersOpen);
  };
  const filterProps = {categories, category, categoryHref, onCategory: () => setFiltersOpen(false), params, prices, setPrices, priceError, applyPrices, chooseRange, clearFilters, activeCount};
  const primaryCategories = categories.filter(item => !item.parent_id);
  const activePrimaryCategory = selectedCategory?.parent_id ? categories.find(item => Number(item.id) === Number(selectedCategory.parent_id))?.slug : category;
  const total = result.data?.total;
  const page = result.data?.page || 1, pages = result.data?.pages || 0;
  const priceLabel = min && max ? `${min} – ${max} lei` : min ? `De la ${min} lei` : `Până la ${max} lei`;

  if (category && store.data && !selectedCategory) return <section className="catalog-empty"><Flower2/><h1>Colecția nu a fost găsită.</h1><Link className="catalog-primary" to="/magazin">Descoperă magazinul<ArrowRight size={17}/></Link></section>;

  return <section className="catalog-page">
    <header className="catalog-hero">
      <span className="catalog-hero-orbit" aria-hidden="true"/>
      <div className="catalog-hero-inner">
        <div className="catalog-hero-copy">
          <nav className="catalog-breadcrumb" aria-label="Fir de navigare"><Link to="/">Acasă</Link><ChevronRight size={11}/>{category ? <><Link to="/magazin">Magazin</Link><ChevronRight size={11}/><span>{selectedCategory?.name || 'Colecție'}</span></> : <span>Magazin</span>}</nav>
          <span className="catalog-kicker"><span/>COLECȚIILE FLORALIS</span>
          <h1>{selectedCategory ? <>{selectedCategory.name}<em>alese cu inima.</em></> : <>Florile spun<em>povestea ta.</em></>}</h1>
          <p>{selectedCategory?.description || 'Un gest delicat. O emoție sinceră. Alege creația care spune ce simți.'}</p>
          <div className="catalog-hero-details"><span><Leaf size={15}/>Flori alese cu grijă</span><i/><span>Create în atelier</span></div>
        </div>
        <div className="catalog-hero-art" aria-hidden="true"><span className="catalog-art-ring"/><div className="catalog-art-photo"><img src="/assets/floralis/hero-desktop.webp" alt="" fetchPriority="high" decoding="async"/></div><span className="catalog-art-caption"><Flower2 size={19}/><span>ARTA DE A DĂRUI<em>cu Floralis.</em></span></span><span className="catalog-art-spark"><Sparkles size={22}/></span></div>
      </div>
    </header>

    <div className="catalog-layout">
      <aside className="catalog-sidebar" aria-label="Filtre magazin"><FilterPanel {...filterProps}/></aside>
      <div className="catalog-results">
        <div className="catalog-search-area">
          <form className="catalog-search-form" role="search" onSubmit={e => {e.preventDefault(); updateParams({q: search.trim()});}}>
            <Search size={20}/><input ref={searchRef} type="search" name="q" autoComplete="off" placeholder="Ce flori îți dorești astăzi?" aria-label="Caută în colecții" value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <button type="button" className="catalog-search-clear" aria-label="Șterge căutarea" onClick={() => {setSearch(''); updateParams({q: ''}); searchRef.current?.focus();}}><X size={16}/></button>}
            <button className="catalog-search-submit" type="submit"><span>Caută</span><ArrowRight size={17}/></button>
          </form>
          <div className="catalog-category-shortcuts">
            <div className="catalog-category-shortcuts-head"><span>COLECȚII RAPIDE</span><small>Glisează și alege <ArrowRight size={12}/></small></div>
            <nav className="catalog-category-rail" aria-label="Categorii principale">
              <Link className={'catalog-category-shortcut catalog-category-all' + (!category ? ' is-active' : '')} style={{'--category-index': 0}} to={categoryHref()} onClick={scrollToCatalog} aria-current={!category ? 'page' : undefined}><span className="catalog-category-visual"><Sparkles size={19}/></span><span className="catalog-category-copy"><small>ÎNTREGUL MAGAZIN</small><strong>Toate creațiile</strong></span><i aria-hidden="true"><ArrowRight size={11}/></i></Link>
              {primaryCategories.map((item, index) => <Link className={'catalog-category-shortcut' + (activePrimaryCategory === item.slug ? ' is-active' : '')} style={{'--category-index': index + 1}} key={item.id} to={categoryHref(item.slug)} onClick={scrollToCatalog} aria-current={activePrimaryCategory === item.slug ? 'page' : undefined}>
                <span className="catalog-category-visual">{item.image ? <img src={item.image} alt="" loading="lazy" decoding="async"/> : <Flower2 size={19}/>}</span>
                <span className="catalog-category-copy"><small>COLECȚIE</small><strong>{item.name === 'Nunta' ? 'Nuntă' : item.name === 'Craciun' ? 'Crăciun' : item.name}</strong></span>
                <i aria-label={countLabel(Number(item.product_count) || 0)}>{Number(item.product_count) || 0}</i>
              </Link>)}
            </nav>
          </div>
        </div>
        <div className="catalog-controls" ref={controlsRef}>
          <div className="catalog-toolbar">
            <div className="catalog-result-count"><span className={'catalog-status-dot' + (result.loading ? ' is-loading' : '')}/><span>{result.loading ? 'Pregătim colecția…' : result.error ? 'Colecțiile Floralis' : <><strong>{total ?? 0}</strong> {total === 1 ? 'creație' : 'creații'}<span className="catalog-count-extra"> de descoperit</span></>}</span></div>
            <button className="catalog-filter-toggle" type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}><SlidersHorizontal size={16}/><span>Filtre</span>{activeCount > 0 && <b>{activeCount}</b>}</button>
            <label className="catalog-sort"><ArrowDownWideNarrow size={16}/><select aria-label="Sortează produsele" value={params.get('sort') || 'recommended'} onChange={e => updateParams({sort: e.target.value}, true)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={13}/></label>
          </div>
          {activeCount > 0 && <div className="catalog-active-filters" aria-label="Filtre active">{category && <Link to={categoryHref()} className="catalog-filter-chip">{selectedCategory?.name}<X size={12}/></Link>}{q && <button type="button" className="catalog-filter-chip" onClick={() => {setSearch(''); updateParams({q: ''});}}>„{q}”<X size={12}/></button>}{(min || max) && <button type="button" className="catalog-filter-chip" onClick={() => updateParams({min: '', max: ''}, true)}>{priceLabel}<X size={12}/></button>}<button className="catalog-clear-all" type="button" onClick={clearFilters}>Șterge tot</button></div>}
        </div>
        <span className="catalog-announcement" role="status" aria-live="polite" aria-atomic="true">{result.loading ? 'Se încarcă produsele.' : result.error || `${countLabel(total ?? 0)} găsite${pages > 1 ? `, pagina ${page} din ${pages}` : ''}.`}</span>
        <div className="catalog-products" aria-busy={result.loading}>
          {result.loading ? <div className="catalog-grid catalog-skeleton-grid" aria-hidden="true">{Array.from({length: 12}, (_, i) => <div className="catalog-skeleton" key={i}><div/><span/><span/><small/></div>)}</div>
          : result.error ? <div className="catalog-empty"><Flower2/><span className="catalog-kicker">COLECȚIA SE LASĂ AȘTEPTATĂ</span><h2>Mai încercăm o dată?</h2><p>{result.error}</p><button className="catalog-primary" type="button" onClick={() => setRetry(n => n + 1)}>Reîncarcă produsele<RotateCcw size={16}/></button></div>
          : result.data?.items.length ? <>
            <div className="catalog-grid" ref={gridRef} key={queryString}>{result.data.items.map((product, index) => <div className="catalog-card" style={{'--card-delay': `${(index % 3) * 75}ms`}} key={product.id}><ProductCard p={product}/></div>)}</div>
            <div className="catalog-pagination-wrap"><span>{countLabel(result.data.items.length)} din {total}</span>{pages > 1 && <nav className="catalog-pagination" aria-label="Pagini catalog"><button type="button" aria-label="Pagina anterioară" disabled={page <= 1} onClick={() => updateParams({page: page - 1}, true)}><ChevronLeft size={17}/></button>{Array.from({length: pages}, (_, i) => <button type="button" key={i} className={page === i + 1 ? 'is-active' : ''} aria-label={'Pagina ' + (i + 1)} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => updateParams({page: i + 1}, true)}>{i + 1}</button>)}<button type="button" aria-label="Pagina următoare" disabled={page >= pages} onClick={() => updateParams({page: page + 1}, true)}><ChevronRight size={17}/></button></nav>}<button className="catalog-back-top" type="button" onClick={scrollToCatalog}>Înapoi la colecție<ArrowLeft size={14}/></button></div>
          </> : <div className="catalog-empty"><span className="catalog-empty-flower"><Flower2 size={37}/></span><span className="catalog-kicker">MAI SUNT FLORI DE DESCOPERIT</span><h2>Un alt gând,<br/><em>alte flori.</em></h2><p>Nu am găsit creații pentru această selecție. Încearcă un alt nume, o altă colecție sau un buget diferit.</p><button className="catalog-primary" type="button" onClick={clearFilters}>Descoperă toate creațiile<ArrowRight size={16}/></button></div>}
        </div>
      </div>
    </div>
    <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} className="catalog-filter-dialog" label="Filtrează colecțiile Floralis" motion>
      <div className="catalog-dialog-heading"><span className="catalog-kicker">SELECȚIA TA FLORALIS</span><h2>Un dar pe gustul tău.</h2></div>
      <div className="catalog-dialog-scroll"><FilterPanel {...filterProps}/></div>
      <div className="catalog-dialog-footer"><button className="catalog-primary" type="button" onClick={() => applyPrices(true)}>{prices.min !== min || prices.max !== max ? 'Aplică și vezi creațiile' : result.loading ? 'Vezi colecția' : `Vezi ${countLabel(total ?? 0)}`}<ArrowRight size={18}/></button><span>Alese cu grijă, dăruite cu drag.</span></div>
    </Dialog>
  </section>;
}
