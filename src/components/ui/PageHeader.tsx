"use client";

import Link from 'next/link';

type ActivePage = 'house-list' | 'house-map' | 'senate-list' | 'senate-map';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  cycle: string;
  onCycleChange: (cycle: string) => void;
  active: ActivePage;
}

function MapIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.5 3.6 3.9 5.8a1 1 0 0 0-.6.93v12.54a1 1 0 0 0 1.34.94l5.86-2.15 5.88 2.15c.23.08.48.08.7 0l5.6-2.22a1 1 0 0 0 .62-.93V4.48a1 1 0 0 0-1.34-.94l-5.56 2.21-5.9-2.15a1 1 0 0 0-.7 0ZM10 5.8l4 1.46v10.94l-4-1.46V5.8Zm-2 10.94-3.1 1.14V7.32L8 6.18v10.56Zm12.1 1.14L17 19.14V8.58l3.1-1.23v10.53Z" />
    </svg>
  );
}

function NavBlock({
  label,
  listHref,
  mapHref,
  listActive,
  mapActive,
}: {
  label: string;
  listHref: string;
  mapHref: string;
  listActive: boolean;
  mapActive: boolean;
}) {
  const baseBtn = 'px-3 py-1 rounded text-sm font-medium inline-flex items-center justify-center w-24';
  const activeBtn = 'bg-gray-600 text-white cursor-default';
  const listBtn = listActive ? activeBtn : 'bg-gray-200 hover:bg-gray-300 text-gray-900';
  const mapBtn = mapActive ? activeBtn : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="flex flex-col items-center gap-1">
      {listActive ? (
        <span className={`${baseBtn} ${listBtn}`} aria-current="page">{label}</span>
      ) : (
        <Link href={listHref} className={`${baseBtn} ${listBtn}`}>{label}</Link>
      )}
      {mapActive ? (
        <span className={`${baseBtn} ${mapBtn}`} aria-current="page"><MapIcon className="w-5 h-5" /></span>
      ) : (
        <Link href={mapHref} className={`${baseBtn} ${mapBtn}`} title={`${label} Map`}>
          <MapIcon className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}

export default function PageHeader({ title, subtitle, cycle, onCycleChange, active }: PageHeaderProps) {
  return (
    <div className="bg-gray-800 shadow-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle ? <p className="text-gray-300 text-sm">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">Cycle:</span>
              <select
                value={cycle}
                onChange={(e) => onCycleChange(e.target.value)}
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

            <div className="flex items-end gap-4">
              <NavBlock
                label="House"
                listHref="/house-districts"
                mapHref="/congressional-map"
                listActive={active === 'house-list'}
                mapActive={active === 'house-map'}
              />
              <NavBlock
                label="Senate"
                listHref="/senate-districts"
                mapHref="/senate-map"
                listActive={active === 'senate-list'}
                mapActive={active === 'senate-map'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



