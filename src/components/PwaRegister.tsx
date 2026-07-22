'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !visible || !deferred) return null;

  return (
    <div className="pwa-install-banner">
      <div>
        <strong>Install The Brewing Cottage</strong>
        <span>Add to your phone or computer for quick access</span>
      </div>
      <div className="pwa-install-actions">
        <button className="btn" type="button" onClick={() => setVisible(false)}>
          Not now
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={async () => {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === 'accepted') setVisible(false);
            setDeferred(null);
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
