"use client";

import { useState } from "react";

const COOKIE_TYPES = [
  {
    id: "necessary",
    label: "Cookies técnicas o necesarias",
    description:
      "Imprescindibles para el funcionamiento de la plataforma. Permiten iniciar sesión, mantener sesiones activas, gestionar la seguridad y completar formularios. No requieren consentimiento.",
    required: true,
  },
  {
    id: "preferences",
    label: "Cookies de preferencias",
    description:
      "Permiten recordar configuraciones elegidas por el usuario como idioma, zona geográfica y configuración de visualización.",
    required: false,
  },
  {
    id: "analytics",
    label: "Cookies analíticas",
    description:
      "Recopilan información estadística sobre el uso de la plataforma (Google Analytics, Google Tag Manager). Nos ayudan a mejorar el servicio.",
    required: false,
  },
  {
    id: "marketing",
    label: "Cookies de marketing y publicidad",
    description:
      "Permiten mostrar contenidos promocionales relevantes, campañas publicitarias, remarketing y medición de conversiones.",
    required: false,
  },
];

export default function CookiePreferences({ onSave, onClose }) {
  const [prefs, setPrefs] = useState({
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  });

  const toggle = (id) => {
    if (id === "necessary") return;
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurar preferencias de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Configurar preferencias de cookies
            </h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona qué tipos de cookies aceptas. Las cookies necesarias siempre están activas.
          </p>
        </div>

        {/* Lista de cookies */}
        <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto">
          {COOKIE_TYPES.map((type) => (
            <div key={type.id} className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{type.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{type.description}</p>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                {type.required ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                    Siempre activas
                  </span>
                ) : (
                  <button
                    role="switch"
                    aria-checked={prefs[type.id]}
                    onClick={() => toggle(type.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 ${
                      prefs[type.id] ? "bg-red-700" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        prefs[type.id] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                    <span className="sr-only">
                      {prefs[type.id] ? "Desactivar" : "Activar"} {type.label}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ ...prefs, necessary: true })}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
}
