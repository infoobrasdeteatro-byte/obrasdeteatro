"use client";

import { useState, useEffect } from "react";
import CookiePreferences from "./CookiePreferences";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    localStorage.setItem("cookiePreferences", JSON.stringify({
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    }));
    setVisible(false);
    // Activar Google Analytics si está disponible
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted",
      });
    }
  };

  const handleRejectAll = () => {
    localStorage.setItem("cookieConsent", "rejected");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    localStorage.setItem("cookiePreferences", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    }));
    setVisible(false);
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
      });
    }
  };

  const handleSavePreferences = (prefs) => {
    localStorage.setItem("cookieConsent", "custom");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    localStorage.setItem("cookiePreferences", JSON.stringify(prefs));
    setVisible(false);
    setShowPreferences(false);
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: prefs.analytics ? "granted" : "denied",
        ad_storage: prefs.marketing ? "granted" : "denied",
      });
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay oscuro cuando se abre el panel de preferencias */}
      {showPreferences && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowPreferences(false)}
        />
      )}

      {/* Panel de preferencias */}
      {showPreferences && (
        <CookiePreferences
          onSave={handleSavePreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {/* Banner principal */}
      <div
        role="dialog"
        aria-label="Aviso de cookies"
        aria-live="polite"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Texto */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">🍪</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Utilizamos cookies en ObrasDeTeatro®
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Usamos cookies propias y de terceros para garantizar el funcionamiento de la plataforma, analizar el uso del sitio y mejorar tu experiencia. Puedes aceptar todas, rechazarlas o configurar tus preferencias.{" "}
                    <a
                      href="/legal/cookies"
                      className="text-red-700 underline hover:text-red-900 font-medium"
                    >
                      Política de Cookies
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
              >
                Configurar preferencias
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
