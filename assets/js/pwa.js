// Registro e gerenciamento do Service Worker — Portal Brasil
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Detecta nova versão disponível e notifica o usuário
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              showUpdateBanner(newWorker);
            }
          });
        });
      })
      .catch(() => {/* falha silenciosa — PWA é melhoria progressiva */});

    // Recarrega a página quando um novo SW assumir controle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });

  function showUpdateBanner(worker) {
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<span>Nova versão disponível.</span>' +
      '<button id="pwa-update-btn">Atualizar</button>' +
      '<button id="pwa-update-dismiss" aria-label="Fechar">✕</button>';

    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1E3A8A',
      color: '#fff',
      padding: '0.75rem 1.25rem',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
      zIndex: '9999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    });

    document.body.appendChild(banner);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      worker.postMessage({ action: 'skipWaiting' });
      banner.remove();
    });

    document.getElementById('pwa-update-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }
})();

// Carrega a camada de retenção local (Passo 11) em todas as páginas — isolada e fail-safe.
(function () {
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/jb-retention.js';
    s.defer = true;
    document.head.appendChild(s);
  } catch (e) {}
})();

// Carrega o módulo de notificações Web Push — isolado e fail-safe.
(function () {
  try {
    var s = document.createElement('script');
    s.src = '/assets/js/jb-push.js?v=20260629a';
    s.defer = true;
    document.head.appendChild(s);
  } catch (e) {}
})();
