// client/src/hooks/usePWAInstall.js
import { useState, useEffect, useCallback } from 'react';

export const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(
        window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    );

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const triggerInstall = useCallback(async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsStandalone(true);
        }
        setInstallPrompt(null);
    }, [installPrompt]);
    
    return { canInstall: !!installPrompt, isStandalone, triggerInstall };
};