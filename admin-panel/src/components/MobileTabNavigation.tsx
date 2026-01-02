import React from 'react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MobileTabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  enableSwipe?: boolean;
}

const MobileTabNavigation: React.FC<MobileTabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  enableSwipe = true
}) => {
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleSwipeLeft = () => {
    if (!enableSwipe) return;
    const nextIndex = (currentTabIndex + 1) % tabs.length;
    onTabChange(tabs[nextIndex].id);
  };

  const handleSwipeRight = () => {
    if (!enableSwipe) return;
    const prevIndex = currentTabIndex === 0 ? tabs.length - 1 : currentTabIndex - 1;
    onTabChange(tabs[prevIndex].id);
  };

  // Use swipe gesture hook (we'll attach it to a parent container)
  const swipeRef = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    minSwipeDistance: 30,
    maxVerticalDistance: 50,
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
      {/* Invisible swipe area overlay for better gesture detection */}
      {enableSwipe && (
        <div
          ref={swipeRef}
          className="absolute inset-0 -top-20"
          style={{ pointerEvents: 'none' }}
        />
      )}

      <div className="flex justify-around py-2 relative z-10">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 touch-manipulation ${
              activeTab === tab.id
                ? 'text-blue-600 bg-blue-50 scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:scale-95'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div className="relative">
              <div className={`transition-transform duration-200 ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}>
                {tab.icon}
              </div>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className={`text-xs mt-1 truncate transition-all duration-200 ${
              activeTab === tab.id ? 'font-medium' : 'font-normal'
            }`}>
              {tab.label}
            </span>

            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full transition-all duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Swipe hint for first-time users */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        ← swipe →
      </div>
    </div>
  );
};

export default MobileTabNavigation;
