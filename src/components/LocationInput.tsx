// ─── src/components/LocationInput.tsx ────────────────────────────────────────
// Google Places Autocomplete input.
// Loads the Maps JS API once, then attaches an Autocomplete widget.
// Calls onChange with the full PlaceResult (address + coords + placeId).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import type { PlaceResult } from '../types';

interface LocationInputProps {
  placeholder: string;
  value:       string;
  onChange:    (place: PlaceResult) => void;
  icon?:       React.ReactNode;
  className?:  string;
}

// Load the Maps JS API script once per page (idempotent).
let mapsLoaded  = false;
let mapsLoading = false;
const callbacks: Array<() => void> = [];

function loadMapsApi(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (mapsLoaded) { resolve(); return; }
    callbacks.push(resolve);
    if (mapsLoading) return;

    mapsLoading = true;
    const script  = document.createElement('script');
    script.src    = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async  = true;
    script.defer  = true;
    script.onload = () => {
      mapsLoaded = true;
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export const LocationInput: React.FC<LocationInputProps> = ({
  placeholder,
  value,
  onChange,
  icon,
  className = '',
}) => {
  const inputRef        = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn('[LocationInput] VITE_GOOGLE_MAPS_API_KEY is not set.');
      return;
    }

    loadMapsApi(key).then(() => {
      if (!inputRef.current || autocompleteRef.current) return;

      // Bias results towards Sri Lanka
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(5.9, 79.6),   // SW corner
        new google.maps.LatLng(9.9, 81.9),   // NE corner
      );

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        bounds,
        componentRestrictions: { country: 'lk' },
        fields: ['formatted_address', 'geometry', 'place_id'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current!.getPlace();
        if (!place.geometry?.location) return;

        const result: PlaceResult = {
          address: place.formatted_address ?? '',
          placeId: place.place_id         ?? '',
          coords: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
        };
        setInputValue(result.address);
        onChange(result);
      });
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onChange]);

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-3.5 h-5 w-5 text-text-sub pointer-events-none [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 ${
          icon ? 'pl-12' : 'pl-4'
        } pr-4 text-white focus:border-brand-red focus:shadow-brand outline-none transition-all ${className}`}
      />
    </div>
  );
};
