import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { StoreProvider } from './store';
import { TabBar } from './components/TabBar';
import { ToastBanner } from './components/ToastBanner';
import { Today } from './screens/Today';
import { Classes } from './screens/Classes';
import { ClassDetail } from './screens/ClassDetail';
import { Bookings } from './screens/Bookings';
import { CalendarScreen } from './screens/Calendar';

function Shell() {
  const { pathname } = useLocation();
  const withTabs = pathname === '/' || pathname === '/classes' || pathname === '/bookings';

  useEffect(() => {
    window.scrollTo(0, 0);
    // Black screens tint the phone's status bar black too, so the header runs to the top.
    const dark = pathname === '/' || pathname.startsWith('/class/');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111111' : '#FFFFFF');
  }, [pathname]);

  return (
    <div className={`mx-auto min-h-full w-full max-w-[430px] bg-white ${withTabs ? 'pb-24' : ''}`}>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="*" element={<Today />} />
      </Routes>
      {withTabs && <TabBar />}
      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}
