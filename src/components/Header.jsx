// src/components/Header.jsx
export default function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#fff',
        borderBottom: '1px solid #eee'
      }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start', // all content flows to the right
          gap: 24
        }}
      >
        {/* Logo */}
        <a href="/" aria-label="Rollupim" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo-rollupim.svg"
            alt="ROLLUPIM"
            height="36"
            style={{ height: 72, width: 'auto', display: 'block' }}
            onError={(e) => {
              e.currentTarget.src = '/favicon.ico';
            }}
          />
        </a>

        {/* Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#products">מחירים</a>
          <a href="#faq">שאלות</a>
          <a href="#how">איך זה עובד</a>
          <a
            href="#products"
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            ביצוע הזמנה
          </a>
        </nav>
      </div>
    </header>
  );
}