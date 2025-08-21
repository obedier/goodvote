"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

declare global {
  interface Window {
    L: any;
  }
}

export default function CongressionalMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState('2024');
  const [viewMode, setViewMode] = useState<'israel' | 'party'>('israel');
  const [israelFilter, setIsraelFilter] = useState<'all' | 'pro' | 'non-pro'>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | 'dem' | 'rep' | 'ind'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [pieChartData, setPieChartData] = useState<any>(null);
  const [liveFundingRows, setLiveFundingRows] = useState<any[]>([]);
  const districtLayer = useRef<any>(null); // kept for compatibility; not used with Mapbox
  const leafletLoaded = true;
  const progressiveLoading = false;
  const [geojsonData, setGeojsonData] = useState<any>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
  const ALBERS_STYLE = process.env.NEXT_PUBLIC_MAPBOX_ALBERS_STYLE_URL as string | undefined;

  // Derive initial view (center/zoom/bearing/pitch) from URL or localStorage
  const getInitialView = () => {
    // Defaults roughly centered on US
    let center: [number, number] = [-98.5, 39.5];
    let zoom = 3;
    let bearing = 0;
    let pitch = 0;

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const cParam = params.get('center'); // format: lon,lat
        const zParam = params.get('zoom');
        const bParam = params.get('bearing');
        const pParam = params.get('pitch');
        if (cParam) {
          const parts = cParam.split(',').map((v) => parseFloat(v));
          if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
            center = [parts[0], parts[1]] as [number, number];
          }
        }
        if (zParam && Number.isFinite(parseFloat(zParam))) zoom = parseFloat(zParam);
        if (bParam && Number.isFinite(parseFloat(bParam))) bearing = parseFloat(bParam);
        if (pParam && Number.isFinite(parseFloat(pParam))) pitch = parseFloat(pParam);
        // Fallback to stored default if no query params
        if (!cParam && !zParam) {
          const saved = localStorage.getItem('goodvote_map_default_view');
          if (saved) {
            const obj = JSON.parse(saved);
            if (obj && Array.isArray(obj.center) && obj.center.length === 2 && Number.isFinite(obj.zoom)) {
              center = [obj.center[0], obj.center[1]];
              zoom = obj.zoom;
              if (Number.isFinite(obj.bearing)) bearing = obj.bearing;
              if (Number.isFinite(obj.pitch)) pitch = obj.pitch;
            }
          }
        }
      } catch {}
    }
    return { center, zoom, bearing, pitch };
  };

  // Initialize Mapbox GL with Albers USA projection style
  useEffect(() => {
    console.log('[MapInit] start', {
      hasToken: !!MAPBOX_TOKEN,
      hasStyle: !!ALBERS_STYLE,
      location: typeof window !== 'undefined' ? window.location.href : 'ssr'
    });
    if (!MAPBOX_TOKEN || !ALBERS_STYLE) {
      console.warn('[MapInit] Missing env', { MAPBOX_TOKEN_PRESENT: !!MAPBOX_TOKEN, ALBERS_STYLE_PRESENT: !!ALBERS_STYLE });
      return;
    }
    if (mapRef.current || !mapContainerRef.current) return;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const init = getInitialView();
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: ALBERS_STYLE,
        center: init.center,
        zoom: init.zoom,
        bearing: init.bearing,
        pitch: init.pitch,
        attributionControl: false,
        logoPosition: 'bottom-left',
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current.on('load', () => {
        console.log('[MapInit] map load event fired');
        const map = mapRef.current!;
        const layers = map.getStyle()?.layers || [];
        for (const layer of layers) {
          if (layer.type !== 'background') {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch {}
          }
        }
        console.log('[MapInit] base layers hidden', { hiddenCount: (layers || []).length });
      setMapLoaded(true);
      });
      mapRef.current.on('error', (e) => {
        // Surface Mapbox style/token errors to UI
        const message = (e && (e as any).error && ((e as any).error.message || (e as any).error)) || 'Map error';
        console.error('Mapbox GL error:', e);
        setError(typeof message === 'string' ? message : 'Mapbox error');
      });
    } catch (e) {
      setError('Failed to initialize Mapbox map');
    }
      return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MAPBOX_TOKEN, ALBERS_STYLE]);

  // Button to save current map view as default
  const saveCurrentViewAsDefault = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const payload = {
      center: [Number(c.lng.toFixed(6)), Number(c.lat.toFixed(6))],
      zoom: Number(map.getZoom().toFixed(2)),
      bearing: Number(map.getBearing().toFixed(1)),
      pitch: Number(map.getPitch().toFixed(1)),
    };
    try {
      localStorage.setItem('goodvote_map_default_view', JSON.stringify(payload));
      console.log('[MapInit] saved default view', payload);
    } catch {}
  };

  // If no Mapbox env, show an error hint

  // Function to get fill color based on current view mode and filters
  const getFillColor = () => {
    const fundingExpr: any = ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0];
    if (viewMode === 'israel') {
      return [
        'case',
        // Non-voting districts (black)
        ['==', ['get', 'lookup_key'], 'AZ-7'], '#000000',
        ['==', ['get', 'lookup_key'], 'DC-98'], '#000000',
        ['==', ['get', 'lookup_key'], 'TN-7'], '#000000',
        ['==', ['get', 'lookup_key'], 'TX-18'], '#000000',
        ['==', ['get', 'lookup_key'], 'VA-11'], '#000000',
        // Categories aligned with /house-districts
        ['==', fundingExpr, 0], '#22c55e',           // green
        ['all', ['>', fundingExpr, 0], ['<', fundingExpr, 10000]], '#fbbf24', // yellow
        ['all', ['>=', fundingExpr, 10000], ['<', fundingExpr, 50000]], '#ea580c', // orange
        ['>=', fundingExpr, 50000], '#dc2626',      // red
        '#9ca3af'
      ];
    } else {
      return [
        'case',
        // Non-voting districts (black)
        ['==', ['get', 'lookup_key'], 'AZ-7'], '#000000',
        ['==', ['get', 'lookup_key'], 'DC-98'], '#000000',
        ['==', ['get', 'lookup_key'], 'TN-7'], '#000000',
        ['==', ['get', 'lookup_key'], 'TX-18'], '#000000',
        ['==', ['get', 'lookup_key'], 'VA-11'], '#000000',
        // Party colors
        ['==', ['get', 'incumbent_party'], 'DEM'], '#3b82f6', // Blue: Democratic
        ['==', ['get', 'incumbent_party'], 'REP'], '#dc2626', // Red: Republican
        ['==', ['get', 'incumbent_party'], 'IND'], '#6b7280', // Gray: Independent
        '#9ca3af' // Gray: No data
      ];
    }
  };

  // Function to get fill opacity based on current filters
  const getFillOpacity = () => {
    const fundingExpr: any = ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0];
    if (viewMode === 'israel') {
      if (israelFilter === 'all') {
        return 0.8;
      } else if (israelFilter === 'pro') {
        return [
          'case',
          // Non-voting districts always visible
          ['==', ['get', 'lookup_key'], 'AZ-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'DC-98'], 0.8,
          ['==', ['get', 'lookup_key'], 'TN-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'TX-18'], 0.8,
          ['==', ['get', 'lookup_key'], 'VA-11'], 0.8,
          // Show pro-Israel districts (yellow/orange/red)
          ['any', ['>', fundingExpr, 0]], 0.8,
          0.1 // Dim everything else
        ];
      } else {
        return [
          'case',
          // Non-voting districts always visible
          ['==', ['get', 'lookup_key'], 'AZ-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'DC-98'], 0.8,
          ['==', ['get', 'lookup_key'], 'TN-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'TX-18'], 0.8,
          ['==', ['get', 'lookup_key'], 'VA-11'], 0.8,
          // Show non-pro (exactly zero)
          ['==', fundingExpr, 0], 0.8,
          0.1 // Dim everything else
        ];
      }
    } else {
      if (partyFilter === 'all') {
        return 0.8;
      } else {
        return [
          'case',
          // Non-voting districts always visible
          ['==', ['get', 'lookup_key'], 'AZ-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'DC-98'], 0.8,
          ['==', ['get', 'lookup_key'], 'TN-7'], 0.8,
          ['==', ['get', 'lookup_key'], 'TX-18'], 0.8,
          ['==', ['get', 'lookup_key'], 'VA-11'], 0.8,
          // Show selected party
          ['==', ['get', 'incumbent_party'],
            partyFilter === 'dem' ? 'DEM' :
            partyFilter === 'rep' ? 'REP' :
            partyFilter === 'ind' ? 'IND' : 'DEM'
          ], 0.8,
          0.1 // Dim everything else
        ];
      }
    }
  };

  // Store district layer reference (already defined above)

  // Function to get color based on properties
  const getDistrictColor = (properties: any) => {
    if (viewMode === 'israel') {
      const funding = properties.incumbent_total_israel_funding || 0;
      // Color based on funding amount: Green (<$10K), Orange ($10K-$50K), Red gradient (>$50K)
      if (funding < 10000) return '#44ff44'; // Low funding (green)
      if (funding < 50000) return '#ff8800'; // Medium funding (dark orange)
      
      // Red gradient based on funding level
      if (funding < 100000) return '#ff6600'; // Dark orange-red
      if (funding < 500000) return '#ff4400'; // Medium red
      if (funding < 1000000) return '#ff2200'; // Dark red
      return '#ff0000'; // Bright red for highest funding
    } else {
      // Party mode
      const party = properties.incumbent_party;
      if (party === 'Republican' || party === 'REP') return '#ff4444';
      if (party === 'Democratic' || party === 'DEM') return '#4444ff';
      return '#44ff44'; // Independent/other
    }
  };

  // Function to update map colors and filtering (Mapbox GL)
  const updateMapColors = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer('district-fill')) {
      map.setPaintProperty('district-fill', 'fill-color', getFillColor() as any);
      map.setPaintProperty('district-fill', 'fill-opacity', getFillOpacity() as any);
    }
  }, [viewMode, israelFilter, partyFilter]);

  // Calculate counts directly from live API rows to avoid geometry mismatch
  const calculatePieChartDataFromRows = (rows: any[]) => {
    const green: any[] = [];
    const yellow: any[] = [];
    const orange: any[] = [];
    const red: any[] = [];
    for (const r of rows) {
      const funding = Number(r.incumbent_total_israel_funding || r.total_israel_funding || 0) || 0;
      const item = {
        district: `${r.state}-${r.district}`,
        name: r.incumbent_name,
        party: r.incumbent_party,
        funding,
        score: r.incumbent_israel_score || 0
      };
      if (funding === 0) green.push(item);
      else if (funding > 0 && funding < 10000) yellow.push(item);
      else if (funding >= 10000 && funding < 50000) orange.push(item);
      else red.push(item);
    }
    const total = green.length + yellow.length + orange.length + red.length;
    setPieChartData({
      green: { count: green.length, percentage: total ? Math.round((green.length / total) * 100) : 0, districts: green },
      yellow: { count: yellow.length, percentage: total ? Math.round((yellow.length / total) * 100) : 0, districts: yellow },
      orange: { count: orange.length, percentage: total ? Math.round((orange.length / total) * 100) : 0, districts: orange },
      red: { count: red.length, percentage: total ? Math.round((red.length / total) * 100) : 0, districts: red },
    });
  };

  // Load GeoJSON and add Mapbox source/layers, then merge live funding from API view
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const sourceId = 'districts';
    const fillId = 'district-fill';
    const lineId = 'district-outline';
    const hoverLineId = 'district-hover-outline';
    let isCancelled = false;
    // Use WGS84 Albers-baked GeoJSON so Mapbox renders Albers layout
    const url = '/districts/cd119-albersbaked-simplified.geojson';
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    console.log('[Data] fetching', { url, location: typeof window !== 'undefined' ? window.location.href : 'ssr' });
    fetch(url)
      .then(async (r) => {
        console.log('[Data] response', { status: r.status, ok: r.ok, url: r.url, contentType: r.headers.get('content-type'), contentLength: r.headers.get('content-length') });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        try {
          const json = await r.json();
          return json;
        } catch (e) {
          console.error('[Data] JSON parse failed', e);
          throw e;
        }
      })
      .then(async (data) => {
        if (isCancelled) return;
        console.log('[Data] loaded', { type: (data as any)?.type, features: (data as any)?.features?.length });
        // If data already has properties (state, district, lookup_key), skip enrichment
        const enrichWithMetadata = async (fc: any) => {
          try {
            const sampleProps = fc?.features?.[0]?.properties || {};
            if (sampleProps.state || sampleProps.lookup_key || sampleProps.district) {
              console.log('[Data] properties present, skipping enrichment', Object.keys(sampleProps));
              return fc;
            }
            const res = await fetch('/district_data/congressional-districts-fixed.json');
            if (!res.ok) throw new Error('metadata fetch failed');
            const meta = await res.json();
            const metaFeatures: any[] = (meta?.features || meta) as any[];
            const geomFeatures: any[] = (fc?.features || []) as any[];
            if (!metaFeatures?.length || metaFeatures.length < geomFeatures.length) return fc;
            const mergedFeatures = geomFeatures.map((f, i) => {
              const mp = (metaFeatures[i]?.properties || {}) as any;
              const rawDistrict: any = mp.district ?? (mp.lookup_key ? String(mp.lookup_key).split('-')[1] : undefined);
              const normalizedDistrict = typeof rawDistrict === 'string' && (rawDistrict.toUpperCase() === 'AL' || rawDistrict === '00')
                ? 0 : Number(rawDistrict);
              const key: string | undefined = mp.lookup_key || (mp.state && normalizedDistrict != null ? `${mp.state}-${normalizedDistrict}` : undefined);
              const st: string | undefined = mp.state || (key ? String(key).split('-')[0] : undefined);
              const distVal = normalizedDistrict;
              return {
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                  ...mp,
                  lookup_key: key,
                  state: st,
                  district: distVal,
                },
              };
            });
            return { type: 'FeatureCollection', features: mergedFeatures };
          } catch {
            return fc;
          }
        };

        // 1) Ensure features have state/district via metadata file
        let mergedData = await enrichWithMetadata(data);

        // 2) Fetch live funding from API view and merge into feature properties
        try {
          const apiUrl = `/api/house-districts?cycle=${encodeURIComponent(selectedCycle)}`;
          console.log('[Data] fetching live funding', { apiUrl });
          const resp = await fetch(apiUrl);
          if (resp.ok) {
            const payload = await resp.json();
            const rows: any[] = payload?.data || [];
            console.log('[Data] live funding rows', rows.length);
            setLiveFundingRows(rows);
            const byKey = new Map<string, any>();
            for (const r of rows) {
              const key = `${r.state}-${r.district}`;
              byKey.set(key, r);
            }
            const features: any[] = (mergedData?.features || []) as any[];
            mergedData = {
              type: 'FeatureCollection',
              features: features.map((f: any) => {
                const p = f.properties || {};
                const key = p.lookup_key || (p.state != null && p.district != null ? `${p.state}-${p.district}` : undefined);
                const live = key ? byKey.get(key) : undefined;
                if (live) {
                  return {
                    ...f,
                    properties: {
                      ...p,
                      incumbent_name: live.incumbent_name,
                      incumbent_party: live.incumbent_party,
                      incumbent_person_id: live.incumbent_person_id,
                      incumbent_israel_score: live.incumbent_israel_score,
                      incumbent_total_israel_funding: live.incumbent_total_israel_funding,
                    },
                  };
                }
                return f;
              }),
            };
          } else {
            console.warn('[Data] live funding fetch failed', resp.status);
          }
        } catch (e) {
          console.warn('[Data] live funding merge error', e);
        }
        setGeojsonData(mergedData);
        console.log('[Map] adding source/layers');

        // Compute bounds from GeoJSON to center and fill the screen
        const computeBounds = (fc: any): [[number, number], [number, number]] => {
          let minLon = 180;
          let minLat = 90;
          let maxLon = -180;
          let maxLat = -90;

          const update = (lon: number, lat: number) => {
            if (lon < minLon) minLon = lon;
            if (lat < minLat) minLat = lat;
            if (lon > maxLon) maxLon = lon;
            if (lat > maxLat) maxLat = lat;
          };

          const walk = (coords: any) => {
            if (!coords) return;
            if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
              update(coords[0], coords[1]);
              return;
            }
            for (const c of coords) walk(c);
          };

          const features: any[] = fc?.features || [];
          for (const f of features) {
            const g = f?.geometry;
            if (!g) continue;
            walk(g.coordinates);
          }
          return [
            [Number.isFinite(minLon) ? minLon : -125, Number.isFinite(minLat) ? minLat : 24],
            [Number.isFinite(maxLon) ? maxLon : -66, Number.isFinite(maxLat) ? maxLat : 50],
          ];
        };
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: mergedData, generateId: true } as any);
          console.log('[Map] source added', { sourceId });
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': getFillColor() as any,
              'fill-opacity': getFillOpacity() as any,
            },
          });
          console.log('[Map] fill layer added', { fillId });
          map.addLayer({
            id: lineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#ffffff',
              'line-width': 0.5,
            },
          });
          console.log('[Map] line layer added', { lineId });
          // Add a hover outline layer above the normal outline
          map.addLayer({
            id: hoverLineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#000000',
              'line-width': 3,
            },
            filter: ['==', ['id'], -1],
          });
          console.log('[Map] hover layer added', { hoverLineId });
          try {
            const b = computeBounds(mergedData);
            const bounds = new mapboxgl.LngLatBounds(b[0], b[1]);
            map.fitBounds(bounds, { padding: 40, animate: false });
            console.log('[Map] fitBounds done', { bounds: b });
          } catch {}
          map.on('click', fillId, (e: any) => {
            const f = e.features && e.features[0];
            if (f) {
              setSelectedDistrict(f.properties);
              try {
                const districtName = `${f.properties?.state || ''}-${f.properties?.district || ''}`.replace(/^-|-$|--/g, '');
                new mapboxgl.Popup({ closeButton: true })
                  .setLngLat(e.lngLat)
                  .setHTML(`<div style="font-weight:600;">${districtName || 'Unknown District'}</div>`)
                  .addTo(map);
              } catch {}
            }
          });
          map.on('mouseenter', fillId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mousemove', fillId, (e: any) => {
            const f = e.features && e.features[0];
            const hoveredId = f && typeof f.id !== 'undefined' ? f.id : -1;
            if (map.getLayer(hoverLineId)) {
              try { map.setFilter(hoverLineId, ['==', ['id'], hoveredId]); } catch {}
            }
          });
          map.on('mouseleave', fillId, () => {
            map.getCanvas().style.cursor = '';
            if (map.getLayer(hoverLineId)) {
              try { map.setFilter(hoverLineId, ['==', ['id'], -1]); } catch {}
            }
          });
        } else {
          const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
          src.setData(mergedData as any);
          console.log('[Map] source data updated');
        }
        calculatePieChartDataFromRows(liveFundingRows.length ? liveFundingRows : []);
        const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        console.log('[Perf] data->render ms', Math.round(t1 - t0));
      })
      .catch((err) => {
        console.error('[Data] Failed to load district boundaries', err);
        setError('Failed to load district boundaries');
      });
    return () => {
      isCancelled = true;
      if (!map) return;
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(hoverLineId)) map.removeLayer(hoverLineId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [mapLoaded, selectedCycle]);

  // Recompute distribution when live rows update
  useEffect(() => {
    if (liveFundingRows && Array.isArray(liveFundingRows)) {
      calculatePieChartDataFromRows(liveFundingRows);
    }
  }, [liveFundingRows]);

  // Function to show debug modal with all candidate data
  const showDebugData = () => {
    const features: any[] = (geojsonData?.features || []) as any[];
    if (features.length) {
      const allDistricts: any[] = [];
      for (const f of features) {
        const p = f.properties || {};
        if (p.incumbent_name && p.incumbent_name !== 'Unknown') {
          allDistricts.push({
            district: `${p.state}-${p.district}`,
            name: p.incumbent_name,
            party: p.incumbent_party,
            funding: p.incumbent_total_israel_funding || 0,
            score: p.incumbent_israel_score || 0
          });
        }
      }
      allDistricts.sort((a, b) => b.funding - a.funding);
      
      // Open debug data in new window
      const debugWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (debugWindow) {
        debugWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Debug Data - All Districts</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
              .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .stats { display: flex; gap: 20px; margin-bottom: 20px; }
              .stat { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .stat-number { font-size: 24px; font-weight: bold; }
              .stat-label { color: #666; font-size: 14px; }
              .district-list { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .district-item { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
              .district-item:last-child { border-bottom: none; }
              .district-info { flex: 1; }
              .district-name { font-weight: bold; margin-bottom: 5px; }
              .district-details { color: #666; font-size: 14px; }
              .district-funding { text-align: right; }
              .funding-amount { font-weight: bold; font-size: 18px; }
              .funding-score { color: #666; font-size: 14px; }
              .close-btn { background: #dc2626; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              .close-btn:hover { background: #b91c1c; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Debug Data - All Districts</h1>
              <p>Showing ${allDistricts.length} districts sorted by funding amount</p>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${allDistricts.length}</div>
                <div class="stat-label">Total Districts</div>
              </div>
              <div class="stat">
              <div class="stat-number">$${(allDistricts.reduce((sum: number, d: any) => sum + d.funding, 0)).toLocaleString()}</div>
                <div class="stat-label">Total Funding</div>
              </div>
              <div class="stat">
                <div class="stat-number">${Math.round((allDistricts.reduce((sum, d) => sum + d.funding, 0) / allDistricts.length)).toLocaleString()}</div>
                <div class="stat-label">Avg Funding</div>
              </div>
            </div>
            
            <div class="district-list">
              ${allDistricts.map((district: any) => `
                <div class="district-item">
                  <div class="district-info">
                    <div class="district-name">${district.name}</div>
                    <div class="district-details">${district.district} • ${district.party}</div>
                  </div>
                  <div class="district-funding">
                    <div class="funding-amount">$${district.funding.toLocaleString()}</div>
                    <div class="funding-score">Score: ${district.score}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </body>
          </html>
        `);
        debugWindow.document.close();
      }
    }
  };

  // Function to show debug data for specific color category
  const showDebugDataForCategory = (category: 'green' | 'yellow' | 'orange' | 'red') => {
    if (pieChartData) {
      const categoryData = pieChartData[category];
      const debugWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (debugWindow) {
        debugWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Debug Data - ${category.charAt(0).toUpperCase() + category.slice(1)} Districts</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
              .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .stats { display: flex; gap: 20px; margin-bottom: 20px; }
              .stat { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .stat-number { font-size: 24px; font-weight: bold; }
              .stat-label { color: #666; font-size: 14px; }
              .district-list { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .district-item { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
              .district-item:last-child { border-bottom: none; }
              .district-info { flex: 1; }
              .district-name { font-weight: bold; margin-bottom: 5px; }
              .district-details { color: #666; font-size: 14px; }
              .district-funding { text-align: right; }
              .funding-amount { font-weight: bold; font-size: 18px; }
              .funding-score { color: #666; font-size: 14px; }
              .close-btn { background: #dc2626; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              .close-btn:hover { background: #b91c1c; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Debug Data - ${category.charAt(0).toUpperCase() + category.slice(1)} Districts</h1>
              <p>Showing ${categoryData.count} districts (${categoryData.percentage}% of total)</p>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${categoryData.count}</div>
                <div class="stat-label">Total Districts</div>
              </div>
              <div class="stat">
                <div class="stat-number">${categoryData.percentage}%</div>
                <div class="stat-label">Percentage</div>
              </div>
              <div class="stat">
                <div class="stat-number">$${(categoryData.districts.reduce((sum: number, d: any) => sum + d.funding, 0)).toLocaleString()}</div>
                <div class="stat-label">Total Funding</div>
              </div>
            </div>
            
            <div class="district-list">
              ${categoryData.districts.map((district: any) => `
                <div class="district-item">
                  <div class="district-info">
                    <div class="district-name">${district.name}</div>
                    <div class="district-details">${district.district} • ${district.party}</div>
                  </div>
                  <div class="district-funding">
                    <div class="funding-amount">$${district.funding.toLocaleString()}</div>
                    <div class="funding-score">Score: ${district.score}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </body>
          </html>
        `);
        debugWindow.document.close();
      }
    }
  };


  // Update colors when view mode or filters change
  useEffect(() => {
    if (mapLoaded) {
      console.log('Updating map colors:', { viewMode, israelFilter, partyFilter });
      updateMapColors();
    }
  }, [mapLoaded, updateMapColors]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Congressional District Map</h1>
                <p className="text-gray-300">Israel funding by district</p>
              </div>
              <a className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors" href="/house-districts">View District List</a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="bg-red-800 text-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-2">Error Loading Map</h2>
            <p>{error}</p>
                  </div>
      </div>


    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Unified header */}
      <PageHeader
        title="Congressional District Map"
        subtitle="Israel funding by district"
        cycle={selectedCycle}
        onCycleChange={setSelectedCycle}
        active="house-map"
      />
      
      {/* Filters under header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4 items-center py-4">
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">View Mode:</span>
              <button
                onClick={() => {
                  console.log('Switching to Israel Funding view');
                  setViewMode('israel');
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'israel' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Israel Funding
              </button>
              <button
                onClick={() => {
                  console.log('Switching to Party Affiliation view');
                  setViewMode('party');
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'party' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Party Affiliation
              </button>
            </div>

            {/* Israel Funding Filters */}
            {viewMode === 'israel' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="israelFilter"
                    value="all"
                    checked={israelFilter === 'all'}
                    onChange={(e) => {
                      console.log('Israel filter changed to:', e.target.value);
                      setIsraelFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  All Districts
                </label>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="israelFilter"
                    value="pro"
                    checked={israelFilter === 'pro'}
                    onChange={(e) => {
                      console.log('Israel filter changed to:', e.target.value);
                      setIsraelFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  Pro-Israel (Pink/Yellow)
                </label>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="israelFilter"
                    value="non-pro"
                    checked={israelFilter === 'non-pro'}
                    onChange={(e) => {
                      console.log('Israel filter changed to:', e.target.value);
                      setIsraelFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  Non-Pro-Israel (Green)
                </label>
              </div>
            )}

            {/* Party Filters */}
            {viewMode === 'party' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="partyFilter"
                    value="all"
                    checked={partyFilter === 'all'}
                    onChange={(e) => {
                      console.log('Party filter changed to:', e.target.value);
                      setPartyFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  All Parties
                </label>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="partyFilter"
                    value="dem"
                    checked={partyFilter === 'dem'}
                    onChange={(e) => {
                      console.log('Party filter changed to:', e.target.value);
                      setPartyFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  Democratic (Blue)
                </label>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="partyFilter"
                    value="rep"
                    checked={partyFilter === 'rep'}
                    onChange={(e) => {
                      console.log('Party filter changed to:', e.target.value);
                      setPartyFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  Republican (Red)
                </label>
                <label className="flex items-center text-gray-300 text-sm">
                  <input
                    type="radio"
                    name="partyFilter"
                    value="ind"
                    checked={partyFilter === 'ind'}
                    onChange={(e) => {
                      console.log('Party filter changed to:', e.target.value);
                      setPartyFilter(e.target.value as any);
                    }}
                    className="mr-2"
                  />
                  Independent (Gray)
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainerRef} className="w-full h-screen" />
        
        {/* Loading Overlay */}
        {(!leafletLoaded || progressiveLoading) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-white text-center mb-4">
                {!leafletLoaded ? 'Loading Map Library...' : 'Loading District Data...'}
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 left-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-10">
            <div className="font-bold">Error</div>
            <div>{error}</div>
          </div>
        )}

        {/* Leaflet Loading Message */}
        {!leafletLoaded && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-white text-center mb-4">Loading Map Library...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Fixed District Details Popup */}
        {selectedDistrict && (
          <div className="absolute top-4 left-4 bg-white p-6 rounded-lg shadow-xl z-20 max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedDistrict.state || 'Unknown'}-{selectedDistrict.district || 'Unknown'}
              </h3>
              <button 
                onClick={() => setSelectedDistrict(null)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Representative:</strong>{' '}
                {(selectedDistrict.incumbent_person_id || selectedDistrict.fec_id) ? 
                  <Link 
                    href={`/candidates/${selectedDistrict.incumbent_person_id || selectedDistrict.fec_id}/funding-breakdown`}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                  >
                    {selectedDistrict.incumbent_name || 'Unknown'}
                  </Link> : 
                  <span>{selectedDistrict.incumbent_name || 'Unknown'}</span>
                }
              </p>
              
              <p className="text-gray-700">
                <strong>Party:</strong> {selectedDistrict.incumbent_party || 'Unknown'}
              </p>
              
              <p className="text-gray-700">
                <strong>First Elected:</strong> {selectedDistrict.first_elected_year || 'Unknown'}
              </p>
              
              <p className="text-gray-700">
                <strong>Cash on Hand:</strong> ${(selectedDistrict.incumbent_cash_on_hand || 0).toLocaleString()}
              </p>
              
              <p className="text-gray-700">
                <strong>Israel Score:</strong> {selectedDistrict.incumbent_israel_score || 'N/A'}
              </p>
              
              <p className="text-gray-700">
                <strong>Pro-Israel Funding:</strong>{' '}
                {selectedDistrict.incumbent_person_id ? 
                  <Link 
                    href={`/israel-lobby/${selectedDistrict.incumbent_person_id}`}
                    className="text-blue-600 hover:text-blue-800 underline font-semibold"
                    target="_blank"
                  >
                    ${(selectedDistrict.incumbent_total_israel_funding || 0).toLocaleString()}
                  </Link> : 
                  <span className="font-semibold">${(selectedDistrict.incumbent_total_israel_funding || 0).toLocaleString()}</span>
                }
              </p>
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {/* Removed separate pie panel; merged counts into legend below */}

        {/* Legend (upper-left) with counts from live API rows */}
        <div className="absolute top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-white text-sm mb-2">
            {viewMode === 'israel' ? 'Israel Funding by District' : 'Party Affiliation by District'}
          </h3>
          <div className="space-y-1 text-xs">
            {viewMode === 'israel' ? (
              <>
                <button onClick={() => showDebugDataForCategory('green')} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-green-500 rounded mr-2"></div><span className="text-gray-300">Green: $0</span></div>
                  {pieChartData && <span className="text-gray-200 font-semibold">{pieChartData.green.count}</span>}
                </button>
                <button onClick={() => showDebugDataForCategory('yellow')} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div><span className="text-gray-300">Yellow: $1-$10K</span></div>
                  {pieChartData && <span className="text-gray-200 font-semibold">{pieChartData.yellow.count}</span>}
                </button>
                <button onClick={() => showDebugDataForCategory('orange')} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-orange-600 rounded mr-2"></div><span className="text-gray-300">Orange: $10K-$50K</span></div>
                  {pieChartData && <span className="text-gray-200 font-semibold">{pieChartData.orange.count}</span>}
                </button>
                <button onClick={() => showDebugDataForCategory('red')} className="w-full text-left flex items-center justify-between hover:bg-gray-700 px-1 py-0.5 rounded">
                  <div className="flex items-center"><div className="w-4 h-4 bg-red-600 rounded mr-2"></div><span className="text-gray-300">Red: ≥$50K</span></div>
                  {pieChartData && <span className="text-gray-200 font-semibold">{pieChartData.red.count}</span>}
                </button>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-black rounded mr-2"></div>
                  <span className="text-gray-300">Non-Voting (Vacant/DC)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-gray-300">No Data</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-gray-300">Democratic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-gray-300">Republican</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-gray-300">Independent</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-black rounded mr-2"></div>
                  <span className="text-gray-300">Non-Voting (Vacant/DC)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-gray-300">No Data</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>



      {/* Global Styles */}
      <style jsx global>{`
        .custom-popup .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 2px solid #374151;
          background: #1f2937;
          color: #f9fafb;
          font-size: 14px;
        }
        
        .custom-popup .mapboxgl-popup-close-button {
          font-size: 24px;
          width: 32px;
          height: 32px;
          color: #9ca3af;
          background: #374151;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .mapboxgl-canvas {
          filter: brightness(0.8) contrast(1.2);
        }
      `}</style>
    </div>
  );
} 