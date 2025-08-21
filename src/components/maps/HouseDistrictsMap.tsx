'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

type HouseDistrictsMapProps = {
  heightClass?: string;
  onTotalUpdate?: (total: number) => void;
};

export default function HouseDistrictsMap({ heightClass = 'h-[75vh]', onTotalUpdate }: HouseDistrictsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [counts, setCounts] = useState<{ green: number; yellow: number; orange: number; red: number } | null>(null);

  console.log('HouseDistrictsMap component mounted/rendered with onTotalUpdate:', !!onTotalUpdate);

  useEffect(() => {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
    const ALBERS_STYLE = process.env.NEXT_PUBLIC_MAPBOX_ALBERS_STYLE_URL as string | undefined;
    if (!mapContainerRef.current || !MAPBOX_TOKEN || !ALBERS_STYLE || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: ALBERS_STYLE,
      center: [-98.5, 39.5],
      zoom: 3,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
      logoPosition: 'bottom-left',
      interactive: false,
      dragPan: false,
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      touchZoomRotate: false,
    });
    mapRef.current = map;
    // Removed zoom/compass controls per design

    const sourceId = 'districts';
    const fillId = 'district-fill';
    const lineId = 'district-outline';

    const computeBounds = (fc: any): [[number, number], [number, number]] => {
      let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
      const update = (lon: number, lat: number) => {
        if (lon < minLon) minLon = lon; if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon; if (lat > maxLat) maxLat = lat;
      };
      const walk = (coords: any) => {
        if (!coords) return;
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') { update(coords[0], coords[1]); return; }
        for (const c of coords) walk(c);
      };
      const features: any[] = fc?.features || [];
      for (const f of features) { const g = f?.geometry; if (g) walk(g.coordinates); }
      return [
        [Number.isFinite(minLon) ? minLon : -125, Number.isFinite(minLat) ? minLat : 24],
        [Number.isFinite(maxLon) ? maxLon : -66, Number.isFinite(maxLat) ? maxLat : 50],
      ];
    };

    const fillColor: any = [
      'case',
      ['==', ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0], 0], '#22c55e',
      ['<', ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0], 10000], '#fbbf24',
      ['<', ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0], 50000], '#ea580c',
      ['>=', ['coalesce', ['to-number', ['get', 'incumbent_total_israel_funding']], 0], 50000], '#dc2626',
      '#9ca3af',
    ];

    map.on('load', async () => {
      try {
        // Hide the background layer to make it transparent
        const layers = map.getStyle()?.layers || [];
        for (const layer of layers) {
          if (layer.type === 'background') {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch {}
          }
        }
        
        const geoRes = await fetch('/districts/cd119-albersbaked-simplified.geojson');
        const geo = await geoRes.json();
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: geo } as any);
          map.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': fillColor, 'fill-opacity': 0.8 } });
          map.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-color': '#ffffff', 'line-width': 0.5 } });
          try {
            const b = computeBounds(geo);
            const bounds = new mapboxgl.LngLatBounds(b[0], b[1]);
            map.fitBounds(bounds, { padding: 40, animate: false });
          } catch {}
        }
      } catch (e) {
        // swallow
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Fetch live funding rows to compute legend counts
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        // Fetch data from all 3 election cycles (House and Senate only - these have Israel funding data)
        const cycles = ['2020', '2022', '2024'];
        let allRows: any[] = [];
        
        console.log('Starting data fetch for cycles:', cycles);
        
        for (const cycle of cycles) {
          // Fetch House districts data
          console.log(`Fetching house data for cycle ${cycle}`);
          const houseRes = await fetch(`/api/house-districts?cycle=${cycle}`);
          if (houseRes.ok) {
            const housePayload = await houseRes.json();
            const houseRows: any[] = housePayload?.data || [];
            console.log(`House cycle ${cycle}: ${houseRows.length} rows`);
            allRows = allRows.concat(houseRows);
          } else {
            console.error(`Failed to fetch house data for cycle ${cycle}:`, houseRes.status);
          }
          
          // Fetch Senate districts data
          console.log(`Fetching senate data for cycle ${cycle}`);
          const senateRes = await fetch(`/api/senate-districts?cycle=${cycle}`);
          if (senateRes.ok) {
            const senatePayload = await senateRes.json();
            const senateRows: any[] = senatePayload?.data || [];
            console.log(`Senate cycle ${cycle}: ${senateRows.length} rows`);
            allRows = allRows.concat(senateRows);
          } else {
            console.error(`Failed to fetch senate data for cycle ${cycle}:`, senateRes.status);
          }
        }
        
        console.log(`Total rows collected: ${allRows.length}`);
        
        let green = 0, yellow = 0, orange = 0, red = 0;
        let totalSpending = 0;
        
        for (const r of allRows) {
          let funding = 0;
          
          // Handle house data
          if (r.incumbent_total_israel_funding !== undefined || r.total_israel_funding !== undefined) {
            funding = Number(r.incumbent_total_israel_funding || r.total_israel_funding || 0) || 0;
            totalSpending += funding;
            
            if (funding === 0) green += 1;
            else if (funding > 0 && funding < 10000) yellow += 1;
            else if (funding >= 10000 && funding < 50000) orange += 1;
            else red += 1;
          }
          
          // Handle senate data - need to count both senators
          if (r.senator1_total_israel_funding !== undefined || r.senator2_total_israel_funding !== undefined) {
            const senator1Funding = Number(r.senator1_total_israel_funding || 0) || 0;
            const senator2Funding = Number(r.senator2_total_israel_funding || 0) || 0;
            
            totalSpending += senator1Funding + senator2Funding;
            
            // Count senator1
            if (senator1Funding === 0) green += 1;
            else if (senator1Funding > 0 && senator1Funding < 10000) yellow += 1;
            else if (senator1Funding >= 10000 && senator1Funding < 50000) orange += 1;
            else red += 1;
            
            // Count senator2 (if exists)
            if (r.senator2_name) {
              if (senator2Funding === 0) green += 1;
              else if (senator2Funding > 0 && senator2Funding < 10000) yellow += 1;
              else if (senator2Funding >= 10000 && senator2Funding < 50000) orange += 1;
              else red += 1;
            }
          }
        }
        
        console.log(`Calculated totals - Green: ${green}, Yellow: ${yellow}, Orange: ${orange}, Red: ${red}`);
        console.log(`Total spending: $${totalSpending.toLocaleString()}`);
        
        if (!isCancelled) {
          setCounts({ green, yellow, orange, red });
          
          if (onTotalUpdate) {
            console.log(`Calling onTotalUpdate with: $${totalSpending.toLocaleString()}`);
            onTotalUpdate(totalSpending);
          }
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
      }
    })();
    return () => { isCancelled = true; };
  }, []);

  return (
    <div className={`relative w-full ${heightClass}`}>
 
      {/* Top legend with counts */}
      {counts && (() => {
        const total = Math.max(1, counts.green + counts.yellow + counts.orange + counts.red);
        const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
        return (
          <div className="absolute bottom-4 right-4 z-10 bg-gray-800/90 text-white rounded-lg px-4 py-1 shadow flex flex-col gap-2 text-xs">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-green-500 inline-block"></span><span>Green: $0</span></div>
              <div className="text-xs text-gray-200 font-semibold ml-6">{counts.green} ({pct(counts.green)})</div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-yellow-500 inline-block"></span><span>Yellow: $1–$10K</span></div>
              <div className="text-xs text-gray-200 font-semibold ml-6">{counts.yellow} ({pct(counts.yellow)})</div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-orange-600 inline-block"></span><span>Orange: $10K–$50K</span></div>
              <div className="text-xs text-gray-200 font-semibold ml-6">{counts.orange} ({pct(counts.orange)})</div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-red-600 inline-block"></span><span>Red: ≥$50K</span></div>
              <div className="text-xs text-gray-200 font-semibold ml-6">{counts.red} ({pct(counts.red)})</div>
            </div>
          </div>
          
        );
      })()}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

    </div>
  );
}


