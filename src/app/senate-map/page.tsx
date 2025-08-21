"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function SenateMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState('2024');
  const [viewMode, setViewMode] = useState<'israel' | 'party'>('israel');
  const [israelFilter, setIsraelFilter] = useState<'all' | 'pro' | 'non-pro'>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | 'dem' | 'rep' | 'ind'>('all');
  const [liveRows, setLiveRows] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<any>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
  const ALBERS_STYLE = process.env.NEXT_PUBLIC_MAPBOX_ALBERS_STYLE_URL as string | undefined;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !ALBERS_STYLE || mapRef.current || !mapContainerRef.current) return;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: ALBERS_STYLE,
        center: [-98.5, 39.5],
        zoom: 3,
        attributionControl: false,
        logoPosition: 'bottom-left',
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current.on('load', () => {
        const map = mapRef.current!;
        const layers = map.getStyle()?.layers || [];
        for (const layer of layers) {
          if (layer.type !== 'background') {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch {}
          }
        }
        setMapLoaded(true);
      });
      mapRef.current.on('error', (e) => {
        const message = (e as any)?.error?.message || 'Mapbox error';
        setError(message);
      });
    } catch {
      setError('Failed to initialize map');
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [MAPBOX_TOKEN, ALBERS_STYLE]);

  const getFillColor = () => {
    if (viewMode === 'israel') {
      const totalExpr: any = ['+',
        ['coalesce', ['to-number', ['get', 'senator1_total_israel_funding']], 0],
        ['coalesce', ['to-number', ['get', 'senator2_total_israel_funding']], 0]
      ];
      return [
        'case',
        ['==', totalExpr, 0], '#22c55e',
        ['all', ['>', totalExpr, 0], ['<', totalExpr, 10000]], '#fbbf24',
        ['all', ['>=', totalExpr, 10000], ['<', totalExpr, 50000]], '#ea580c',
        ['>=', totalExpr, 50000], '#dc2626',
        '#9ca3af'
      ];
    }
    // Party: majority color; split is purple
    const demCount: any = ['+', ['case', ['==', ['get', 'senator1_party'], 'DEM'], 1, 0], ['case', ['==', ['get', 'senator2_party'], 'DEM'], 1, 0]];
    const repCount: any = ['+', ['case', ['==', ['get', 'senator1_party'], 'REP'], 1, 0], ['case', ['==', ['get', 'senator2_party'], 'REP'], 1, 0]];
    return ['case', ['>', demCount, repCount], '#3b82f6', ['>', repCount, demCount], '#dc2626', '#6b21a8'];
  };

  const getFillOpacity = () => {
    if (viewMode === 'israel') {
      const totalExpr: any = ['+',
        ['coalesce', ['to-number', ['get', 'senator1_total_israel_funding']], 0],
        ['coalesce', ['to-number', ['get', 'senator2_total_israel_funding']], 0]
      ];
      if (israelFilter === 'all') return 0.8 as any;
      if (israelFilter === 'pro') return ['case', ['>', totalExpr, 0], 0.8, 0.1] as any;
      return ['case', ['==', totalExpr, 0], 0.8, 0.1] as any;
    }
    if (partyFilter === 'all') return 0.8 as any;
    const matchDem: any = ['any', ['==', ['get', 'senator1_party'], 'DEM'], ['==', ['get', 'senator2_party'], 'DEM']];
    const matchRep: any = ['any', ['==', ['get', 'senator1_party'], 'REP'], ['==', ['get', 'senator2_party'], 'REP']];
    return partyFilter === 'dem' ? ['case', matchDem, 0.8, 0.1] as any : ['case', matchRep, 0.8, 0.1] as any;
  };

  const updatePaint = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    // Avoid touching style before it's fully loaded or after teardown
    if (typeof (map as any).isStyleLoaded === 'function' && !(map as any).isStyleLoaded()) return;
    try {
      if (map.getLayer && map.getLayer('state-fill')) {
        map.setPaintProperty('state-fill', 'fill-color', getFillColor() as any);
        map.setPaintProperty('state-fill', 'fill-opacity', getFillOpacity() as any);
      }
    } catch {
      // ignore transient errors during hot reload/unmount
    }
  }, [viewMode, israelFilter, partyFilter]);

  useEffect(() => { if (mapLoaded) updatePaint(); }, [mapLoaded, updatePaint]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const sourceId = 'states';
    const fillId = 'state-fill';
    const lineId = 'state-outline';
    const hoverLineId = 'state-hover-outline';
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/states/us-states-albersbaked-simplified.geojson`);
        if (!res.ok) throw new Error('Failed to load states');
        let data = await res.json();

        const resp = await fetch(`/api/senate-districts?cycle=${encodeURIComponent(selectedCycle)}`);
        if (resp.ok) {
          const payload = await resp.json();
          const rows: any[] = payload?.data || [];
          setLiveRows(rows);
          const byState = new Map<string, any>();
          for (const r of rows) byState.set(r.state, r);
          // Normalize FIPS to postal if needed
          const fipsToPostal: Record<string, string> = {
            '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'
          };
          data = {
            type: 'FeatureCollection',
            features: (data?.features || []).map((f: any) => {
              const props = f?.properties || {};
              const rawFips = (typeof f?.id !== 'undefined') ? String(f.id) : (props.id || props.STATE || props.STATEFP || props.fips || props.ID);
              const fips = rawFips ? String(rawFips).padStart(2, '0') : undefined;
              const st = props.postal || props.STUSPS || props.state || props.STATE_ABBR || (fips ? fipsToPostal[fips] : undefined);
              const stateName = props.state_name || props.STATE_NAME || props.name || '';
              const live = st ? byState.get(st) : undefined;
              const mergedProps = live ? { ...props, postal: st, state: st, state_name: stateName, ...live } : { ...props, postal: st, state: st, state_name: stateName };
              return { ...f, properties: mergedProps };
            })
          };
        }

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data } as any);
          map.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': getFillColor() as any, 'fill-opacity': getFillOpacity() as any } });
          map.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-color': '#ffffff', 'line-width': 0.75 } });
          map.addLayer({ id: hoverLineId, type: 'line', source: sourceId, paint: { 'line-color': '#000000', 'line-width': 3 }, filter: ['==', ['id'], -1] });
          // Fit bounds to fill screen
          try {
            const bounds = new mapboxgl.LngLatBounds();
            for (const f of (data.features || [])) {
              const g: any = f.geometry; if (!g) continue;
              const walk = (c: any) => {
                if (Array.isArray(c[0])) return c.forEach(walk);
                const lng = c[0]; const lat = c[1];
                if (Number.isFinite(lng) && Number.isFinite(lat)) bounds.extend([lng, lat]);
              };
              walk(g.coordinates);
            }
            map.fitBounds(bounds, { padding: 40, animate: false });
          } catch {}
          map.on('click', fillId, (e: any) => {
            const f = e.features && e.features[0];
            if (!f) return;
            setSelectedState(f.properties);
            new mapboxgl.Popup({ closeButton: true })
              .setLngLat(e.lngLat)
              .setHTML(`<div style="font-weight:600;">${f.properties?.state || f.properties?.state_name || f.properties?.name || ''}</div>`) 
              .addTo(map);
          });
          map.on('mouseenter', fillId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mousemove', fillId, (e: any) => {
            const f = e.features && e.features[0];
            const id = f && typeof f.id !== 'undefined' ? f.id : -1;
            try { map.setFilter(hoverLineId, ['==', ['id'], id]); } catch {}
          });
          map.on('mouseleave', fillId, () => {
            map.getCanvas().style.cursor = '';
            try { map.setFilter(hoverLineId, ['==', ['id'], -1]); } catch {}
          });
        } else {
          const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData(data as any);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load state boundaries');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [mapLoaded, selectedCycle]);

  const pieData = useMemo(() => {
    const totals = liveRows.map(r => (Number(r.senator1_total_israel_funding || 0) + Number(r.senator2_total_israel_funding || 0)));
    const green = totals.filter(t => t === 0).length;
    const yellow = totals.filter(t => t > 0 && t < 10000).length;
    const orange = totals.filter(t => t >= 10000 && t < 50000).length;
    const red = totals.filter(t => t >= 50000).length;
    return { green, yellow, orange, red };
  }, [liveRows]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">{error}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <PageHeader
        title="U.S. Senate Map"
        subtitle="Israel funding by state"
        cycle={selectedCycle}
        onCycleChange={setSelectedCycle}
        active="senate-map"
      />

      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4 items-center py-4">

            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">View Mode:</span>
              <button onClick={() => setViewMode('israel')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'israel' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Israel Funding</button>
              <button onClick={() => setViewMode('party')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'party' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Party Affiliation</button>
            </div>

            {viewMode === 'israel' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="israelFilter" value="all" checked={israelFilter === 'all'} onChange={e => setIsraelFilter(e.target.value as any)} className="mr-2"/>All States</label>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="israelFilter" value="pro" checked={israelFilter === 'pro'} onChange={e => setIsraelFilter(e.target.value as any)} className="mr-2"/>Pro-Israel (Yellow/Orange/Red)</label>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="israelFilter" value="non-pro" checked={israelFilter === 'non-pro'} onChange={e => setIsraelFilter(e.target.value as any)} className="mr-2"/>Non-Pro ($0)</label>
              </div>
            )}

            {viewMode === 'party' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="partyFilter" value="all" checked={partyFilter === 'all'} onChange={e => setPartyFilter(e.target.value as any)} className="mr-2"/>All</label>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="partyFilter" value="dem" checked={partyFilter === 'dem'} onChange={e => setPartyFilter(e.target.value as any)} className="mr-2"/>Dem</label>
                <label className="flex items-center text-gray-300 text-sm"><input type="radio" name="partyFilter" value="rep" checked={partyFilter === 'rep'} onChange={e => setPartyFilter(e.target.value as any)} className="mr-2"/>Rep</label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={mapContainerRef} className="w-full h-screen" />

        {/* Legend (upper-left) matching house map */}
        <div className="absolute top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-white text-sm mb-2">{viewMode === 'israel' ? 'Israel Funding by State' : 'Party Affiliation by State'}</h3>
          <div className="space-y-1 text-xs">
            {viewMode === 'israel' ? (
              <>
                <button onClick={() => alert(JSON.stringify(liveRows.filter(r => (Number(r.senator1_total_israel_funding||0)+Number(r.senator2_total_israel_funding||0))===0).map(r=>r.state)))} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-green-500 rounded mr-2"></div><span className="text-gray-300">Green: $0</span></div>
                  {liveRows.length ? <span className="text-gray-200 font-semibold">{pieData.green}</span> : null}
                </button>
                <button onClick={() => alert(JSON.stringify(liveRows.filter(r => {const t=Number(r.senator1_total_israel_funding||0)+Number(r.senator2_total_israel_funding||0);return t>0&&t<10000;}).map(r=>r.state)))} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div><span className="text-gray-300">Yellow: $1-$10K</span></div>
                  {liveRows.length ? <span className="text-gray-200 font-semibold">{pieData.yellow}</span> : null}
                </button>
                <button onClick={() => alert(JSON.stringify(liveRows.filter(r => {const t=Number(r.senator1_total_israel_funding||0)+Number(r.senator2_total_israel_funding||0);return t>=10000&&t<50000;}).map(r=>r.state)))} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-orange-600 rounded mr-2"></div><span className="text-gray-300">Orange: $10K-$50K</span></div>
                  {liveRows.length ? <span className="text-gray-200 font-semibold">{pieData.orange}</span> : null}
                </button>
                <button onClick={() => alert(JSON.stringify(liveRows.filter(r => {const t=Number(r.senator1_total_israel_funding||0)+Number(r.senator2_total_israel_funding||0);return t>=50000;}).map(r=>r.state)))} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-red-600 rounded mr-2"></div><span className="text-gray-300">Red: ≥$50K</span></div>
                  {liveRows.length ? <span className="text-gray-200 font-semibold">{pieData.red}</span> : null}
                </button>
                <div className="flex items-center"><div className="w-4 h-4 bg-gray-500 rounded mr-2"></div><span className="text-gray-300">No Data</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center"><div className="w-4 h-4 bg-blue-500 rounded mr-2"></div><span className="text-gray-300">Democratic</span></div>
                <div className="flex items-center"><div className="w-4 h-4 bg-red-500 rounded mr-2"></div><span className="text-gray-300">Republican</span></div>
                <div className="flex items-center"><div className="w-4 h-4 bg-purple-600 rounded mr-2"></div><span className="text-gray-300">Split Delegation</span></div>
              </>
            )}
          </div>
        </div>

        {/* State details popup */}
      {selectedState && (
        <div className="absolute top-4 left-4 bg-white p-6 rounded-lg shadow-xl z-20 max-w-md">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedState.state || selectedState.state_name || selectedState.name || 'Unknown'}</h3>
              <button onClick={() => setSelectedState(null)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">×</button>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700"><strong>Senior Senator:</strong> {selectedState.senator1_name || 'Unknown'} ({selectedState.senator1_party || 'N/A'})</p>
              <p className="text-gray-700"><strong>Funding:</strong> ${Number(selectedState.senator1_total_israel_funding || 0).toLocaleString()}</p>
              <p className="text-gray-700"><strong>Junior Senator:</strong> {selectedState.senator2_name || 'Unknown'} ({selectedState.senator2_party || 'N/A'})</p>
              <p className="text-gray-700"><strong>Funding:</strong> ${Number(selectedState.senator2_total_israel_funding || 0).toLocaleString()}</p>
              <p className="text-gray-800 font-semibold"><strong>Combined:</strong> ${Number((selectedState.senator1_total_israel_funding || 0) + (selectedState.senator2_total_israel_funding || 0)).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
