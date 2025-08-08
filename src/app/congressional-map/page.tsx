'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

// Declare mapboxgl type
declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface DistrictData {
  state: string;
  district_name: string;
  incumbent_name: string;
  incumbent_party: string;
  incumbent_israel_score: number;
  incumbent_total_israel_funding: number;
  incumbent_cash_on_hand: number;
  district: string;
}

export default function CongressionalMapPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const map = useRef<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);

  // Load Mapbox
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      setMapboxLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxLoaded || !mapContainer.current || mapLoaded) return;

    window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 4
    });

    map.current.on('load', () => {
      console.log('🗺️ Map loaded, adding district data...');
      
      // Add district boundaries source
      map.current.addSource('districts', {
        type: 'geojson',
        data: '/districts/congressional-districts.json'
      });

      // Add fill layer with colors based on Israel score
      map.current.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': [
            'case',
            ['has', 'incumbent_israel_score'],
            [
              'interpolate',
              ['linear'],
              ['get', 'incumbent_israel_score'],
              0, '#ff4444',    // Red for low scores (0-1.5)
              1.5, '#ffaa44',  // Orange for medium-low (1.5-2.5)
              2.5, '#ffff44',  // Yellow for medium (2.5-3.5)
              3.5, '#44ff44',  // Green for medium-high (3.5-4.5)
              4.5, '#44ff44',  // Green for high scores (4.5-5)
              5, '#44ff44'     // Green for max score
            ],
            '#cccccc'  // Gray for districts without data
          ],
          'fill-opacity': 0.7
        }
      });

      // Add click handler
      map.current.on('click', 'district-fill', (e: any) => {
        const feature = e.features[0];
        const properties = feature.properties;
        
        if (properties.incumbent_name) {
          const popup = new window.mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-4">
                <h3 class="font-bold text-lg">${properties.district_name}</h3>
                <p class="text-sm"><strong>Incumbent:</strong> ${properties.incumbent_name}</p>
                <p class="text-sm"><strong>Party:</strong> ${properties.incumbent_party}</p>
                <p class="text-sm"><strong>Israel Score:</strong> ${properties.incumbent_israel_score}/5</p>
                <p class="text-sm"><strong>Israel Funding:</strong> $${properties.incumbent_total_israel_funding?.toLocaleString() || 'N/A'}</p>
                <p class="text-sm"><strong>Cash on Hand:</strong> $${properties.incumbent_cash_on_hand?.toLocaleString() || 'N/A'}</p>
              </div>
            `);
          popup.addTo(map.current);
        } else {
          const popup = new window.mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-4">
                <h3 class="font-bold text-lg">${properties.state} District ${properties.district}</h3>
                <p class="text-sm">No incumbent data available</p>
              </div>
            `);
          popup.addTo(map.current);
        }
      });

      // Add hover effect
      map.current.on('mouseenter', 'district-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'district-fill', () => {
        map.current.getCanvas().style.cursor = '';
      });

      setMapLoaded(true);
      setLoading(false);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Congressional District Map</h1>
            <p className="text-lg text-gray-600 mb-6">Loading district data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Congressional District Map</h1>
            <p className="text-lg text-red-600 mb-6">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Congressional District Map</h1>
          <p className="text-lg text-gray-600 mb-6">Interactive map showing Israel lobby scores by congressional district. Districts are color-coded based on incumbent Israel lobby scores.</p>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Legend</h2>
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded mr-2"></div>
                <span className="text-sm">Low Score (0-1.5)</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm">Medium Score (1.5-3.5)</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded mr-2"></div>
                <span className="text-sm">High Score (3.5-5)</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-400 rounded mr-2"></div>
                <span className="text-sm">No Data</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div 
            ref={mapContainer} 
            className="w-full h-96 rounded-lg" 
            style={{height: '600px'}}
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-gray-600">Click on districts to view detailed information</p>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/house-districts"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            View District Data Table
          </Link>
        </div>
      </div>
    </div>
  );
} 