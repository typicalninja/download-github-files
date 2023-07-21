export interface DownloaderSettings {
    token?: string;
    downloaderMode: 'autoFetch' | 'autoFetchAnDownload' | 'autoSave';
    lastDirectory: string;
    tokenSuggestion: number | null
}

export const defaultSettings: DownloaderSettings = {
    downloaderMode: 'autoFetch',
    token: '',
    lastDirectory: '',
    tokenSuggestion: null
}

export default class DownloaderSettingsManager {
    settings: DownloaderSettings;
    constructor() {
        const lsSettings = localStorage.getItem('settings');
        this.settings = lsSettings ? (JSON.parse(lsSettings) as DownloaderSettings) : this.saveSettings(defaultSettings)
    }
    saveSettings(settings: DownloaderSettings) {
        localStorage.setItem('settings', JSON.stringify(settings))
        return settings;
    }
    getSetting<T extends keyof DownloaderSettings>(settingName: T): DownloaderSettings[T] {
        return this.settings[settingName];
    }
    setSetting<T extends keyof DownloaderSettings>(settingName: T, value: DownloaderSettings[T]) {
        const newSettings = {
            ...this.settings,
            [settingName]: value
        }
        this.settings = newSettings;
        this.saveSettings(newSettings);
        return newSettings;
    }
    isSetting<T extends keyof DownloaderSettings>(settingName: T, expected: DownloaderSettings[T]): boolean {
        const setting = this.getSetting(settingName);
        if(!setting) return false;
        return setting === expected;
    }
}

export const SettingsManager = new DownloaderSettingsManager()