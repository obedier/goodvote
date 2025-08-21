'use client';

import { useEffect, useState } from 'react';
import HouseDistrictsMap from '@/components/maps/HouseDistrictsMap';

export default function HomePage() {
  const [totalSpending, setTotalSpending] = useState(0);

  useEffect(() => {
    // Create a new MutationObserver instance
    const observer = new MutationObserver(function(mutationsList, observer) {
      // Iterate through each mutation record
      for (const mutation of mutationsList) {
        // Check if the mutation was adding nodes to the DOM
        if (mutation.type === 'childList') {
          // Iterate through each added node
          mutation.addedNodes.forEach(node => {
            // Check if the added node is an element node and matches the logo selector
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).matches && (node as Element).matches('a.mapboxgl-ctrl-logo')) {
              // Apply the styles to hide the element
              (node as HTMLElement).style.visibility = 'hidden';
              (node as HTMLElement).style.pointerEvents = 'none';
              // Optionally, you can disconnect the observer if you only need to hide the first instance
              // observer.disconnect();
            }
          });
        }
      }
    });

    // Start observing the body element for changes in its children and any descendants
    observer.observe(document.body, { childList: true, subtree: true });

    // Additionally, check if the element already exists when the script runs
    const logoElement = document.querySelector('a.mapboxgl-ctrl-logo') as HTMLElement;
    if (logoElement) {
        logoElement.style.visibility = 'hidden';
        logoElement.style.pointerEvents = 'none';
    }

    // Cleanup function
    return () => observer.disconnect();
  }, []);

  const handleTotalUpdate = (total: number) => {
    setTotalSpending(total);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Israel lobby spent{' '}
          <span className="text-red-600 text-5xl">${totalSpending.toLocaleString()}</span>
          {' '}on US Politics (House, Senate & Presidential elections since 2020)
        </h1>
        <div className="overflow-hidden rounded-lg bg-white">
          <HouseDistrictsMap heightClass="h-[700px]" onTotalUpdate={handleTotalUpdate} />
        </div>
      </div>
      
 
    
    </div>
  );
}