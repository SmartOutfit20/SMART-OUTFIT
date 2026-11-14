import React from 'react'
import { Link } from 'react-router-dom'

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error, info) {
    console.error('SMART OUTFIT route render error:', error, info)
  }
  render() {
    if (this.state.failed) {
      return <section className="route-error-panel" role="alert">
        <div>
          <span className="eyebrow">SMART OUTFIT</span>
          <h2>এই পেজটি লোড করা যায়নি</h2>
          <p>অন্য পেজে যেতে পারেন, অথবা আবার চেষ্টা করুন। আপনার অর্ডার বা অ্যাকাউন্টের তথ্য এতে মুছে যাবে না।</p>
          <div className="route-error-actions">
            <button type="button" onClick={() => this.setState({ failed: false })}>আবার চেষ্টা করুন</button>
            <Link to="/">হোম পেজে ফিরুন</Link>
          </div>
        </div>
      </section>
    }
    return this.props.children
  }
}
