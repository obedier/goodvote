#!/usr/bin/env python3
import json
import sys

def analyze_districts():
    print("Analyzing congressional districts JSON file...")
    
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
    
    print(f"Total districts: {len(districts)}")
    print(f"Unique districts: {len(set(districts))}")
    print(f"Duplicates: {len(duplicates)}")
    if duplicates:
        print(f"Duplicate keys: {duplicates[:10]}")
    
    # Analyze coordinate complexity
    total_coords = 0
    max_coords = 0
    min_coords = float('inf')
    
    for f in features:
        coords = f['geometry']['coordinates'][0]
        coord_count = len(coords)
        total_coords += coord_count
        max_coords = max(max_coords, coord_count)
        min_coords = min(min_coords, coord_count)
    
    print(f"\nCoordinate Analysis:")
    print(f"Total coordinates: {total_coords:,}")
    print(f"Average coordinates per district: {total_coords // len(features):,}")
    print(f"Max coordinates per district: {max_coords:,}")
    print(f"Min coordinates per district: {min_coords:,}")
    
    # Check properties
    sample_props = features[0]['properties']
    print(f"\nProperties in each feature:")
    for key, value in sample_props.items():
        print(f"  {key}: {type(value).__name__} = {value}")
    
    # Estimate file size breakdown
    import os
    file_size = os.path.getsize('public/districts/congressional-districts.json')
    print(f"\nFile size: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")
    
    # Check if we can simplify coordinates
    print(f"\nOptimization opportunities:")
    print(f"1. Coordinate precision: Many coordinates have 6+ decimal places")
    print(f"2. Duplicate coordinates: Check for redundant points")
    print(f"3. Unnecessary properties: Some properties might not be needed")
    
    # Sample a few districts to see coordinate precision
    print(f"\nSample coordinate precision:")
    for i in range(min(3, len(features))):
        coords = features[i]['geometry']['coordinates'][0]
        sample_coord = coords[0]
        print(f"  District {i+1}: {sample_coord}")

if __name__ == "__main__":
    analyze_districts()
