'use client';

import { FormEvent, useState } from 'react';
import { LOCATIONS, Location } from '@/types';

interface SettingsProps {
  locations: Location[];
  customLocations: Location[];
  onAddLocation: (location: string) => boolean;
  onDeleteLocation: (location: string) => void;
}

export function Settings({ locations, customLocations, onAddLocation, onDeleteLocation }: SettingsProps) {
  const [newLocation, setNewLocation] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const added = onAddLocation(newLocation);
    if (added) {
      setNewLocation('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Locations</h3>
          <p className="text-xs text-gray-400 mt-1">Add custom storage locations for filters, forms, and receipt imports.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newLocation}
            onChange={(event) => setNewLocation(event.target.value)}
            className="input-field"
            placeholder="e.g., Garage Freezer"
          />
          <button type="submit" className="btn-primary shrink-0">
            Add
          </button>
        </form>
      </div>

      <div className="card space-y-2">
        {locations.map(location => {
          const isDefaultLocation = (LOCATIONS as readonly string[]).includes(location);
          const isCustomLocation = customLocations.includes(location);

          return (
            <div key={location} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{location}</p>
                <p className="text-xs text-gray-400">{isDefaultLocation ? 'Default location' : 'Custom location'}</p>
              </div>
              {isCustomLocation && (
                <button
                  type="button"
                  onClick={() => onDeleteLocation(location)}
                  className="text-xs font-medium text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
