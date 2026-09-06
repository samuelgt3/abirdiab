export default function SectionDivider() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 20px' }}>
      <svg width="90" height="30" viewBox="0 0 90 30" fill="none">
        <path d="M2 15C25 5 65 5 88 15" stroke="#123F35" strokeWidth="1" />
        <circle cx="30" cy="10" r="4" fill="none" stroke="#C1922F" strokeWidth="1" />
        <circle cx="60" cy="10" r="4" fill="none" stroke="#123F35" strokeWidth="1" />
      </svg>
    </div>
  );
}
