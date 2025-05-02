import { useEffect, useState } from 'react';

const DelayedRender = ({ delay = 0, children }: { delay: number; children: React.ReactNode }) => {
  const [show, setShow] = useState(delay === 0);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (show) {
    return children;
  }
  return null;
};

export default DelayedRender;
