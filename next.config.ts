import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pnsirwtiiurczjwrayza.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Miniaturas de los vídeos de YouTube del perfil (sin cookies).
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      // Fotos de cabecera de los espacios escénicos (Wikimedia Commons).
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/commons/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/login',         destination: '/auth/login',    permanent: true },
      { source: '/registro',      destination: '/auth/registro', permanent: true },
      { source: '/profesionales', destination: '/directorio',    permanent: true },

      // Slugs rotos por el bug del orden LOWER/REGEXP_REPLACE en los triggers
      // de slug. Los corrige la migración
      // supabase/migrations/20261006105717_slugs_corregir_rotos.sql, que
      // aborta si el slug calculado no es exactamente el destino de aquí.
      // Solo los 12 visibles al público: los demás nunca tuvieron una URL
      // pública que conservar. 308 = permanent: true.
      // La obra, en dos reglas: la URL exacta va directa (con :path* vacío el
      // destino salía con barra final y costaba un segundo 308) y las subrutas
      // (/editar incluida) arrastran su resto.
      { source: '/obras/-eresa-s-cstasy',          destination: '/obras/teresas-ecstasy', permanent: true },
      { source: '/obras/-eresa-s-cstasy/:path+',   destination: '/obras/teresas-ecstasy/:path+', permanent: true },
      { source: '/perfil/-gostina-amilo-e-uca',    destination: '/perfil/agostina-camilo-de-luca', permanent: true },
      { source: '/perfil/-lexander',               destination: '/perfil/alexander', permanent: true },
      { source: '/perfil/-lfredo-allina',          destination: '/perfil/alfredo-vallina', permanent: true },
      { source: '/perfil/-laudio-abriel-e-eta',    destination: '/perfil/claudio-de-seta', permanent: true },
      { source: '/perfil/-abian-duardo-afael',     destination: '/perfil/fabian-eduardo-rafael', permanent: true },
      { source: '/perfil/-tima-attaoui',           destination: '/perfil/fatima', permanent: true },
      { source: '/perfil/-ctor-zar',               destination: '/perfil/hector', permanent: true },
      { source: '/perfil/-linca-lian',             destination: '/perfil/ilinca-ilian', permanent: true },
      { source: '/perfil/-ulio-vicente-luparello', destination: '/perfil/julio-vicente-luparello', permanent: true },
      { source: '/perfil/-agdalena-el-n-ojas',     destination: '/perfil/magdalena-belen-rojas', permanent: true },
      { source: '/perfil/-ofy',                    destination: '/perfil/sofy', permanent: true },
    ]
  },
};

export default nextConfig;
