/* global React, ReactDOM */
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
const Component = isMobile ? window.MobileApp : window.DesktopApp;
ReactDOM.createRoot(document.getElementById('root')).render(<Component />);
