'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

export default function CongressionalMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'israel' | 'party'>('israel');
  const [israelFilter, setIsraelFilter] = useState<'all' | 'pro' | 'non-pro'>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | 'dem' | 'rep' | 'ind'>('all');
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Load Mapbox GL JS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Mapbox GL JS script
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => {
      // Load Mapbox GL CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      document.head.appendChild(link);
      setMapboxLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Mapbox GL JS');
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxLoaded) return;

    try {
      // Set Mapbox access token - using a public token for development
      window.mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
      
      // Initialize map with dark gray style
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark gray style
        center: [-98.5795, 39.8283], // Center of US
        zoom: 3.5,
        maxZoom: 10,
        minZoom: 2,
        attributionControl: false,
        logoPosition: 'bottom-right'
      });

      // Add navigation controls
      map.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });

      return () => {
        if (map.current) {
          map.current.remove();
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  }, [mapboxLoaded]);

  // Function to get fill color based on current view mode and filters
  const getFillColor = () => {
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
        ['>=', ['get', 'incumbent_total_israel_funding'], 10000], '#ec4899', // Pink: >$10K (Pro-Israel)
        ['>=', ['get', 'incumbent_total_israel_funding'], 1000], '#fbbf24',   // Yellow: $1K-$10K (Pro-Israel)
        ['>=', ['get', 'incumbent_total_israel_funding'], 0], '#22c55e',      // Green: <$1K (Non-Pro-Israel)
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
          ['any',
            ['>=', ['get', 'incumbent_total_israel_funding'], 1000], // Show pink and yellow (pro-Israel)
          ], 0.8,
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
          ['any',
            ['<', ['get', 'incumbent_total_israel_funding'], 1000], // Show green (non-pro-Israel)
          ], 0.8,
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

  // Function to update map colors
  const updateMapColors = useCallback(() => {
    if (map.current && map.current.getLayer('district-fill')) {
      map.current.setPaintProperty('district-fill', 'fill-color', getFillColor());
      map.current.setPaintProperty('district-fill', 'fill-opacity', getFillOpacity());
    }
  }, [viewMode, israelFilter, partyFilter]);

  // Progressive loading of district data
  useEffect(() => {
    if (!mapLoaded || !map.current) {
      console.log('Map not ready yet:', { mapLoaded, mapExists: !!map.current });
      return;
    }

    console.log('Starting to load district data...');
    setProgressiveLoading(true);
    setLoadingProgress(0);

    // Load original boundaries with real data
    fetch('/districts/congressional-districts-simplified-fixed.json')
      .then(response => {
        console.log('Fetch response:', response.status, response.ok);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(districtData => {
        console.log('District data loaded:', districtData.type, districtData.features?.length, 'features');
        setLoadingProgress(30);
        
        try {
          console.log('Adding map source...');
          map.current.addSource('districts', {
            type: 'geojson',
            data: districtData
          });
          
          console.log('Adding map layers...');
          map.current.addLayer({
            id: 'district-fill',
            type: 'fill',
            source: 'districts',
            paint: {
              'fill-color': getFillColor(),
              'fill-opacity': getFillOpacity()
            }
          });
          
          map.current.addLayer({
            id: 'district-outline',
            type: 'line',
            source: 'districts',
            paint: {
              'line-color': '#374151',
              'line-width': 1
            }
          });

          console.log('Map layers added successfully');
          setLoadingProgress(100);
          setProgressiveLoading(false);

          // Add click handler for districts
          map.current.on('click', 'district-fill', (e: any) => {
            console.log('District clicked:', e.features[0].properties);
            const properties = e.features[0].properties;
            const isNonVoting = ['AZ-7', 'DC-98', 'TN-7', 'TX-18', 'VA-11'].includes(properties.lookup_key);
            
            const popup = new window.mapboxgl.Popup({
              closeButton: true,
              closeOnClick: false,
              maxWidth: '400px',
              className: 'custom-popup'
            })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-4">
                  ${isNonVoting ? 
                    `<div class="mb-3">
                       <h3 class="font-bold text-lg mb-1">${properties.district_name}</h3>
                       <p class="text-red-600 font-semibold">Non-Voting District</p>
                       <p class="text-sm text-gray-600">${properties.lookup_key === 'DC-98' ? 'DC never votes in Congress' : 'Vacant Seat'}</p>
                     </div>` :
                    `<div class="mb-3">
                       <h3 class="font-bold text-lg mb-1">${properties.incumbent_name || 'Unknown'} (${properties.incumbent_party || 'N/A'})</h3>
                       <p class="text-sm text-gray-600 mb-2">${properties.district_name || 'Unknown District'}</p>
                       <p class="text-lg font-semibold ${(properties.incumbent_total_israel_funding || 0) >= 10000 ? 'text-pink-600' : (properties.incumbent_total_israel_funding || 0) >= 1000 ? 'text-yellow-600' : 'text-green-600'}">
                         Israel Funding: $${(properties.incumbent_total_israel_funding || 0)?.toLocaleString() || 'N/A'}
                       </p>
                     </div>`
                  }
                </div>
              `)
              .addTo(map.current);
          });
          
          map.current.on('mouseenter', 'district-fill', () => { 
            if (map.current) {
              map.current.getCanvas().style.cursor = 'pointer'; 
            }
          });
          
          map.current.on('mouseleave', 'district-fill', () => { 
            if (map.current) {
              map.current.getCanvas().style.cursor = ''; 
            }
          });

        } catch (error) {
          console.error('Error adding map layers:', error);
          setError('Failed to add district data to map');
          setProgressiveLoading(false);
        }

      })
      .catch(error => {
        console.error('Error loading district data:', error);
        setError('Failed to load district boundaries');
        setProgressiveLoading(false);
      });
  }, [mapLoaded]); // Only depend on mapLoaded

  // Update colors when view mode or filters change
  useEffect(() => {
    if (mapLoaded && map.current) {
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
            <a className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors" href="/house-districts">View District List</a>
          </div>
          
          {/* Filters moved to header */}
          <div className="flex flex-wrap gap-4 items-center py-4 border-t border-gray-700">
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
        <div ref={mapContainer} className="w-full h-screen" />
        
        {/* Loading Overlay */}
        {(!mapboxLoaded || progressiveLoading) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-white text-center mb-4">
                {!mapboxLoaded ? 'Loading Map Library...' : 'Loading District Data...'}
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

        {/* Mapbox Loading Message */}
        {!mapboxLoaded && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-white text-center mb-4">Loading Map Library...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                  <div className="w-4 h-4 bg-pink-500 rounded mr-2"></div>
                  <span className="text-gray-300">High Pro-Israel ($10K+)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                  <span className="text-gray-300">Medium Pro-Israel ($1K-$10K)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-300">Non-Pro-Israel ($0-$1K)</span>
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