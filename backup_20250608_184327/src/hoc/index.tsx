import React, { ComponentType, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';
import { LoadingSkeleton } from '@/components/shared';

// WithAuth HOC - Protects routes based on authentication
interface WithAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
  loading?: React.ReactNode;
}

export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { roles = [], redirectTo = '/', loading = <LoadingSkeleton /> } = options;

  return function WithAuthComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    React.useEffect(() => {
      if (status === 'loading') return;

      if (!session?.user) {
        router.push(redirectTo);
        return;
      }

      if (roles.length > 0 && !roles.includes(session.user.role as UserRole)) {
        router.push('/unauthorized');
      }
    }, [session, status, router]);

    if (status === 'loading') {
      return <>{loading}</>;
    }

    if (!session?.user) {
      return null;
    }

    if (roles.length > 0 && !roles.includes(session.user.role as UserRole)) {
      return null;
    }

    return <Component {...props} />;
  };
}

// WithLoading HOC - Adds loading state handling
interface WithLoadingProps {
  loading?: boolean;
  error?: Error | null;
}

export function withLoading<P extends object>(
  Component: ComponentType<P>,
  LoadingComponent: React.ReactNode = <LoadingSkeleton />
) {
  return function WithLoadingComponent(props: P & WithLoadingProps) {
    const { loading, error, ...restProps } = props;

    if (loading) {
      return <>{LoadingComponent}</>;
    }

    if (error) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400">Error: {error.message}</p>
        </div>
      );
    }

    return <Component {...(restProps as P)} />;
  };
}

// WithErrorBoundary HOC - Adds error boundary to components
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className="min-h-[200px] flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-600 dark:text-red-300 text-sm mb-4">
        {error.message}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  </div>
);

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  ErrorFallback: ComponentType<ErrorFallbackProps> = DefaultErrorFallback
) {
  return class WithErrorBoundaryComponent extends React.Component<
    P,
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    resetError = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError && this.state.error) {
        return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
      }

      return <Component {...this.props} />;
    }
  };
}

// WithSuspense HOC - Adds suspense boundary
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <LoadingSkeleton />
) {
  return function WithSuspenseComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// WithMemo HOC - Adds memoization
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(Component, propsAreEqual);
}

// Compose HOCs
export function compose<P extends object>(
  ...hocs: Array<(component: ComponentType<any>) => ComponentType<any>>
) {
  return function (Component: ComponentType<P>) {
    return hocs.reduceRight((acc, hoc) => hoc(acc), Component);
  };
}

// Example usage:
// const EnhancedComponent = compose(
//   withAuth({ roles: [UserRole.DENTIST] }),
//   withErrorBoundary,
//   withLoading,
//   withMemo
// )(MyComponent);