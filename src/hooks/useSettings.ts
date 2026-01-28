import { useState, useEffect } from 'react';
import { settingsApi } from '../api/api';
import { Settings } from '../types';

export function useSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsApi.get();
                setSettings(data);

                // Update document title and favicon
                if (data.appName) {
                    document.title = data.appName;
                }

                if (data.appLogo) {
                    const logoUrl = data.appLogo.startsWith('http')
                        ? data.appLogo
                        : `http://localhost:3001${data.appLogo}`;

                    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                    if (link) {
                        link.href = logoUrl;
                    } else {
                        const newLink = document.createElement('link');
                        newLink.rel = 'icon';
                        newLink.href = logoUrl;
                        document.getElementsByTagName('head')[0].appendChild(newLink);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const getLogoUrl = (path: string | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `http://localhost:3001${path}`;
    };

    return { settings, loading, getLogoUrl };
}
