import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de Uso — TuCancha CR',
  description: 'Términos y condiciones de uso de la plataforma TuCancha CR.',
};

const LAST_UPDATED = '1 de junio de 2026';
const CONTACT_EMAIL = 'info@tucanchacr.com';
const COMPANY = 'TuCancha CR';
const SITE = 'https://www.tucanchacr.com';

export default function TerminosPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #080808)',
      color: 'var(--text, #ffffff)',
      fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
            Tu<span style={{ color: '#3B82F6' }}>Cancha</span>
          </span>
        </Link>
        <Link href="/" style={{
          fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          ← Volver al inicio
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(59, 130, 246,0.08)',
            border: '1px solid rgba(59, 130, 246,0.18)',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: '#3B82F6',
            letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            DOCUMENTO LEGAL
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Términos de Uso
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection title="1. Aceptación de los términos">
          <p>
            Al crear una cuenta, acceder o utilizar la plataforma {COMPANY} (sitio web y aplicación móvil),
            aceptás estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguna parte,
            debés discontinuar el uso inmediatamente.
          </p>
          <p>
            Estos términos forman un contrato legalmente vinculante entre vos y {COMPANY}.
          </p>
        </LegalSection>

        <LegalSection title="2. Descripción del servicio">
          <p>
            TuCancha CR es una plataforma digital que permite:
          </p>
          <ul>
            <li>Reservar canchas deportivas (fútbol, pádel y otros) de propietarios registrados.</li>
            <li>Crear y aceptar retos entre equipos.</li>
            <li>Organizar equipos y gestionar partidos amateurs.</li>
            <li>Procesar pagos entre jugadores y propietarios de canchas.</li>
          </ul>
          <p>
            TuCancha CR actúa como <strong>intermediario tecnológico</strong> entre jugadores y
            propietarios de instalaciones. No somos propietarios de las canchas listadas en la plataforma.
          </p>
        </LegalSection>

        <LegalSection title="3. Responsabilidades del usuario">
          <SubTitle>Para usar TuCancha CR debés:</SubTitle>
          <ul>
            <li>Tener al menos 18 años o contar con autorización de un adulto responsable.</li>
            <li>Proporcionar información de registro veraz y actualizada.</li>
            <li>Mantener la confidencialidad de tu contraseña.</li>
            <li>No compartir tu cuenta con terceros.</li>
            <li>No usar la plataforma para actividades ilegales.</li>
            <li>Respetar las instalaciones y las normas de cada cancha.</li>
          </ul>

          <SubTitle>Está prohibido:</SubTitle>
          <ul>
            <li>Crear reservas falsas o fraudulentas.</li>
            <li>Manipular el sistema de retos o estadísticas.</li>
            <li>Usar herramientas automatizadas (bots) para interactuar con la plataforma.</li>
            <li>Recopilar datos de otros usuarios sin consentimiento.</li>
            <li>Publicar contenido ofensivo, discriminatorio o ilegal.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Reglas de reserva">
          <ul>
            <li>Las reservas se confirman únicamente tras el pago exitoso a través de ONVO Pay.</li>
            <li>Un slot de cancha es exclusivo para quien lo reserva — no puede cederse sin autorización del propietario.</li>
            <li>Las reservas están sujetas a la disponibilidad en tiempo real de la cancha.</li>
            <li>TuCancha CR no garantiza la disponibilidad de canchas específicas en fechas u horas determinadas.</li>
            <li>El incumplimiento de las reglas de la cancha puede resultar en la suspensión de la cuenta.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Condiciones de pago">
          <ul>
            <li>Todos los pagos se procesan en colones costarricenses (CRC) a través de <strong>ONVO Pay</strong>.</li>
            <li>TuCancha CR cobra una comisión de plataforma del <strong>8%</strong> sobre cada transacción, más las tarifas de ONVO.</li>
            <li>Los precios mostrados en la plataforma son establecidos por cada propietario de cancha.</li>
            <li>El pago se debita en el momento de la confirmación de la reserva.</li>
            <li>TuCancha CR no almacena información de tarjetas de crédito o débito.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Política de cancelación">
          <SubTitle>Cancelaciones por el usuario:</SubTitle>
          <ul>
            <li>Cada cancha establece su propia política de cancelación y reembolso.</li>
            <li>La política de cada cancha es visible antes de confirmar la reserva.</li>
            <li>TuCancha CR no puede garantizar reembolsos en cancelaciones fuera del plazo establecido por el propietario.</li>
            <li>Para solicitar un reembolso por circunstancias excepcionales, contactá a <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#3B82F6' }}>{CONTACT_EMAIL}</a>.</li>
          </ul>

          <SubTitle>Cancelaciones por el propietario:</SubTitle>
          <ul>
            <li>Si un propietario cancela una reserva confirmada, el jugador recibirá reembolso completo.</li>
            <li>Cancelaciones repetidas por propietarios pueden resultar en la suspensión del perfil de la cancha.</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. Retos y competencias">
          <ul>
            <li>Los retos son acuerdos entre equipos organizados a través de la plataforma.</li>
            <li>La aceptación de un reto es un compromiso de participación.</li>
            <li>TuCancha CR no arbitra disputas entre equipos sobre el resultado de partidos.</li>
            <li>Los resultados y estadísticas son registrados bajo la responsabilidad de los participantes.</li>
            <li>El comportamiento antideportivo puede resultar en la suspensión de la cuenta.</li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Limitaciones de la plataforma">
          <ul>
            <li>TuCancha CR no supervisa la calidad ni el estado físico de las instalaciones.</li>
            <li>No somos responsables de lesiones, daños o accidentes ocurridos en las canchas.</li>
            <li>No garantizamos la disponibilidad continua del servicio (mantenimiento, actualizaciones).</li>
            <li>No somos responsables por pérdidas derivadas de pagos fallidos o errores técnicos de ONVO Pay.</li>
            <li>La información de canchas (precios, horarios, disponibilidad) puede cambiar sin previo aviso por parte del propietario.</li>
          </ul>
        </LegalSection>

        <LegalSection title="9. Propiedad intelectual">
          <p>
            Todo el contenido de TuCancha CR — incluyendo logotipo, diseño, código, textos e imágenes
            originales — es propiedad exclusiva de {COMPANY} y está protegido por las leyes de propiedad
            intelectual de Costa Rica y tratados internacionales. Queda prohibida su reproducción sin
            autorización escrita.
          </p>
        </LegalSection>

        <LegalSection title="10. Suspensión y terminación">
          <p>
            TuCancha CR se reserva el derecho de suspender o eliminar cuentas que:
          </p>
          <ul>
            <li>Violen estos Términos de Uso.</li>
            <li>Realicen actividades fraudulentas o ilegales.</li>
            <li>Comprometan la seguridad de otros usuarios o de la plataforma.</li>
            <li>Acumulen cancelaciones o no-shows reiterados.</li>
          </ul>
          <p>
            En casos graves, TuCancha CR puede suspender una cuenta sin previo aviso. En casos menores,
            se enviará una advertencia por correo electrónico.
          </p>
        </LegalSection>

        <LegalSection title="11. Modificaciones a los términos">
          <p>
            TuCancha CR puede actualizar estos términos en cualquier momento. Los cambios materiales
            serán notificados con al menos 15 días de anticipación por correo electrónico.
            El uso continuado de la plataforma después de la notificación constituye aceptación.
          </p>
        </LegalSection>

        <LegalSection title="12. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por las leyes de la <strong>República de Costa Rica</strong>.
            Cualquier disputa será sometida a la jurisdicción de los tribunales competentes de
            San José, Costa Rica.
          </p>
        </LegalSection>

        <LegalSection title="13. Contacto">
          <ul>
            <li>Correo: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#3B82F6' }}>{CONTACT_EMAIL}</a></li>
            <li>Plataforma: <a href={SITE} style={{ color: '#3B82F6' }}>{SITE}</a></li>
            <li>País: Costa Rica</li>
          </ul>
        </LegalSection>

        {/* Footer links */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 28,
          marginTop: 48,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <Link href="/privacidad" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>
            Política de Privacidad
          </Link>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>
            Volver a TuCancha
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: '#ffffff',
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 14.5,
        lineHeight: 1.75,
        color: 'rgba(255,255,255,0.62)',
      }}>
        {children}
      </div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontWeight: 700,
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13.5,
      letterSpacing: '-0.01em',
      marginBottom: 6,
      marginTop: 16,
    }}>
      {children}
    </p>
  );
}
