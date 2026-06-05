export default function Home() {
  return (
    <main style={{
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: "'Georgia', serif",
    }}>

      {/* NAVEGACIÓN */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #222',
        position: 'sticky',
        top: 0,
        background: '#0a0a0a',
        zIndex: 100,
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c9a84c', letterSpacing: '2px' }}>
          OBRASDETEATRO.COM
        </div>
        <div style={{ display: 'flex', gap: '32px', fontSize: '13px', color: '#888' }}>
          <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Obras</a>
          <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Compañías</a>
          <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Convocatorias</a>
          <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Profesionales</a>
          <a href="#" style={{ color: '#c9a84c', textDecoration: 'none', border: '1px solid #c9a84c', padding: '6px 16px' }}>Acceder</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: '100px 40px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '4px',
          color: '#c9a84c',
          marginBottom: '24px',
          textTransform: 'uppercase',
        }}>
          En desarrollo · 20 países · Comunidad hispanohablante
        </div>
        <h1 style={{
          fontSize: '64px',
          fontWeight: 'normal',
          lineHeight: '1.1',
          marginBottom: '24px',
          letterSpacing: '-1px',
        }}>
          El ecosistema digital<br />
          del teatro en <em style={{ color: '#c9a84c', fontStyle: 'italic' }}>español.</em>
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#888',
          lineHeight: '1.7',
          maxWidth: '600px',
          marginBottom: '48px',
        }}>
          Obras, compañías, artistas, directores, festivales y convocatorias
          conectados en una sola plataforma para los 20 países de habla hispana.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#" style={{
            background: '#c9a84c',
            color: '#0a0a0a',
            padding: '14px 32px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '1px',
          }}>
            EXPLORAR OBRAS
          </a>
          <a href="#" style={{
            border: '1px solid #333',
            color: '#888',
            padding: '14px 32px',
            textDecoration: 'none',
            fontSize: '14px',
            letterSpacing: '1px',
          }}>
            PUBLICAR OBRA
          </a>
        </div>
      </section>

      {/* ESTADÍSTICAS */}
      <section style={{
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
        padding: '40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {[
          { num: '+4.000', label: 'Obras' },
          { num: '20', label: 'Países' },
          { num: '67', label: 'Convocatorias abiertas' },
          { num: '1.140', label: 'Compañías activas' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '36px', color: '#c9a84c', marginBottom: '8px' }}>{stat.num}</div>
            <div style={{ fontSize: '12px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* CONVOCATORIAS */}
      <section style={{ padding: '80px 40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#555', marginBottom: '40px', textTransform: 'uppercase' }}>
          Convocatorias abiertas
        </div>
        {[
          { tipo: 'Casting', titulo: 'Actriz protagonista', lugar: 'Buenos Aires', dias: '3 días', nuevo: true },
          { tipo: 'Festival', titulo: 'Festival Iberoamericano de Texto', lugar: 'Madrid', dias: '9 días', nuevo: false },
          { tipo: 'Residencia', titulo: 'Director residente 2026', lugar: 'Bogotá', dias: '14 días', nuevo: false },
        ].map((conv, i) => (
          <div key={i} style={{
            borderBottom: '1px solid #1a1a1a',
            padding: '24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', marginBottom: '6px', textTransform: 'uppercase' }}>
                {conv.tipo} {conv.nuevo && <span style={{ background: '#c9a84c', color: '#0a0a0a', padding: '2px 8px', fontSize: '10px', marginLeft: '8px' }}>NUEVO</span>}
              </div>
              <div style={{ fontSize: '18px', color: '#fff' }}>{conv.titulo}</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{conv.lugar}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>{conv.dias}</div>
              <a href="#" style={{ border: '1px solid #333', color: '#888', padding: '8px 20px', textDecoration: 'none', fontSize: '12px' }}>
                Ver convocatoria
              </a>
            </div>
          </div>
        ))}
      </section>

      {/* PLANES */}
      <section style={{
        background: '#0f0f0f',
        padding: '80px 40px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#555', marginBottom: '40px', textTransform: 'uppercase' }}>
            Planes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { nombre: 'Gratis', precio: '0€', desc: 'Perfil básico · Acceso al directorio · Convocatorias', color: '#333' },
              { nombre: 'Premium', precio: '6,99€', desc: 'Perfil destacado · ScenaIA · Analytics · Badge premium', color: '#c9a84c' },
              { nombre: 'Empresas', precio: '8,99€', desc: 'Página empresarial · Convocatorias ilimitadas · Verificado', color: '#555' },
            ].map((plan, i) => (
              <div key={i} style={{
                border: `1px solid ${plan.color}`,
                padding: '32px',
              }}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: plan.color, marginBottom: '16px', textTransform: 'uppercase' }}>{plan.nombre}</div>
                <div style={{ fontSize: '40px', color: '#fff', marginBottom: '16px' }}>{plan.precio}<span style={{ fontSize: '14px', color: '#555' }}>/mes</span></div>
                <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.7' }}>{plan.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #1a1a1a',
        padding: '40px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#333',
      }}>
        © 2026 obrasdeteatro.com — Ecosistema del teatro en español · 20 países
      </footer>

    </main>
  );
}