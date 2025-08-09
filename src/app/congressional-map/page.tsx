'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    L: any;
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
  const [selectedCycle, setSelectedCycle] = useState('2024');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [pieChartData, setPieChartData] = useState<{
    green: { count: number; percentage: number; districts: any[] };
    orange: { count: number; percentage: number; districts: any[] };
    red: { count: number; percentage: number; districts: any[] };
  } | null>(null);

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
      // Initialize Leaflet map
      map.current = window.L.map(mapContainer.current, {
        center: [39.8283, -98.5795], // Center of US (lat, lng)
        zoom: 4,
        maxZoom: 10,
        minZoom: 2,
        zoomControl: true,
        attributionControl: true
      });

      // Add OpenStreetMap tile layer (free, no API key required)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map.current);

      // Add a dark theme alternative
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map.current);

      console.log('Map loaded successfully');
      setMapLoaded(true);

      return () => {
        if (map.current) {
          map.current.remove();
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  }, [leafletLoaded]);

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

  // Store district layer reference
  const districtLayer = useRef<any>(null);

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

  // Function to update map colors and filtering
  const updateMapColors = useCallback(() => {
    if (districtLayer.current) {
      districtLayer.current.eachLayer((layer: any) => {
        const properties = layer.feature.properties;
        const color = getDistrictColor(properties);
        
        // Apply filtering based on current filters
        let opacity = 0.7;
        let visible = true;
        
        if (viewMode === 'israel') {
          const funding = properties.incumbent_total_israel_funding || 0;
          if (israelFilter === 'pro' && funding < 10000) {
            visible = false;
            opacity = 0.1;
          } else if (israelFilter === 'non-pro' && funding >= 10000) {
            visible = false;
            opacity = 0.1;
          }
        } else if (viewMode === 'party') {
          const party = properties.incumbent_party;
          if (partyFilter === 'dem' && party !== 'Democratic' && party !== 'DEM') {
            visible = false;
            opacity = 0.1;
          } else if (partyFilter === 'rep' && party !== 'Republican' && party !== 'REP') {
            visible = false;
            opacity = 0.1;
          } else if (partyFilter === 'ind' && (party === 'Democratic' || party === 'DEM' || party === 'Republican' || party === 'REP')) {
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

  // Function to calculate pie chart data
  const calculatePieChartData = () => {
    if (districtLayer.current) {
      const greenDistricts: any[] = [];
      const orangeDistricts: any[] = [];
      const redDistricts: any[] = [];
      
      districtLayer.current.eachLayer((layer: any) => {
        const properties = layer.feature.properties;
        if (properties.incumbent_name && properties.incumbent_name !== 'Unknown') {
          const district = {
            district: `${properties.state}-${properties.district}`,
            name: properties.incumbent_name,
            party: properties.incumbent_party,
            funding: properties.incumbent_total_israel_funding || 0,
            score: properties.incumbent_israel_score || 0
          };
          
          const funding = properties.incumbent_total_israel_funding || 0;
          if (funding < 10000) {
            greenDistricts.push(district);
          } else if (funding < 50000) {
            orangeDistricts.push(district);
          } else {
            redDistricts.push(district);
          }
        }
      });
      
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
    }
  };

  // Function to show debug modal with all candidate data
  const showDebugData = () => {
    if (districtLayer.current) {
      const allDistricts: any[] = [];
      districtLayer.current.eachLayer((layer: any) => {
        const properties = layer.feature.properties;
        if (properties.incumbent_name && properties.incumbent_name !== 'Unknown') {
          allDistricts.push({
            district: `${properties.state}-${properties.district}`,
            name: properties.incumbent_name,
            party: properties.incumbent_party,
            funding: properties.incumbent_total_israel_funding || 0,
            score: properties.incumbent_israel_score || 0
          });
        }
      });
      
      // Sort by funding amount (highest first)
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
                <div class="stat-number">$${(allDistricts.reduce((sum, d) => sum + d.funding, 0)).toLocaleString()}</div>
                <div class="stat-label">Total Funding</div>
              </div>
              <div class="stat">
                <div class="stat-number">${Math.round((allDistricts.reduce((sum, d) => sum + d.funding, 0) / allDistricts.length)).toLocaleString()}</div>
                <div class="stat-label">Avg Funding</div>
              </div>
            </div>
            
            <div class="district-list">
              ${allDistricts.map(district => `
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
                <div class="stat-number">$${(categoryData.districts.reduce((sum, d) => sum + d.funding, 0)).toLocaleString()}</div>
                <div class="stat-label">Total Funding</div>
              </div>
            </div>
            
            <div class="district-list">
              ${categoryData.districts.map(district => `
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

  // Progressive loading of district data
  useEffect(() => {
    if (!mapLoaded || !map.current) {
      console.log('Map not ready yet:', { mapLoaded, mapExists: !!map.current });
      return;
    }

    console.log('Starting to load district data...');
    setProgressiveLoading(true);
    setLoadingProgress(0);

    // Step 1: Load simplified boundaries for quick display
    fetch('/districts/congressional-districts-simplified-fixed.json')
      .then(response => {
        console.log('Fetch simplified response:', response.status, response.ok);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(simplifiedData => {
        console.log('Simplified data loaded:', simplifiedData.type, simplifiedData.features?.length, 'features');
        setLoadingProgress(30);
        
        try {
          console.log('Adding simplified district layer to Leaflet map...');
          
          // Create a GeoJSON layer with styling
          districtLayer.current = window.L.geoJSON(simplifiedData, {
            style: (feature: any) => ({
              fillColor: getDistrictColor(feature.properties),
              weight: 1,
              opacity: 0.8,
              color: '#ffffff',
              fillOpacity: 0.7
            }),
            onEachFeature: (feature: any, layer: any) => {
              // Add popup with district information
              const props = feature.properties;
              const popupContent = `
                <div style="font-family: Arial, sans-serif; max-width: 250px; background: rgba(255, 255, 255, 0.95); padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                  <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
                    ${props.state || 'Unknown'}-${props.district || 'Unknown'}
                  </h3>
                  <p style="margin: 4px 0; color: #555;"><strong>Incumbent:</strong> 
                    ${(props.incumbent_person_id || props.fec_id) ? 
                      `<a href="/candidates/${props.incumbent_person_id || props.fec_id}/funding-breakdown" 
                          style="color: #0066cc; text-decoration: underline; cursor: pointer;" 
                          target="_blank">
                        ${props.incumbent_name || 'Unknown'}
                      </a>` : 
                      `${props.incumbent_name || 'Unknown'}`
                    }
                  </p>
                  <p style="margin: 4px 0; color: #555;"><strong>Party:</strong> ${props.incumbent_party || 'Unknown'}</p>
                  <p style="margin: 4px 0; color: #555;"><strong>Pro-Israel Funding:</strong> $${(props.incumbent_total_israel_funding || 0).toLocaleString()}</p>
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }).addTo(map.current);
          
          // Calculate pie chart data
          calculatePieChartData();
          
          console.log('Simplified district layer added successfully');
          setLoadingProgress(60);
          
          // Step 2: Load full detailed boundaries in background
          return fetch('/districts/congressional-districts-fixed.json');
        } catch (error) {
          console.error('Error adding simplified map layers:', error);
          setError('Failed to add district data to map');
          setProgressiveLoading(false);
          throw error;
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(fullData => {
        console.log('Full data loaded:', fullData.type, fullData.features?.length, 'features');
        setLoadingProgress(90);
        
        try {
          console.log('Replacing with full detailed district layer...');
          
          // Remove simplified layer
          if (districtLayer.current) {
            map.current.removeLayer(districtLayer.current);
          }
          
          // Create detailed GeoJSON layer
          districtLayer.current = window.L.geoJSON(fullData, {
            style: (feature: any) => ({
              fillColor: getDistrictColor(feature.properties),
              weight: 1,
              opacity: 0.8,
              color: '#ffffff',
              fillOpacity: 0.7
            }),
            onEachFeature: (feature: any, layer: any) => {
              // Add popup with district information
              const props = feature.properties;
              const popupContent = `
                <div style="font-family: Arial, sans-serif; max-width: 250px; background: rgba(255, 255, 255, 0.95); padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                  <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
                    ${props.state || 'Unknown'}-${props.district || 'Unknown'}
                  </h3>
                  <p style="margin: 4px 0; color: #555;"><strong>Incumbent:</strong> 
                    ${(props.incumbent_person_id || props.fec_id) ? 
                      `<a href="/candidates/${props.incumbent_person_id || props.fec_id}/funding-breakdown" 
                          style="color: #0066cc; text-decoration: underline; cursor: pointer;" 
                          target="_blank">
                        ${props.incumbent_name || 'Unknown'}
                      </a>` : 
                      `${props.incumbent_name || 'Unknown'}`
                    }
                  </p>
                  <p style="margin: 4px 0; color: #555;"><strong>Party:</strong> ${props.incumbent_party || 'Unknown'}</p>
                  <p style="margin: 4px 0; color: #555;"><strong>Pro-Israel Funding:</strong> $${(props.incumbent_total_israel_funding || 0).toLocaleString()}</p>
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }).addTo(map.current);
          
          // Calculate pie chart data
          calculatePieChartData();
          
          console.log('Full district layer added successfully');
          setLoadingProgress(100);
          setProgressiveLoading(false);

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
        <div ref={mapContainer} className="w-full h-screen" />
        
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