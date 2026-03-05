import { create } from 'zustand';

const TABS_KEY = 'bypassly_tabs';

const defaultTab = () => ({
  title: 'New Tab',
  id: crypto.randomUUID(),
  url: 'tabs://new',
  active: true,
  history: ['tabs://new'],
  historyIndex: 0,
  isLoading: false,
});

const loadPersistedTabs = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(TABS_KEY) || 'null');
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored.map((t) => ({ ...t, isLoading: false }));
    }
  } catch {}
  return null;
};

const store = create((set) => ({
  tabs: loadPersistedTabs() ?? [defaultTab()],
  frameRefs: null,
  showTabs: false,
  showMenu: false,
  iframeUrls: {},
  activeFrameRef: null,
  showUI: true,
  showFind: false,
  showCss: false,
  showTranslate: false,
  zoomLevels: {},
  //only used if isStaticBuild == true
  wispStatus: null,
  setWispStatus: (bool) => set({ wispStatus: bool }),
  toggleUI: () => set((state) => ({ showUI: !state.showUI })),
  toggleFind: () => set((state) => ({ showFind: !state.showFind })),
  toggleCss: () => set((state) => ({ showCss: !state.showCss })),
  toggleTranslate: () => set((state) => ({ showTranslate: !state.showTranslate })),
  setZoom: (tabId, zoom, frameRef) => {
    const ifr = frameRef?.current;
    if (ifr) {
      ifr.style.transform = `scale(${zoom / 100})`;
      ifr.style.transformOrigin = 'top left';
      ifr.style.width = `${100 / (zoom / 100)}%`;
      ifr.style.height = `${100 / (zoom / 100)}%`;
    }
    set((state) => ({
      zoomLevels: { ...state.zoomLevels, [tabId]: zoom },
    }));
  },
  resetZoom: (tabId, frameRef) => {
    const ifr = frameRef?.current;
    if (ifr) {
      ifr.style.transform = '';
      ifr.style.width = '';
      ifr.style.height = '';
    }
    set((state) => ({
      zoomLevels: { ...state.zoomLevels, [tabId]: 100 },
    }));
  },
  setShowTabs: (value) => set({ showTabs: value }),
  toggleTabs: () => set((state) => ({ showTabs: !state.showTabs })),
  toggleMenu: () => set((state) => ({ showMenu: !state.showMenu })),
  setFrameRefs: (refs) => set({ frameRefs: refs }),
  addTab: (tab) =>
    set((state) => ({
      tabs: [
        ...state.tabs,
        {
          ...tab,
          history: [tab.url || 'tabs://new'],
          historyIndex: 0,
          isLoading: false,
        },
      ],
    })),
  removeTab: (tabId) => set((state) => ({ tabs: state.tabs.filter(({ id }) => id != tabId) })),
  setActive: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => ({ ...tab, active: tab.id === tabId })),
    })),
  //this makes the tab BEFORE The matching tab active (all others false)
  setLastActive: (tabId) =>
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      const prevIndex = index > 0 ? index - 1 : index + 1;

      return {
        tabs: state.tabs.map((tab, i) => ({ ...tab, active: i === prevIndex })),
      };
    }),
  //this updates url property of matching tab and merges
  updateUrl: (tabId, url, addToHistory = true) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        
        if (!url || (typeof url === 'string' && url.trim() === '')) {
          return tab;
        }

        if (addToHistory) {
          //FORWARD history gets removed -- & add new url
          const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), url];
          return {
            ...tab,
            url,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: url !== 'tabs://new',
          };
        }
        return { ...tab, url, isLoading: url !== 'tabs://new' };
      }),
    })),
  updateTitle: (tabId, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, title } : tab)),
    })),
  setLoading: (tabId, isLoading) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isLoading } : tab)),
    })),
  refreshTab: (tabId) => {
    const state = store.getState();
    const iframe = state.frameRefs?.current?.[tabId];
    if (iframe?.contentWindow) {
      iframe.contentWindow.location.reload();
    }
  },
  goBack: (tabId, onNewTab) => {
    set((state) => {
      const updatedTbs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.historyIndex <= 0) return tab;

        const newIndex = tab.historyIndex - 1;
        const newUrl = tab.history[newIndex];

        if (newUrl === 'tabs://new' && onNewTab) {
          onNewTab();
        }

        return {
          ...tab,
          url: newUrl,
          historyIndex: newIndex,
          isLoading: true,
        };
      });

      const tab = updatedTbs.find((t) => t.id === tabId);
      const newIframeUrls = tab ? { ...state.iframeUrls, [tabId]: tab.url } : state.iframeUrls;

      return { tabs: updatedTbs, iframeUrls: newIframeUrls };
    });
  },
  goForward: (tabId) => {
    set((state) => {
      const updatedTbs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.historyIndex >= tab.history.length - 1) return tab;

        const newIndex = tab.historyIndex + 1;
        return {
          ...tab,
          url: tab.history[newIndex],
          historyIndex: newIndex,
          isLoading: true,
        };
      });

      const tab = updatedTbs.find((t) => t.id === tabId);
      const newIframeUrls = tab ? { ...state.iframeUrls, [tabId]: tab.url } : state.iframeUrls;

      return { tabs: updatedTbs, iframeUrls: newIframeUrls };
    });
  },
  setIframeUrl: (tabId, url) =>
    set((state) => ({
      iframeUrls: {
        ...state.iframeUrls,
        [tabId]: url,
      },
    })),
  updateActiveFrameRef: (ref) => set({ activeFrameRef: ref }),
  clearStore: ({ showTb }) =>
    set(() => ({
      tabs: [defaultTab()],
      frameRefs: null,
      showTabs: showTb,
      iframeUrls: {},
    })),
}));

// Persist tabs to sessionStorage on every change
store.subscribe((state) => {
  try {
    sessionStorage.setItem(TABS_KEY, JSON.stringify(state.tabs));
  } catch {}
});

export default store;
