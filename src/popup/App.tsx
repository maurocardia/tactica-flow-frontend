import React, { useEffect, useState } from 'react';

export default function App() {
    const [status, setStatus] = useState<string>('Verificando...');
    const [isConnected, setIsConnected] = useState<boolean>(false);

    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];

                if (activeTab?.id && activeTab.url?.includes('web.whatsapp.com')) {
                    // Asumimos conexión por estar en WhatsApp Web y confirmamos con el content script
                    setIsConnected(true);
                    setStatus('Conectado');

                    chrome.tabs.sendMessage(
                        activeTab.id,
                        { type: 'CHECK_STATUS' },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                // Si el content script no responde pero la pestaña es WhatsApp Web
                                setStatus('Conectado (Cargando sidebar...)');
                            } else if (response?.status) {
                                setStatus(response.status);
                            }
                        }
                    );
                } else {
                    setIsConnected(false);
                    setStatus('Abre WhatsApp Web');
                }
            });
        }
    }, []);

    return (
        <div
            style={{
                width: '240px',
                padding: '16px',
                backgroundColor: 'rgb(158, 17, 20)',
                color: '#ffffff',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '8px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>{isConnected ? '📡' : '🔌'}</span>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Táctica Flow</h2>
            </div>

            <div
                style={{
                    backgroundColor: isConnected ? 'rgba(158, 17, 20, 0.15)' : 'rgba(158, 17, 20, 0.05)',
                    border: `1px solid ${isConnected ? 'rgba(158, 17, 20, 0.3)' : 'rgba(158, 17, 20, 0.2)'}`,
                    color: '#ffffff',
                }}
            >
                <span>Estado: <strong>{status}</strong></span>
            </div>
        </div>
    );
}