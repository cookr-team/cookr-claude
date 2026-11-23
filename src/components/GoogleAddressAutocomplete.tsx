/// <reference types="google.maps" />
import React, { useState, useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

export interface AddressData {
  address: string;
  door_number: string;
  zip_code: string;
  city: string;
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (addressData: AddressData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  theme?: "light" | "dark";
}

// Helper to extract address parts from Google Address Components
export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): Partial<AddressData> {
  let address = "";
  let door_number = "";
  let zip_code = "";
  let city = "";

  for (const component of components) {
    const types = component.types;
    if (types.includes("route")) {
      address = component.long_name;
    } else if (types.includes("street_number")) {
      door_number = component.long_name;
    } else if (types.includes("postal_code")) {
      zip_code = component.long_name;
    } else if (types.includes("locality")) {
      city = component.long_name;
    } else if (!city && types.includes("administrative_area_level_2")) {
      city = component.long_name;
    } else if (!city && types.includes("administrative_area_level_1")) {
      city = component.long_name;
    }
  }

  return { address, door_number, zip_code, city };
}

export function GoogleAddressAutocomplete(props: GoogleAddressAutocompleteProps) {
  if (!hasValidKey) {
    // Fallback to normal input if there's no API key
    return (
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={props.className}
        disabled={props.disabled}
      />
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <AutocompleteInput {...props} />
    </APIProvider>
  );
}

function AutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder,
  className,
  disabled,
  theme = "dark",
}: GoogleAddressAutocompleteProps) {
  const placesLib = useMapsLibrary("places");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib) return;
    try {
      setAutocompleteService(new placesLib.AutocompleteService());
      setGeocoder(new google.maps.Geocoder());
    } catch (e) {
      console.error("Failed to initialize Google Maps services:", e);
    }
  }, [placesLib]);

  useEffect(() => {
    if (!autocompleteService || !value || value.length < 3 || !showDropdown) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "pt" }, // Restrict to Portugal as the app targets PT users
          types: ["address"],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [value, autocompleteService, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    onChange(prediction.structured_formatting.main_text || prediction.description);
    setShowDropdown(false);

    if (!geocoder) return;

    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const addressComponents = results[0].address_components;
        const parsed = parseAddressComponents(addressComponents);

        onAddressSelect({
          address: parsed.address || prediction.structured_formatting.main_text,
          door_number: parsed.door_number || "",
          zip_code: parsed.zip_code || "",
          city: parsed.city || "",
        });
      }
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />

      {showDropdown && suggestions.length > 0 && (
        <ul
          className={`absolute z-50 w-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border p-1 shadow-xl backdrop-blur-md ${
            theme === "dark"
              ? "bg-slate-900/95 border-white/10 text-white"
              : "bg-white/95 border-slate-200 text-slate-800"
          }`}
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 text-xs rounded-lg cursor-pointer transition-colors ${
                theme === "dark"
                  ? "hover:bg-white/5 active:bg-white/10 text-white/90"
                  : "hover:bg-slate-50 active:bg-slate-100 text-slate-700"
              }`}
            >
              <span className={`mt-0.5 shrink-0 text-orange-500`}>◆</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-left">{suggestion.structured_formatting.main_text}</p>
                {suggestion.structured_formatting.secondary_text && (
                  <p
                    className={`text-[10px] truncate text-left ${
                      theme === "dark" ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    {suggestion.structured_formatting.secondary_text}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
