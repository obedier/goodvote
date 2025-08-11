"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
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
  const districtLayer = useRef<any>(null); // kept for compatibility; not used with Mapbox
  const leafletLoaded = true;
  const progressiveLoading = false;
  const [geojsonData, setGeojsonData] = useState<any>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
  const ALBERS_STYLE = process.env.NEXT_PUBLIC_MAPBOX_ALBERS_STYLE_URL as string | undefined;

  // Initialize Mapbox GL with Albers USA projection style
  useEffect(() => {
    if (!MAPBOX_TOKEN || !ALBERS_STYLE) return;
    if (mapRef.current || !mapContainerRef.current) return;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: ALBERS_STYLE,
        center: [-98.5, 39.5],
        zoom: 3,
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
        // Israel funding system
        ['>=', fundingExpr, 10000], '#ec4899',
        ['>=', fundingExpr, 1000], '#fbbf24',
        ['>=', fundingExpr, 0], '#22c55e',
        '#9ca3af' // Gray: No data
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
          // Show pro-Israel districts (pink and yellow)
          ['any', ['>=', fundingExpr, 1000]], 0.8,
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
          // Show non-pro-Israel districts (green)
          ['any', ['<', fundingExpr, 1000]], 0.8,
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

  // Function to calculate pie chart data from GeoJSON
  const calculatePieChartDataFromData = (data?: any) => {
    const features: any[] = (data?.features || geojsonData?.features || []) as any[];
    if (!features.length) return;
    const greenDistricts: any[] = [];
    const orangeDistricts: any[] = [];
    const redDistricts: any[] = [];
    for (const f of features) {
      const p = f.properties || {};
      if (p.incumbent_name && p.incumbent_name !== 'Unknown') {
        const d = {
          district: `${p.state}-${p.district}`,
          name: p.incumbent_name,
          party: p.incumbent_party,
          funding: p.incumbent_total_israel_funding || 0,
          score: p.incumbent_israel_score || 0
        };
        const funding = d.funding;
        if (funding < 10000) greenDistricts.push(d);
        else if (funding < 50000) orangeDistricts.push(d);
        else redDistricts.push(d);
      }
    }
    const totalDistricts = greenDistricts.length + orangeDistricts.length + redDistricts.length;
    setPieChartData({
      green: {
        count: greenDistricts.length,
        percentage: totalDistricts > 0 ? Math.round((greenDistricts.length / totalDistricts) * 100) : 0,
        districts: greenDistricts.sort((a, b) => b.funding - a.funding)
      },
      orange: {
        count: orangeDistricts.length,
        percentage: totalDistricts > 0 ? Math.round((orangeDistricts.length / totalDistricts) * 100) : 0,
        districts: orangeDistricts.sort((a, b) => b.funding - a.funding)
      },
      red: {
        count: redDistricts.length,
        percentage: totalDistricts > 0 ? Math.round((redDistricts.length / totalDistricts) * 100) : 0,
        districts: redDistricts.sort((a, b) => b.funding - a.funding)
      }
    });
  };

  // Load GeoJSON and add Mapbox source/layers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const sourceId = 'districts';
    const fillId = 'district-fill';
    const lineId = 'district-outline';
    const hoverLineId = 'district-hover-outline';
    let isCancelled = false;
    // Use WGS84 Albers-baked GeoJSON so Mapbox renders Albers layout
    fetch('/districts/cd119-albersbaked-simplified.geojson')
      .then((r) => r.json())
      .then(async (data) => {
        if (isCancelled) return;
        // If data already has properties (state, district, lookup_key), skip enrichment
        const enrichWithMetadata = async (fc: any) => {
          try {
            const sampleProps = fc?.features?.[0]?.properties || {};
            if (sampleProps.state || sampleProps.lookup_key || sampleProps.district) {
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
              const key: string | undefined = mp.lookup_key || (mp.state && mp.district != null ? `${mp.state}-${mp.district}` : undefined);
              const st: string | undefined = mp.state || (key ? String(key).split('-')[0] : undefined);
              const distVal = mp.district ?? (key ? Number(String(key).split('-')[1]) : undefined);
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

        const mergedData = await enrichWithMetadata(data);
        setGeojsonData(mergedData);

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
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': getFillColor() as any,
              'fill-opacity': getFillOpacity() as any,
            },
          });
          map.addLayer({
            id: lineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#ffffff',
              'line-width': 0.5,
            },
          });
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
          try {
            const b = computeBounds(mergedData);
            const bounds = new mapboxgl.LngLatBounds(b[0], b[1]);
            map.fitBounds(bounds, { padding: 40, animate: false });
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
        }
        calculatePieChartDataFromData(mergedData);
      })
      .catch((err) => {
        console.error('Failed to load district boundaries', err);
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
  }, [mapLoaded]);

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
  const showDebugDataForCategory = (category: 'green' | 'orange' | 'red') => {
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
      {/* Header with title and filters */}
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Congressional District Map</h1>
              <p className="text-gray-300">Israel funding by district</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={showDebugData}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                title="Show all candidate funding data"
              >
                🐛 Debug Data
              </button>
              <a className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors" href="/house-districts">View District List</a>
            </div>
          </div>
          
          {/* Filters moved to header */}
          <div className="flex flex-wrap gap-4 items-center py-4 border-t border-gray-700">
            {/* Cycle Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">Cycle:</span>
              <select 
                value={selectedCycle} 
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm bg-white text-black"
              >
                <option value="2020">2020</option>
                <option value="2022">2022</option>
                <option value="2024">2024</option>
                <option value="2026">2026</option>
                <option value="last3">Last 3 Cycles (2020-2024)</option>
                <option value="all">All Cycles</option>
              </select>
            </div>
            
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
        {pieChartData && viewMode === 'israel' && (
          <div className="absolute top-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 max-w-xs">
            <h3 className="font-bold text-white text-sm mb-3">District Distribution</h3>
            <div className="space-y-2">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-2 rounded"
                onClick={() => showDebugDataForCategory('green')}
              >
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-300 text-sm">Green (&lt;$10K)</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{pieChartData.green.count}</div>
                  <div className="text-gray-400 text-xs">{pieChartData.green.percentage}%</div>
                </div>
              </div>
              
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-2 rounded"
                onClick={() => showDebugDataForCategory('orange')}
              >
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-600 rounded mr-2"></div>
                  <span className="text-gray-300 text-sm">Orange ($10K-$50K)</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{pieChartData.orange.count}</div>
                  <div className="text-gray-400 text-xs">{pieChartData.orange.percentage}%</div>
                </div>
              </div>
              
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-700 p-2 rounded"
                onClick={() => showDebugDataForCategory('red')}
              >
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-gray-300 text-sm">Red (&gt;$50K)</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{pieChartData.red.count}</div>
                  <div className="text-gray-400 text-xs">{pieChartData.red.percentage}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-white text-sm mb-2">
            {viewMode === 'israel' ? 'Israel Funding by District' : 'Party Affiliation by District'}
          </h3>
          <div className="space-y-1 text-xs">
            {viewMode === 'israel' ? (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-300">Low Funding (&lt;$10K)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-600 rounded mr-2"></div>
                  <span className="text-gray-300">Medium Funding ($10K-$50K)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4" style={{backgroundColor: '#ff6600'}}></div>
                  <span className="text-gray-300">High ($50K-$100K)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4" style={{backgroundColor: '#ff4400'}}></div>
                  <span className="text-gray-300">Very High ($100K-$500K)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4" style={{backgroundColor: '#ff2200'}}></div>
                  <span className="text-gray-300">Extreme ($500K-$1M)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4" style={{backgroundColor: '#ff0000'}}></div>
                  <span className="text-gray-300">Highest (&gt;$1M)</span>
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