
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Map as MapIcon, 
  List, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Locate, 
  FileJson, 
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Database,
  RefreshCw,
  PlusCircle,
  Layers,
  Check,
  Search,
  Crosshair,
  Type,
  Info,
  Navigation,
  MapPin,
  Clock,
  StickyNote,
  Save,
  Ruler,
  RotateCcw,
  User,
  Home,
  Menu,
  ExternalLink,
  Satellite,
  Edit2,
  Globe,
  Tag,
  Map as MapComponentIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Site, UserLocation, Country, CustomerLocation } from './types';
import { COUNTRIES as DEFAULT_COUNTRIES, ICON_OPTIONS, CSV_HEADERS } from './constants';
import { calculateDistance, calculateBearing, getCardinalDirection } from './utils/geoUtils';
import SiteIcon from './components/SiteIcon';
import { translations, Language } from './translations';

// Component to handle map center changes
const MapViewUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks for coordinate selection and measurement
const MapClickHandler: React.FC<{ 
  isMeasuring: boolean;
  onLocationSelect: (lat: number, lng: number) => void;
  onMeasureClick: (lat: number, lng: number) => void;
}> = ({ isMeasuring, onLocationSelect, onMeasureClick }) => {
  useMapEvents({
    click(e) {
      if (isMeasuring) {
        onMeasureClick(e.latlng.lat, e.latlng.lng);
      } else {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const App: React.FC = () => {
  // --- State ---
  const [sites, setSites] = useState<Site[]>(() => {
    const saved = localStorage.getItem('tower_mapper_sites');
    return saved ? JSON.parse(saved) : [];
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('tower_mapper_lang') as Language) || 'en';
  });
  const [availableCountries, setAvailableCountries] = useState<Country[]>(() => {
    const saved = localStorage.getItem('tower_mapper_countries');
    return saved ? JSON.parse(saved) : DEFAULT_COUNTRIES;
  });
  const [selectedCountry, setSelectedCountry] = useState<Country>(availableCountries[0]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation | null>(() => {
    const saved = localStorage.getItem('tower_mapper_customer');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'settings'>('add');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  
  // Map layers
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  
  // Selection and Detail Panel state
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Site>>({});
  
  // Measurement tool state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [newSite, setNewSite] = useState({ name: '', category: '', lat: '', lng: '', type: 'tower', icon: 'tower' });
  const [newCountryForm, setNewCountryForm] = useState({ name: '', lat: '', lng: '', zoom: '6' });

  // Derived state: Filtered list of sites based on search query
  const filteredSitesList = sites.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (site.category && site.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (site.notes && site.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Layer control state
  const [visibleTypes, setVisibleTypes] = useState<string[]>(ICON_OPTIONS.map(opt => opt.value));
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
  const isRTL = language === 'ar';

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('tower_mapper_sites', JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    localStorage.setItem('tower_mapper_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('tower_mapper_countries', JSON.stringify(availableCountries));
  }, [availableCountries]);

  useEffect(() => {
    if (customerLocation) {
      localStorage.setItem('tower_mapper_customer', JSON.stringify(customerLocation));
    } else {
      localStorage.removeItem('tower_mapper_customer');
    }
  }, [customerLocation]);

  useEffect(() => {
    if (selectedSite) {
      const updated = sites.find(s => s.id === selectedSite.id);
      if (updated && !isEditMode) {
        setSelectedSite(updated);
      }
    }
  }, [sites, selectedSite, isEditMode]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Handlers ---
  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(loc);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not access location.");
        }
      );
    } else {
      alert("Geolocation is not supported.");
    }
  };

  const handleMapClickSelection = (lat: number, lng: number) => {
    setNewSite(prev => ({
      ...prev,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6)
    }));
    setActiveTab('add');
    if (!isSidebarOpen) setIsSidebarOpen(true);
    if (selectedSite) setSelectedSite(null);
  };

  const handleSetCustomer = () => {
    if (newSite.lat && newSite.lng) {
      setCustomerLocation({
        lat: parseFloat(newSite.lat),
        lng: parseFloat(newSite.lng),
        name: newSite.name || 'Current Prospect'
      });
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } else {
      alert("Please select coordinates on the map or enter them first.");
    }
  };

  const handleMeasurePointAdd = (lat: number, lng: number) => {
    setMeasurePoints(prev => [...prev, [lat, lng]]);
  };

  const toggleMeasurementTool = () => {
    if (isMeasuring) setMeasurePoints([]);
    setIsMeasuring(!isMeasuring);
    if (!isMeasuring && window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const clearMeasurement = () => setMeasurePoints([]);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name || !newSite.lat || !newSite.lng) return;

    const site: Site = {
      id: crypto.randomUUID(),
      name: newSite.name,
      category: newSite.category,
      lat: parseFloat(newSite.lat),
      lng: parseFloat(newSite.lng),
      type: newSite.type,
      icon: newSite.icon,
      notes: ''
    };

    setSites(prev => [...prev, site]);
    setNewSite({ name: '', category: '', lat: '', lng: '', type: 'tower', icon: 'tower' });
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleDeleteSite = (id: string) => {
    if (confirm(t('decommission_confirm'))) {
      if (selectedSite?.id === id) {
        setSelectedSite(null);
        setIsEditMode(false);
      }
      setSites(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
  };

  const handleStartEdit = (site: Site) => {
    setEditFormData({ ...site });
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!editFormData.id) return;
    setSites(prev => prev.map(s => s.id === editFormData.id ? { ...s, ...editFormData } as Site : s));
    setIsEditMode(false);
    setSelectedSite({ ...selectedSite, ...editFormData } as Site);
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountryForm.name || !newCountryForm.lat || !newCountryForm.lng) return;
    const country: Country = {
      name: newCountryForm.name,
      code: newCountryForm.name.substring(0, 2).toUpperCase(),
      center: [parseFloat(newCountryForm.lat), parseFloat(newCountryForm.lng)],
      zoom: parseInt(newCountryForm.zoom) || 6
    };
    setAvailableCountries(prev => [...prev, country]);
    setSelectedCountry(country);
    setNewCountryForm({ name: '', lat: '', lng: '', zoom: '6' });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sites));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `tower_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (importMode === 'replace') setSites(json);
          else setSites(prev => [...prev, ...json]);
        }
      } catch (err) {
        alert("Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadCSVTemplate = (empty: boolean = false) => {
    const rows = [([...CSV_HEADERS, 'category']).join(',')];
    if (!empty) {
      rows.push("Main Hub,26.3351,17.2283,tower,tower,Primary site for region,Hub");
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", empty ? "tower_template_empty.csv" : "tower_template_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const importedSites: Site[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const siteData: any = {};
        headers.forEach((h, idx) => { siteData[h] = values[idx]; });
        const lat = parseFloat(siteData.latitude || siteData.lat);
        const lng = parseFloat(siteData.longitude || siteData.lng);
        if (siteData.name && !isNaN(lat) && !isNaN(lng)) {
          importedSites.push({
            id: crypto.randomUUID(),
            name: siteData.name,
            lat: lat,
            lng: lng,
            type: siteData.type || 'tower',
            icon: siteData.icon || 'tower',
            category: siteData.category || '',
            notes: siteData.notes || ''
          });
        }
      }
      if (importMode === 'replace') setSites(importedSites);
      else setSites(prev => [...prev, ...importedSites]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleLayer = (type: string) => {
    setVisibleTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const createCustomIcon = (iconName: string, label: string, showLabel: boolean, color: string = '#2563eb') => {
    return L.divIcon({
      html: `
        <div class="flex flex-col items-center">
          <div class="p-1 rounded-full bg-white border-2 border-white shadow-xl flex items-center justify-center transition-all hover:scale-125" style="color: ${color};">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${iconName === 'tower' ? '<path d="M11 2h2v20h-2z"/><path d="M5 22h14"/><path d="M12 2l-7 20"/><path d="M12 2l7 20"/><path d="M2 18h20"/>' : 
                iconName === 'radio' ? '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>' :
                iconName === 'signal' ? '<path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 20V4"/>' :
                iconName === 'database' ? '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>' :
                iconName === 'customer' ? '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' :
                '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'}
            </svg>
          </div>
          ${showLabel ? `<div class="mt-1 px-2 py-0.5 bg-white/95 backdrop-blur border border-slate-200 rounded-md text-[9px] font-black text-slate-800 shadow-lg whitespace-nowrap pointer-events-none">${label}</div>` : ''}
        </div>
      `,
      className: '',
      iconSize: showLabel ? [100, 50] : [32, 32],
      iconAnchor: showLabel ? [50, 16] : [16, 16],
    });
  };

  const userIcon = L.divIcon({
    html: `<div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-2xl animate-pulse"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const customerIconMarker = L.divIcon({
    html: `<div class="p-1 rounded-full bg-orange-500 border-2 border-white shadow-2xl flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const measureIcon = L.divIcon({
    html: `<div class="w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white shadow-xl"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-slate-900 font-sans relative ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 transition-transform duration-500 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 flex flex-col shadow-2xl lg:shadow-none lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 w-[90vw] sm:w-80 md:w-[400px]' : (isRTL ? 'translate-x-full' : '-translate-x-full') + ' w-[90vw] sm:w-80 md:w-[400px]'}`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xl">
              <MapIcon size={22} />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-900 leading-none">{t('sidebar_title')}</h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{sites.length} {t('nodes_count')}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 lg:hidden">
            <X size={24} />
          </button>
        </div>

        <div className="flex bg-white border-b border-slate-100 shrink-0 sticky top-0 z-10">
          {(['add', 'list', 'settings'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {t(`${tab}_tab` as any)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar bg-white">
          {activeTab === 'add' && (
            <div className="space-y-6">
              <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-xl flex gap-3 relative overflow-hidden">
                <Crosshair size={20} className="shrink-0 mt-0.5" />
                <div className="relative z-10">
                  <p className="text-xs font-bold">{t('tip_pick')}</p>
                </div>
              </div>

              <form onSubmit={handleAddSite} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('site_name')}</label>
                  <input 
                    type="text" 
                    value={newSite.name}
                    onChange={e => setNewSite({...newSite, name: e.target.value})}
                    placeholder="..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 text-sm font-semibold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('category')}</label>
                  <input 
                    type="text" 
                    value={newSite.category}
                    onChange={e => setNewSite({...newSite, category: e.target.value})}
                    placeholder="e.g. Backbone, Client, Storage"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 text-sm font-semibold transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('latitude')}</label>
                    <input 
                      type="number" step="any"
                      value={newSite.lat}
                      onChange={e => setNewSite({...newSite, lat: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 text-sm font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('longitude')}</label>
                    <input 
                      type="number" step="any"
                      value={newSite.lng}
                      onChange={e => setNewSite({...newSite, lng: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 text-sm font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('icon_type')}</label>
                  <div className="grid grid-cols-5 gap-2.5">
                    {ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewSite({...newSite, icon: opt.value, type: opt.value})}
                        className={`p-3.5 rounded-xl border-2 flex items-center justify-center transition-all ${newSite.icon === opt.value ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        <SiteIcon type={opt.value} size={22} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs">
                    <Plus size={18} strokeWidth={3} /> {t('add_site')}
                  </button>
                  <button type="button" onClick={handleSetCustomer} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs">
                    <User size={18} strokeWidth={3} /> {t('set_customer')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-6">
              <div className="relative group">
                <Search size={18} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
                <input 
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:outline-none`}
                />
              </div>

              <div className="space-y-3.5">
                {filteredSitesList.map(site => (
                  <div 
                    key={site.id} 
                    onClick={() => { setSelectedSite(site); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                    className={`p-4 bg-slate-50 rounded-2xl border-2 transition-all cursor-pointer ${selectedSite?.id === site.id ? 'border-blue-600 bg-blue-50/50 shadow-lg' : 'border-slate-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white text-blue-600 shadow-md">
                          <SiteIcon type={site.icon} size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{site.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-slate-400 font-mono font-bold">{site.lat.toFixed(4)}, {site.lng.toFixed(4)}</p>
                            {site.category && <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-black uppercase">{site.category}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }} className="p-2.5 text-slate-300 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('language')}</label>
                <div className="flex gap-2">
                  {(['en', 'ar', 'fr'] as Language[]).map(lang => (
                    <button 
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest ${language === lang ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('map_region')}</label>
                <select 
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const country = availableCountries.find(c => c.code === e.target.value);
                    if (country) setSelectedCountry(country);
                  }}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black appearance-none cursor-pointer"
                >
                  {availableCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('add_country')}</h3>
                <form onSubmit={handleAddCountry} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder={t('country_name')}
                    value={newCountryForm.name}
                    onChange={e => setNewCountryForm({...newCountryForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="number" step="any"
                      placeholder="Lat"
                      value={newCountryForm.lat}
                      onChange={e => setNewCountryForm({...newCountryForm, lat: e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono"
                    />
                    <input 
                      type="number" step="any"
                      placeholder="Lng"
                      value={newCountryForm.lng}
                      onChange={e => setNewCountryForm({...newCountryForm, lng: e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono"
                    />
                    <input 
                      type="number"
                      placeholder="Zoom"
                      value={newCountryForm.zoom}
                      onChange={e => setNewCountryForm({...newCountryForm, zoom: e.target.value})}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px]"
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <MapComponentIcon size={14} /> {t('save_country')}
                  </button>
                </form>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('data_mgmt')}</h3>
                <button onClick={handleExportJSON} className="flex items-center gap-4 w-full px-5 py-4 bg-white border-2 border-slate-100 hover:border-blue-200 rounded-2xl text-xs font-black text-slate-700">
                  <FileJson size={20} className="text-blue-500" /> {t('export_json')}
                </button>
                <label className="flex items-center gap-4 w-full px-5 py-4 bg-white border-2 border-slate-100 hover:border-blue-200 rounded-2xl text-xs font-black text-slate-700 cursor-pointer">
                  <Upload size={20} className="text-blue-500" /> {t('import_json')}
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
                <button onClick={() => handleDownloadCSVTemplate(true)} className="flex items-center gap-4 w-full px-5 py-4 bg-white border-2 border-slate-100 hover:border-emerald-200 rounded-2xl text-xs font-black text-slate-700">
                  <Download size={20} className="text-emerald-500" /> {t('empty_template')}
                </button>
                <label className="flex items-center gap-4 w-full px-5 py-4 bg-white border-2 border-slate-100 hover:border-emerald-200 rounded-2xl text-xs font-black text-slate-700 cursor-pointer">
                  <FileSpreadsheet size={20} className="text-emerald-500" /> {t('bulk_load')}
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Map Container */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 relative h-full">
          <MapContainer center={selectedCountry.center} zoom={selectedCountry.zoom} className="h-full w-full" zoomControl={false}>
            <TileLayer
              url={mapType === 'street' 
                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              }
            />
            <MapViewUpdater center={selectedCountry.center} zoom={selectedCountry.zoom} />
            <MapClickHandler isMeasuring={isMeasuring} onLocationSelect={handleMapClickSelection} onMeasureClick={handleMeasurePointAdd} />

            {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />}
            {customerLocation && <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIconMarker} />}
            {sites.filter(s => visibleTypes.includes(s.icon)).map(site => (
              <Marker key={site.id} position={[site.lat, site.lng]} icon={createCustomIcon(site.icon, site.name, showLabels, selectedSite?.id === site.id ? '#10b981' : '#2563eb')} eventHandlers={{ click: () => setSelectedSite(site) }} />
            ))}
            {isMeasuring && measurePoints.length > 1 && <Polyline positions={measurePoints} color="#f43f5e" weight={4} dashArray="10, 15" />}
          </MapContainer>

          <div className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20 flex flex-col gap-4`}>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-4 bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200">
                <Menu size={26} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20 flex flex-col gap-4`}>
            <div className="flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
              <button onClick={handleLocateUser} className={`p-5 hover:bg-slate-50 ${userLocation ? 'text-blue-600' : 'text-slate-500'}`}><Locate size={26} strokeWidth={2.5} /></button>
              <button onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')} className={`p-5 hover:bg-slate-50 ${mapType === 'satellite' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500'}`}><Satellite size={26} strokeWidth={2.5} /></button>
              <button onClick={toggleMeasurementTool} className={`p-5 hover:bg-slate-50 ${isMeasuring ? 'bg-rose-50 text-rose-600' : 'text-slate-500'}`}><Ruler size={26} strokeWidth={2.5} /></button>
              <button onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)} className={`p-5 hover:bg-slate-50 ${isLayerMenuOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}><Layers size={26} strokeWidth={2.5} /></button>
              
              {isLayerMenuOpen && (
                <div className={`absolute ${isRTL ? 'left-20' : 'right-20'} top-48 bg-white border border-slate-200 rounded-3xl shadow-2xl w-56 py-3`}>
                  <button onClick={() => setShowLabels(!showLabels)} className="flex items-center gap-4 w-full px-5 py-3.5 text-xs font-black text-slate-800 hover:bg-slate-50">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${showLabels ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}`}>
                      {showLabels && <Check size={18} strokeWidth={4} />}
                    </div>
                    {t('street')}
                  </button>
                  <div className="h-px bg-slate-100 mx-3 my-1.5" />
                  {ICON_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => toggleLayer(opt.value)} className="flex items-center gap-4 w-full px-5 py-3 text-[11px] font-bold text-slate-500 hover:bg-slate-50">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${visibleTypes.includes(opt.value) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                        {visibleTypes.includes(opt.value) && <Check size={14} strokeWidth={4} />}
                      </div>
                      <SiteIcon type={opt.value} size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Site Details Overlay */}
        <aside 
          className={`fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} z-40 transition-transform duration-500 bg-white border-${isRTL ? 'r' : 'l'} border-slate-200 flex flex-col shadow-2xl lg:shadow-none lg:relative lg:translate-x-0 ${selectedSite ? 'translate-x-0 w-[90vw] sm:w-80 md:w-[420px]' : (isRTL ? '-translate-x-full' : 'translate-x-full') + ' w-0'}`}
        >
          {selectedSite && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Info size={20} /></div>
                  <h2 className="font-black text-slate-900 text-sm uppercase tracking-widest">{t('inspection_mode')}</h2>
                </div>
                <div className="flex items-center gap-2">
                   {!isEditMode && <button onClick={() => handleStartEdit(selectedSite)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={20} /></button>}
                   <button onClick={() => { setSelectedSite(null); setIsEditMode(false); }} className="p-2 text-slate-400 hover:text-slate-600"><X size={28} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="text-center pb-8 border-b border-slate-100">
                  <div className="inline-flex p-6 rounded-[2.5rem] bg-blue-50 text-blue-600 mb-5 shadow-inner"><SiteIcon type={isEditMode ? editFormData.icon || selectedSite.icon : selectedSite.icon} size={48} /></div>
                  
                  {isEditMode ? (
                    <div className="space-y-4 text-left" dir="ltr">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">{t('site_name')}</label>
                        <input 
                          type="text" 
                          value={editFormData.name} 
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-4 py-2 bg-white border-2 border-blue-100 rounded-xl font-black text-slate-900" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">{t('category')}</label>
                        <input 
                          type="text" 
                          value={editFormData.category} 
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-full px-4 py-2 bg-white border-2 border-blue-100 rounded-xl font-black text-slate-900" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400">{t('latitude')}</label>
                          <input 
                            type="number" step="any"
                            value={editFormData.lat} 
                            onChange={(e) => setEditFormData({ ...editFormData, lat: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400">{t('longitude')}</label>
                          <input 
                            type="number" step="any"
                            value={editFormData.lng} 
                            onChange={(e) => setEditFormData({ ...editFormData, lng: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                         {ICON_OPTIONS.map(opt => (
                           <button key={opt.value} onClick={() => setEditFormData({ ...editFormData, icon: opt.value, type: opt.value })} className={`p-2 rounded-lg border ${editFormData.icon === opt.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200'}`}><SiteIcon type={opt.value} size={16} /></button>
                         ))}
                      </div>
                      <button onClick={handleSaveEdit} className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">{t('save_changes')}</button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedSite.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{selectedSite.type}</span>
                        {selectedSite.category && <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{selectedSite.category}</span>}
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${selectedSite.lat},${selectedSite.lng}`, '_blank')} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><ExternalLink size={14} /></button>
                      </div>
                    </>
                  )}
                </div>

                {!isEditMode && (
                  <div className="space-y-5">
                    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center gap-4">
                      <div className="p-2.5 bg-white rounded-xl text-slate-400 shadow-sm"><MapPin size={22} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t('global_coords')}</p>
                        <p className="text-sm font-mono font-black text-slate-800">{selectedSite.lat.toFixed(6)}, {selectedSite.lng.toFixed(6)}</p>
                      </div>
                    </div>

                    {userLocation && (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border-2 border-blue-100 flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-sm"><Locate size={22} /></div>
                        <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">{t('field_separation')}</p>
                          <p className="text-lg font-black text-blue-800 leading-none">{calculateDistance(userLocation.lat, userLocation.lng, selectedSite.lat, selectedSite.lng).toFixed(2)} km</p>
                        </div>
                      </div>
                    )}

                    {customerLocation && (
                      <div className="p-5 bg-orange-600 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                          <div className="p-2.5 bg-white/20 rounded-xl"><Home size={22} /></div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('client_proximity')}</p>
                        </div>
                        <div className="flex justify-between items-end relative z-10">
                          <div>
                            <p className="text-3xl font-black font-mono leading-none tracking-tighter">{calculateDistance(customerLocation.lat, customerLocation.lng, selectedSite.lat, selectedSite.lng).toFixed(2)} km</p>
                            <p className="text-[11px] font-bold opacity-80 mt-2">{t('azimuth')}: {calculateBearing(customerLocation.lat, customerLocation.lng, selectedSite.lat, selectedSite.lng).toFixed(0)}° ({getCardinalDirection(calculateBearing(customerLocation.lat, customerLocation.lng, selectedSite.lat, selectedSite.lng))})</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2.5"><StickyNote size={18} className="text-slate-400" /><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('deployment_notes')}</h4></div>
                  <textarea 
                    value={selectedSite.notes || ''}
                    onChange={(e) => handleUpdateNotes(selectedSite.id, e.target.value)}
                    placeholder="..."
                    className="w-full min-h-[160px] p-5 text-sm bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-100 focus:bg-white transition-all resize-none font-bold text-slate-700 leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => handleDeleteSite(selectedSite.id)} className="w-full flex items-center justify-center gap-3 py-4.5 text-red-600 bg-white hover:bg-red-600 hover:text-white border-2 border-red-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">
                  <Trash2 size={18} strokeWidth={3} /> {t('decommission')}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Status Bar Desktop */}
        <div className={`hidden lg:flex absolute bottom-8 ${isRTL ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'} z-20 px-8 py-4 bg-slate-900/90 backdrop-blur-2xl text-white rounded-full shadow-2xl items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em] border border-slate-700/50`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${userLocation ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
            GPS: {userLocation ? 'SYNCED' : 'OFFLINE'}
          </div>
          <div className="flex items-center gap-4">
            <SiteIcon type="tower" size={16} className="text-blue-400" />
            {t('total_sites')}: {sites.length}
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-4 text-blue-400">
            <Globe size={16} />
            {language.toUpperCase()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
