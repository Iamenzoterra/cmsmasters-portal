import Script from 'next/script';

export function KeyboardShortcuts(): React.ReactElement {
  return (
    <Script id="keyboard-shortcuts" strategy="afterInteractive">{`
      (function () {
        var ROUTE_MAP = { '1': '/', '2': '/phases', '3': '/components', '4': '/content', '5': '/architecture', '6': '/dependencies' };
        document.addEventListener('keydown', function (e) {
          var target = e.target;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          var route = ROUTE_MAP[e.key];
          if (route) {
            e.preventDefault();
            window.location.assign(route);
          }
        });
      })();
    `}</Script>
  );
}
