import { Component } from 'react'

// Łapie błędy renderowania w module, żeby NIE wygaszały całej aplikacji
// (biały ekran). Pokazuje komunikat zamiast pustego ekranu i pozwala spróbować
// ponownie. Pasek nawigacji jest poza boundary, więc można przejść do innego modułu.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log do konsoli — pomocne przy diagnozie rzadkich awarii
    console.error('Błąd modułu:', error, info?.componentStack)
  }

  // Reset gdy zmieni się moduł (przełączenie aplikacji)
  componentDidUpdate(prevProps) {
    if (prevProps.moduleId !== this.props.moduleId && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', gap: 14, padding: '48px 20px', minHeight: 240,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center',
            background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 26, fontWeight: 700,
          }}>!</div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Coś się tu zacięło</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>
              Ten widok napotkał błąd. Możesz spróbować ponownie albo przejść do innej zakładki — reszta aplikacji działa.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => this.setState({ error: null })} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            }}>Spróbuj ponownie</button>
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            }}>Przeładuj</button>
          </div>
          {this.state.error?.message && (
            <code style={{
              marginTop: 6, fontSize: 11, color: 'var(--text-muted)', opacity: 0.8,
              maxWidth: 340, wordBreak: 'break-word', fontFamily: 'var(--font-mono, monospace)',
            }}>{String(this.state.error.message)}</code>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
