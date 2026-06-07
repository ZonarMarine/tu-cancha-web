import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — TuCancha CR',
  description: 'Política de privacidad y tratamiento de datos personales de TuCancha CR.',
};

const LAST_UPDATED = '1 de junio de 2026';
const CONTACT_EMAIL = 'info@tucanchacr.com';
const COMPANY = 'TuCancha CR';
const SITE = 'https://www.tucanchacr.com';

export default function PrivacidadPage() {
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
            Tu<span style={{ color: '#D7FF00' }}>Cancha</span>
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
            background: 'rgba(215,255,0,0.08)',
            border: '1px solid rgba(215,255,0,0.18)',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: '#D7FF00',
            letterSpacing: '0.1em',
            marginBottom: 16,
          }}>
            DOCUMENTO LEGAL
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Política de Privacidad
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <LegalSection title="1. Quiénes somos">
          <p>
            {COMPANY} ("nosotros", "la plataforma") opera el sitio web <strong>{SITE}</strong> y
            la aplicación móvil TuCancha CR. Somos una plataforma de reserva de canchas deportivas
            y organización de partidos amateurs en Costa Rica.
          </p>
          <p>Para consultas sobre privacidad: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#D7FF00' }}>{CONTACT_EMAIL}</a></p>
        </LegalSection>

        <LegalSection title="2. Datos que recopilamos">
          <SubTitle>Información de cuenta</SubTitle>
          <ul>
            <li>Nombre completo o alias</li>
            <li>Dirección de correo electrónico</li>
            <li>Contraseña (almacenada con hash, nunca en texto plano)</li>
            <li>Número de teléfono (opcional)</li>
            <li>Foto de perfil (opcional)</li>
          </ul>

          <SubTitle>Información de actividad</SubTitle>
          <ul>
            <li>Reservas de canchas (fecha, hora, cancha, monto pagado)</li>
            <li>Retos creados y aceptados</li>
            <li>Equipo y compañeros de equipo</li>
            <li>Historial de partidos</li>
          </ul>

          <SubTitle>Información de pago</SubTitle>
          <ul>
            <li>TuCancha CR <strong>no almacena</strong> datos de tarjetas de crédito ni débito.</li>
            <li>Los pagos son procesados por <strong>ONVO Pay</strong>, un procesador de pagos certificado PCI-DSS.</li>
            <li>Solo almacenamos el ID de la transacción, el monto y el estado del pago.</li>
          </ul>

          <SubTitle>Datos técnicos</SubTitle>
          <ul>
            <li>Tipo de dispositivo y sistema operativo</li>
            <li>Dirección IP (anonimizada)</li>
            <li>Logs de acceso para seguridad</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Cómo usamos tu información">
          <ul>
            <li><strong>Operación del servicio:</strong> Procesar reservas, confirmar pagos, gestionar tu cuenta.</li>
            <li><strong>Comunicaciones:</strong> Enviarte confirmaciones de reserva, recordatorios de partidos y notificaciones relevantes.</li>
            <li><strong>Seguridad:</strong> Detectar fraudes, accesos no autorizados y actividad sospechosa.</li>
            <li><strong>Mejora del servicio:</strong> Analizar uso agregado y anónimo para mejorar la plataforma.</li>
            <li><strong>Soporte:</strong> Responder consultas y resolver problemas.</li>
          </ul>
          <p>
            <strong>No vendemos</strong> tus datos personales a terceros bajo ninguna circunstancia.
            No usamos tus datos para publicidad de terceros.
          </p>
        </LegalSection>

        <LegalSection title="4. Autenticación y seguridad">
          <ul>
            <li>La autenticación es gestionada por <strong>Supabase Auth</strong>, un servicio con cifrado de nivel empresarial.</li>
            <li>Las contraseñas se almacenan con hashing bcrypt — nunca podemos ver tu contraseña.</li>
            <li>Las sesiones usan tokens JWT con expiración automática.</li>
            <li>Todas las comunicaciones van cifradas con TLS 1.3.</li>
            <li>Los datos en reposo están cifrados en la base de datos.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Pagos">
          <ul>
            <li>Los pagos son procesados exclusivamente por <strong>ONVO Pay</strong> (onvopay.com).</li>
            <li>TuCancha CR actúa como intermediario entre jugadores y propietarios de canchas.</li>
            <li>La plataforma retiene una comisión del 8% más la tarifa de ONVO (~2.9% + ₡300).</li>
            <li>El propietario de la cancha recibe su pago neto según el ciclo de pagos de ONVO.</li>
            <li>Los reembolsos se procesan según la política de cancelación de cada cancha.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Notificaciones">
          <ul>
            <li>Enviamos correos transaccionales para confirmaciones de reserva, cambios de estado y alertas de seguridad. Estos no son opcionales.</li>
            <li>Las notificaciones push (cuando estén disponibles) son opcionales y puedes desactivarlas en cualquier momento desde la configuración del dispositivo.</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. Tus derechos">
          <p>Tenés derecho a:</p>
          <ul>
            <li><strong>Acceder</strong> a los datos que tenemos sobre vos.</li>
            <li><strong>Corregir</strong> información incorrecta desde tu perfil.</li>
            <li><strong>Eliminar</strong> tu cuenta y datos personales en cualquier momento.</li>
            <li><strong>Exportar</strong> tus datos en formato legible.</li>
            <li><strong>Objetar</strong> el procesamiento de tus datos en casos justificados.</li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, enviá un correo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#D7FF00' }}>{CONTACT_EMAIL}</a>{' '}
            con el asunto "Solicitud de privacidad".
          </p>
        </LegalSection>

        <LegalSection title="8. Eliminación de cuenta">
          <p>
            Podés solicitar la eliminación de tu cuenta desde la sección de Perfil en la aplicación móvil
            (Perfil → Eliminar mi cuenta), o enviando un correo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#D7FF00' }}>{CONTACT_EMAIL}</a>.
          </p>
          <p>
            Al eliminar tu cuenta se borran: perfil, historial de reservas, retos, y datos de equipo.
            Los registros de transacciones de pago se conservan durante 7 años por obligación fiscal costarricense.
          </p>
        </LegalSection>

        <LegalSection title="9. Cookies y almacenamiento local">
          <p>
            El sitio web usa cookies estrictamente necesarias para mantener la sesión de usuario.
            No usamos cookies de rastreo ni publicidad. La aplicación móvil usa almacenamiento local
            seguro (AsyncStorage) exclusivamente para mantener tu sesión activa.
          </p>
        </LegalSection>

        <LegalSection title="10. Cambios a esta política">
          <p>
            Cualquier cambio material a esta política será notificado por correo electrónico con
            al menos 15 días de anticipación. El uso continuado de la plataforma después de la
            notificación constituye aceptación de los cambios.
          </p>
        </LegalSection>

        <LegalSection title="11. Contacto">
          <p>
            Para cualquier consulta sobre privacidad o tratamiento de datos:
          </p>
          <ul>
            <li>Correo: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#D7FF00' }}>{CONTACT_EMAIL}</a></li>
            <li>Plataforma: <a href={SITE} style={{ color: '#D7FF00' }}>{SITE}</a></li>
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
          <Link href="/terminos" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>
            Términos de Uso
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
