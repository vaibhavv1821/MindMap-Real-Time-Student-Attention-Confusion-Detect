import React, { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MindMap ErrorBoundary caught exception]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleNavigateDashboard = () => {
    window.location.href = '/student/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="relative w-full max-w-lg rounded-2xl border border-red-900/40 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-2xl font-bold">
                ⚠️
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Classroom Session Issue</h2>
                <p className="text-xs text-slate-400">
                  An unexpected error occurred while rendering the classroom interface.
                </p>
              </div>
            </div>

            <div className="my-5 rounded-lg bg-slate-950 p-4 border border-slate-800 text-xs font-mono text-red-300 overflow-x-auto max-h-40">
              <p className="font-semibold">{this.state.error?.name}: {this.state.error?.message || 'Unknown runtime error'}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 text-[10px] text-slate-500 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.trim().slice(0, 400)}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
              >
                Retry Classroom
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Reload Window
              </button>
              <button
                onClick={this.handleNavigateDashboard}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
