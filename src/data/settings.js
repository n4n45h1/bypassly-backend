import { meta } from '/src/utils/config';
import {
  themeConfig,
  appsPerPageConfig,
  navScaleConfig,
  searchConfig,
  prConfig,
  designConfig,
} from '/src/utils/config';

export const privacyConfig = ({ options, updateOption, openPanic, t = (k) => k }) => ({
  1: {
    name: t('st.siteTitle'),
    desc: t('st.siteTitle.d'),
    config: meta,
    value: (
      meta.find(
        (c) => c.value && typeof c.value === 'object' && c.value.tabName === options.tabName,
      ) || meta[0]
    ).value,
    type: 'select',
    action: (a) => {
      updateOption(a);
      import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
    },
  },
  2: {
    name: t('st.autoCloak'),
    desc: t('st.autoCloak.d'),
    config: meta,
    value: !!options.clkOff,
    type: 'switch',
    action: (b) => {
      setTimeout(() => {
        updateOption({ clkOff: b });
        import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
      }, 100);
    },
    disabled: !options.tabName || options.tabName == meta[0].value.tabName,
  },
  3: {
    name: t('st.aboutBlank'),
    desc: t('st.aboutBlank.d'),
    value:
      options.aboutBlankAutoOpen === true ||
      (options.aboutBlank && options.aboutBlankAutoOpen !== false),
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ aboutBlankAutoOpen: b }), 100),
  },
  4: {
    name: t('st.panicKey'),
    desc: t('st.panicKey.d'),
    value: !!options.panicToggleEnabled,
    type: 'switch',
    action: (b) => {
      setTimeout(() => {
        updateOption({ panicToggleEnabled: b });
        import('/src/utils/utils.js').then(({ panic }) => panic());
      }, 100);
    },
  },
  5: {
    name: t('st.panicShortcut'),
    desc: t('st.panicShortcut.d'),
    value: t('st.setKey'),
    type: 'button',
    action: openPanic,
    disabled: !!!options.panicToggleEnabled,
  },
});

export const customizeConfig = ({ options, updateOption, t = (k) => k }) => ({
  1: {
    name: t('st.siteTheme'),
    desc: t('st.siteTheme.d'),
    config: themeConfig,
    value: find(themeConfig, (c) => c.value?.themeName === options.themeName, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  2: {
    name: t('st.bgDesign'),
    desc: t('st.bgDesign.d'),
    config: designConfig,
    value: find(designConfig, (c) => c.value?.bgDesign === options.bgDesign, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  3: {
    name: t('st.appsPerPage'),
    desc: t('st.appsPerPage.d'),
    config: appsPerPageConfig,
    value: find(appsPerPageConfig, (c) => c.value.itemsPerPage === (options.itemsPerPage ?? 20), 2),
    type: 'select',
    action: (a) => updateOption(a),
  },
  4: {
    name: t('st.navScale'),
    desc: t('st.navScale.d'),
    config: navScaleConfig,
    value: find(navScaleConfig, (c) => c.value.navScale === (options.navScale ?? 1), 3),
    type: 'select',
    action: (a) => updateOption(a),
  },
  5: {
    name: t('st.tabsBar'),
    desc: t('st.tabsBar.d'),
    value: options.showTb ?? true,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ showTb: b }), 100),
  },
  6: {
    name: t('st.donationBtn'),
    desc: t('st.donationBtn.d'),
    value: options.donationBtn ?? true,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ donationBtn: b }), 100),
  },
});

export const browsingConfig = ({ options, updateOption, t = (k) => k }) => ({
  1: {
    name: t('st.searchEngine'),
    desc: t('st.searchEngine.d'),
    config: searchConfig,
    value: find(searchConfig, (c) => c.value?.engine === options.engine, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  2: {
    name: t('st.backendEngine'),
    desc: t('st.backendEngine.d'),
    config: prConfig,
    value: find(prConfig, (c) => c.value?.prType === options.prType, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  3: {
    name: t('st.enableHistory'),
    desc: t('st.enableHistory.d'),
    value: options.enableHistory !== false,
    type: 'switch',
    action: (b) => updateOption({ enableHistory: b }),
  },
  4: {
    name: t('st.clearHistory'),
    desc: t('st.clearHistory.d'),
    type: 'button',
    value: t('st.clearHistoryBtn'),
    action: async () => {
      const { clearHistory } = await import('/src/utils/history.js');
      const { toast } = await import('/src/utils/toast.js');
      clearHistory();
      toast.success(t('st.historyCleared'));
    },
  },
});

export const advancedConfig = ({ options, updateOption, t = (k) => k }) => ({
  1: {
    name: t('st.confirmLeave'),
    desc: t('st.confirmLeave.d'),
    value: !!options.beforeUnload,
    type: 'switch',
    action: (b) => {
      setTimeout(() => updateOption({ beforeUnload: b }));
      location.reload();
    },
  },
  2: {
    name: t('st.wispConfig'),
    desc: t('st.wispConfig.d'),
    value: options.wServer
      ? options.wServer
      : !isStaticBuild
        ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/wisp/`
        : '',
    type: 'input',
    action: (b) => updateOption({ wServer: b || null }),
  },
  3: {
    name: t('st.resetInstance'),
    desc: t('st.resetInstance.d'),
    type: 'button',
    value: t('st.resetData'),
    action: () => import('/src/utils/utils.js').then(({ resetInstance }) => resetInstance()),
  },
});

function find(config, predicate, fallbackIndex = 0) {
  const found = config.find(predicate);
  return found ? found.value : config[fallbackIndex].value; // fallback
}
