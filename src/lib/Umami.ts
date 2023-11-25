import { SettingsManager } from "./Settings";

declare const umami: { track: (f?:string, data?: unknown) => void };


export const sendEvent = (event: string, data: unknown) => {
    if(typeof umami === 'undefined') return;
    const analytics = SettingsManager.getSetting('analytics');
    if(analytics === false) return console.log(`[Analytics]: Event Tracking is disabled via settings (EVENT: ${event})`);
    console.log(`[Analytics]: sending event ${event} with ${JSON.stringify(data)}`)
    return umami.track(event, data)
}

export const pageView = () => {
    if(typeof umami === 'undefined') return;
    const analytics = SettingsManager.getSetting('analytics');
    if(analytics === false) return console.log(`[Analytics]: PageView Tracking is disabled via settings`);
    return umami.track();
}