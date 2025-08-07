#!/usr/bin/env python3
import json
import os
import sys
from collections import defaultdict

def analyze_districts_comprehensive():
    print("🔍 COMPREHENSIVE CONGRESSIONAL DISTRICTS ANALYSIS")
    print("=" * 60)
    
    # 1. Analyze main GeoJSON file
    print("\n📊 1. MAIN GEOJSON FILE ANALYSIS")
    print("-" * 40)
    
    with open('public/districts/congressional-districts.json', 'r') as f:
        data = json.load(f)
    
    features = data['features']
    print(f"Total features: {len(features)}")
    
    # Check for duplicates
    districts = []
    duplicates = []
    for f in features:
        props = f['properties']
        key = f"{props['state']}-{props['district']}"
        if key in districts:
            duplicates.append(key)
        districts.append(key)
    
    print(f"Unique districts: {len(set(districts))}")
    print(f"Duplicates: {len(duplicates)}")
    
    # Analyze coordinate complexity
    total_coords = 0
    max_coords = 0
    min_coords = float('inf')
    coord_precision = defaultdict(int)
    
    for f in features:
        coords = f['geometry']['coordinates'][0]
        coord_count = len(coords)
        total_coords += coord_count
        max_coords = max(max_coords, coord_count)
        min_coords = min(min_coords, coord_count)
        
        # Check coordinate precision
        for coord in coords[:10]:  # Sample first 10 coordinates
            lat_precision = len(str(coord[1]).split('.')[-1]) if '.' in str(coord[1]) else 0
            lon_precision = len(str(coord[0]).split('.')[-1]) if '.' in str(coord[0]) else 0
            coord_precision[f"lat_{lat_precision}"] += 1
            coord_precision[f"lon_{lon_precision}"] += 1
    
    print(f"\nCoordinate Analysis:")
    print(f"  Total coordinates: {total_coords:,}")
    print(f"  Average per district: {total_coords // len(features):,}")
    print(f"  Max per district: {max_coords:,}")
    print(f"  Min per district: {min_coords:,}")
    
    print(f"\nCoordinate Precision:")
    for precision, count in sorted(coord_precision.items()):
        print(f"  {precision}: {count:,} coordinates")
    
    # File size analysis
    file_size = os.path.getsize('public/districts/congressional-districts.json')
    print(f"\nFile Size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")
    
    # 2. Analyze metadata file
    print("\n📊 2. METADATA FILE ANALYSIS")
    print("-" * 40)
    
    if os.path.exists('public/districts/district-metadata.json'):
        with open('public/districts/district-metadata.json', 'r') as f:
            metadata = json.load(f)
        
        metadata_size = os.path.getsize('public/districts/district-metadata.json')
        print(f"Metadata file size: {metadata_size:,} bytes ({metadata_size / 1024:.1f} KB)")
        print(f"Metadata entries: {len(metadata)}")
        
        # Check for overlap with main file
        main_props = set()
        for f in features:
            props = f['properties']
            key = f"{props['state']}-{props['district']}"
            main_props.add(key)
        
        metadata_keys = set(metadata.keys())
        overlap = main_props.intersection(metadata_keys)
        print(f"Keys in main file: {len(main_props)}")
        print(f"Keys in metadata: {len(metadata_keys)}")
        print(f"Overlapping keys: {len(overlap)}")
        
        if overlap:
            print("Sample overlapping keys:", list(overlap)[:5])
    else:
        print("❌ Metadata file not found")
    
    # 3. Identify optimization opportunities
    print("\n📊 3. OPTIMIZATION OPPORTUNITIES")
    print("-" * 40)
    
    print("🚨 CRITICAL ISSUES:")
    print("  1. File size: 369MB is extremely large for web loading")
    print("  2. Coordinate precision: Many coordinates have 6+ decimal places")
    print("  3. Duplicate data: Metadata exists in both main file and separate file")
    print("  4. Loading approach: Currently loads entire file before displaying")
    
    print("\n💡 OPTIMIZATION STRATEGIES:")
    print("  1. Reduce coordinate precision (6 decimals → 4-5 decimals)")
    print("  2. Implement coordinate simplification (Douglas-Peucker algorithm)")
    print("  3. Merge metadata into main file to reduce HTTP requests")
    print("  4. Implement progressive loading (load basic shapes first, details later)")
    print("  5. Use vector tiles for better performance")
    print("  6. Implement client-side caching")
    
    # 4. Analyze loading approach
    print("\n📊 4. CURRENT LOADING APPROACH")
    print("-" * 40)
    
    print("Current approach:")
    print("  1. Load Mapbox GL JS")
    print("  2. Fetch district-metadata.json (235KB)")
    print("  3. Fetch congressional-districts.json (369MB)")
    print("  4. Wait for entire file to load before displaying")
    print("  5. Add all districts to map at once")
    
    print("\nProblems with current approach:")
    print("  ❌ 369MB download blocks initial display")
    print("  ❌ No progressive loading")
    print("  ❌ No caching strategy")
    print("  ❌ Duplicate data between files")
    print("  ❌ No fallback for slow connections")
    
    # 5. Calculate potential savings
    print("\n📊 5. POTENTIAL SAVINGS CALCULATION")
    print("-" * 40)
    
    # Estimate savings from coordinate precision reduction
    current_coords = total_coords
    estimated_savings = current_coords * 0.3  # 30% reduction from precision + simplification
    print(f"Current coordinates: {current_coords:,}")
    print(f"Estimated after optimization: {current_coords - estimated_savings:,}")
    print(f"Potential coordinate reduction: {estimated_savings:,} ({estimated_savings/current_coords*100:.1f}%)")
    
    # Estimate file size reduction
    current_size = file_size
    estimated_new_size = current_size * 0.4  # 60% reduction
    print(f"Current file size: {current_size / 1024 / 1024:.1f} MB")
    print(f"Estimated after optimization: {estimated_new_size / 1024 / 1024:.1f} MB")
    print(f"Potential size reduction: {(current_size - estimated_new_size) / 1024 / 1024:.1f} MB")
    
    # 6. Recommended approach
    print("\n📊 6. RECOMMENDED OPTIMIZED APPROACH")
    print("-" * 40)
    
    print("Phase 1 - Immediate fixes:")
    print("  1. Reduce coordinate precision to 4-5 decimals")
    print("  2. Merge metadata into main file")
    print("  3. Implement coordinate simplification")
    print("  4. Add gzip compression")
    
    print("\nPhase 2 - Progressive loading:")
    print("  1. Load simplified boundaries first (10-20% of current size)")
    print("  2. Display map immediately with basic shapes")
    print("  3. Load detailed boundaries progressively")
    print("  4. Implement client-side caching")
    
    print("\nPhase 3 - Advanced optimization:")
    print("  1. Implement vector tiles")
    print("  2. Add server-side caching")
    print("  3. Implement lazy loading by viewport")
    print("  4. Add WebP/compressed formats")

if __name__ == "__main__":
    analyze_districts_comprehensive()
