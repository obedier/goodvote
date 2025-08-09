'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    L: any;
  }
}

export default function SenateMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'israel' | 'party'>('israel');
  const [israelFilter, setIsraelFilter] = useState<'all' | 'pro' | 'non-pro'>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | 'dem' | 'rep' | 'ind'>('all');
  const [selectedCycle, setSelectedCycle] = useState('2024');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [selectedState, setSelectedState] = useState<any>(null);
  const [senateData, setSenateData] = useState<any[]>([]);

  // Load Leaflet (OpenStreetMap) - Free mapping solution
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Leaflet mapping library');
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !leafletLoaded) return;

    try {
      // Initialize Leaflet map focused on continental US
      map.current = window.L.map(mapContainer.current, {
        center: [39.0, -95.0], // Continental US center
        zoom: 4, // Zoom to show full US for states
        maxZoom: 8,
        minZoom: 3,
        zoomControl: true,
        attributionControl: true
      });

      // Add OpenStreetMap tile layer (free, no API key required)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map.current);

      console.log('Map loaded successfully');
      setMapLoaded(true);

      return () => {
        if (map.current) {
          map.current.remove();
        }
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [leafletLoaded]);

  // Load Senate data
  useEffect(() => {
    const loadSenateData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/senate-districts?cycle=${selectedCycle}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load senate data');
        }
        
        setSenateData(data.data || []);
      } catch (err) {
        console.error('Error loading senate data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load senate data');
      } finally {
        setLoading(false);
      }
    };

    loadSenateData();
  }, [selectedCycle]);

  // Store state layer reference
  const stateLayer = useRef<any>(null);

  // Function to get color based on senate funding
  const getStateColor = (stateData: any) => {
    if (viewMode === 'israel') {
      const totalFunding = (stateData.senator1_total_israel_funding || 0) + (stateData.senator2_total_israel_funding || 0);
      
      // Color based on combined funding amount
      if (totalFunding < 10000) return '#44ff44'; // Low funding (green)
      if (totalFunding < 50000) return '#ff8800'; // Medium funding (dark orange)
      
      // Red gradient based on funding level
      if (totalFunding < 100000) return '#ff6600'; // Dark orange-red
      if (totalFunding < 500000) return '#ff4400'; // Medium red
      if (totalFunding < 1000000) return '#ff2200'; // Dark red
      return '#ff0000'; // Bright red for highest funding
    } else {
      // Party mode - show based on majority party of senators
      const dem = ((stateData.senator1_party === 'DEM' || stateData.senator1_party === 'Democratic') ? 1 : 0) +
                 ((stateData.senator2_party === 'DEM' || stateData.senator2_party === 'Democratic') ? 1 : 0);
      const rep = ((stateData.senator1_party === 'REP' || stateData.senator1_party === 'Republican') ? 1 : 0) +
                 ((stateData.senator2_party === 'REP' || stateData.senator2_party === 'Republican') ? 1 : 0);
      
      if (rep > dem) return '#ff4444'; // Republican majority
      if (dem > rep) return '#4444ff'; // Democratic majority
      return '#9944ff'; // Split delegation (purple)
    }
  };

  // Load and display state boundaries with Senate data
  useEffect(() => {
    if (!map.current || !mapLoaded || senateData.length === 0) return;

    const loadStateMap = async () => {
      try {
        setLoading(true);
        
        // Load US states GeoJSON from CDN (free and reliable)
        const statesResponse = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
        if (!statesResponse.ok) {
          throw new Error('Failed to load states data');
        }
        
        const statesData = await statesResponse.json();
        
        // Merge senate data with states GeoJSON
        statesData.features = statesData.features.map((feature: any) => {
          // Handle different property name formats in GeoJSON files
          const stateCode = feature.properties.STUSPS || 
                           feature.properties.state_code || 
                           feature.properties.STATE_ABBR ||
                           feature.properties.postal;
          const senateInfo = senateData.find(s => s.state === stateCode);
          
          if (senateInfo) {
            feature.properties = { ...feature.properties, ...senateInfo };
          }
          
          return feature;
        });

        // Remove previous state layer if it exists
        if (stateLayer.current) {
          map.current.removeLayer(stateLayer.current);
        }

        // Create a GeoJSON layer for states
        stateLayer.current = window.L.geoJSON(statesData, {
          style: (feature: any) => ({
            fillColor: getStateColor(feature.properties),
            weight: 2,
            opacity: 1,
            color: '#ffffff',
            fillOpacity: 0.7
          }),
          onEachFeature: (feature: any, layer: any) => {
            // Add click event to update selected state
            layer.on('click', () => {
              setSelectedState(feature.properties);
            });
            
            // Add hover effects
            layer.on('mouseover', () => {
              layer.setStyle({
                weight: 4,
                color: '#000',
                fillOpacity: 0.9
              });
            });
            
            layer.on('mouseout', () => {
              layer.setStyle({
                weight: 2,
                color: '#ffffff',
                fillOpacity: 0.7
              });
            });
          }
        }).addTo(map.current);

        console.log('State layer added successfully');
        
      } catch (err) {
        console.error('Error loading state map:', err);
        setError('Failed to load state boundaries');
      } finally {
        setLoading(false);
      }
    };

    loadStateMap();
  }, [map.current, mapLoaded, senateData, viewMode]);

  // Function to update map colors based on filters
  const updateMapColors = useCallback(() => {
    if (stateLayer.current) {
      stateLayer.current.eachLayer((layer: any) => {
        const properties = layer.feature.properties;
        const color = getStateColor(properties);
        
        // Apply filtering based on current filters
        let opacity = 0.7;
        let visible = true;
        
        if (viewMode === 'israel') {
          const totalFunding = (properties.senator1_total_israel_funding || 0) + (properties.senator2_total_israel_funding || 0);
          if (israelFilter === 'pro' && totalFunding < 10000) {
            visible = false;
            opacity = 0.1;
          } else if (israelFilter === 'non-pro' && totalFunding >= 10000) {
            visible = false;
            opacity = 0.1;
          }
        } else if (viewMode === 'party') {
          const dem = ((properties.senator1_party === 'DEM' || properties.senator1_party === 'Democratic') ? 1 : 0) +
                     ((properties.senator2_party === 'DEM' || properties.senator2_party === 'Democratic') ? 1 : 0);
          const rep = ((properties.senator1_party === 'REP' || properties.senator1_party === 'Republican') ? 1 : 0) +
                     ((properties.senator2_party === 'REP' || properties.senator2_party === 'Republican') ? 1 : 0);
          
          if (partyFilter === 'dem' && dem === 0) {
            visible = false;
            opacity = 0.1;
          } else if (partyFilter === 'rep' && rep === 0) {
            visible = false;
            opacity = 0.1;
          }
        }
        
        layer.setStyle({ 
          fillColor: color,
          fillOpacity: visible ? opacity : 0.1
        });
      });
    }
  }, [viewMode, israelFilter, partyFilter]);

  // Update colors when filters change
  useEffect(() => {
    updateMapColors();
  }, [updateMapColors]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative bg-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gray-800 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">U.S. Senate Map</h1>
              <p className="text-gray-300 text-sm">Interactive map of all 50 states with senator information</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/senate-districts"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Senate List
              </Link>
              <Link 
                href="/congressional-map"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                House Map
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center py-4 border-t border-gray-700 mt-4">
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
              <div className="bg-gray-700 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('israel')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'israel' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Israel Funding
                </button>
                <button
                  onClick={() => setViewMode('party')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'party' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Party Control
                </button>
              </div>
            </div>

            {/* Israel Filter */}
            {viewMode === 'israel' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <select
                  value={israelFilter}
                  onChange={(e) => setIsraelFilter(e.target.value as 'all' | 'pro' | 'non-pro')}
                  className="border border-gray-300 rounded px-3 py-1 text-sm bg-white text-black"
                >
                  <option value="all">All States</option>
                  <option value="pro">High Funding (&gt;$10K)</option>
                  <option value="non-pro">Low Funding (&lt;$10K)</option>
                </select>
              </div>
            )}

            {/* Party Filter */}
            {viewMode === 'party' && (
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">Filter:</span>
                <select
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value as 'all' | 'dem' | 'rep' | 'ind')}
                  className="border border-gray-300 rounded px-3 py-1 text-sm bg-white text-black"
                >
                  <option value="all">All States</option>
                  <option value="dem">Democratic</option>
                  <option value="rep">Republican</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 pt-32">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-white text-center mb-4">Loading Senate data...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
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

      {/* Fixed State Details Popup */}
      {selectedState && (
        <div className="absolute top-4 left-4 bg-white p-6 rounded-lg shadow-xl z-20 max-w-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {selectedState.state || 'Unknown'} - {selectedState.state_name || 'Unknown State'}
            </h3>
            <button 
              onClick={() => setSelectedState(null)}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Senator 1 */}
            <div className="border-b border-gray-200 pb-3">
              <h4 className="font-semibold text-gray-800 mb-2">Senior Senator</h4>
              <p className="text-gray-700">
                <strong>Name:</strong>{' '}
                {(selectedState.senator1_person_id) ? 
                  <Link 
                    href={`/candidates/${selectedState.senator1_person_id}/funding-breakdown`}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                  >
                    {selectedState.senator1_name || 'Unknown'}
                  </Link> : 
                  <span>{selectedState.senator1_name || 'Unknown'}</span>
                }
              </p>
              
              <p className="text-gray-700">
                <strong>Party:</strong> {selectedState.senator1_party || 'Unknown'}
              </p>
              
              <p className="text-gray-700">
                <strong>Pro-Israel Funding:</strong>{' '}
                {selectedState.senator1_person_id ? 
                  <Link 
                    href={`/israel-lobby/${selectedState.senator1_person_id}`}
                    className="text-blue-600 hover:text-blue-800 underline font-semibold"
                    target="_blank"
                  >
                    ${(selectedState.senator1_total_israel_funding || 0).toLocaleString()}
                  </Link> : 
                  <span className="font-semibold">${(selectedState.senator1_total_israel_funding || 0).toLocaleString()}</span>
                }
              </p>
            </div>

            {/* Senator 2 */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Junior Senator</h4>
              <p className="text-gray-700">
                <strong>Name:</strong>{' '}
                {(selectedState.senator2_person_id) ? 
                  <Link 
                    href={`/candidates/${selectedState.senator2_person_id}/funding-breakdown`}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                  >
                    {selectedState.senator2_name || 'Unknown'}
                  </Link> : 
                  <span>{selectedState.senator2_name || 'Unknown'}</span>
                }
              </p>
              
              <p className="text-gray-700">
                <strong>Party:</strong> {selectedState.senator2_party || 'Unknown'}
              </p>
              
              <p className="text-gray-700">
                <strong>Pro-Israel Funding:</strong>{' '}
                {selectedState.senator2_person_id ? 
                  <Link 
                    href={`/israel-lobby/${selectedState.senator2_person_id}`}
                    className="text-blue-600 hover:text-blue-800 underline font-semibold"
                    target="_blank"
                  >
                    ${(selectedState.senator2_total_israel_funding || 0).toLocaleString()}
                  </Link> : 
                  <span className="font-semibold">${(selectedState.senator2_total_israel_funding || 0).toLocaleString()}</span>
                }
              </p>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-gray-800 font-semibold">
                <strong>Combined Funding:</strong>{' '}
                ${((selectedState.senator1_total_israel_funding || 0) + (selectedState.senator2_total_israel_funding || 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 max-w-xs">
        <h3 className="font-bold text-white text-sm mb-2">
          {viewMode === 'israel' ? 'Israel Funding by State' : 'Party Control by State'}
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
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-300">Republican Majority</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className="text-gray-300">Democratic Majority</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                <span className="text-gray-300">Split Delegation</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
