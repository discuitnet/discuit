import clsx from 'clsx';
import { useEffect, useState } from 'react';

export interface FadeInOutProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  display: boolean;
  keepMounted?: boolean;
  visibleStyle: React.CSSProperties;
  hiddenStyle: React.CSSProperties;
  transitionTime?: number;
}

export function MountTransition({
  className,
  children,
  display = false,
  keepMounted = false,
  visibleStyle = {},
  hiddenStyle = {},
  transitionTime = 175,
  style,
  ...props
}: FadeInOutProps) {
  const renderDelay = 20;

  const [visible, setVisible] = useState(false);
  const [usingInStyle, setUsingInStlye] = useState(false);
  useEffect(() => {
    let timer;
    if (display) {
      timer = setTimeout(() => {
        setUsingInStlye(true);
        setVisible(true);
      }, renderDelay);
    } else {
      setUsingInStlye(false);
      timer = setTimeout(() => setVisible(false), transitionTime + renderDelay);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [display]);

  if (!keepMounted && !visible && !display) {
    return null;
  }

  let _style = {
    ...style,
    transition: `all ${transitionTime}ms`,
  };

  if (usingInStyle) {
    _style = {
      ...visibleStyle,
      ..._style,
    };
  } else {
    _style = {
      ...hiddenStyle,
      ..._style,
    };
  }

  return (
    <div className={clsx('fade-in-and-out', className)} style={_style} {...props}>
      {children}
    </div>
  );
}

export interface FadeInAndOutProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  display: boolean;
}

export function FadeInAndOut({
  className,
  children,
  display = false,
  ...props
}: FadeInAndOutProps) {
  return (
    <MountTransition
      className={className}
      display={display}
      visibleStyle={{ opacity: '1' }}
      hiddenStyle={{ opacity: '0' }}
      {...props}
    >
      {children}
    </MountTransition>
  );
}
