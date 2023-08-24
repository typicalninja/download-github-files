import { SettingsManager } from "./Settings";

declare const umami: { track: (f?:string, data?: unknown) => void };


export const sendEvent = (event: string, data: unknown) => {
    const analytics = SettingsManager.getSetting('analytics');
    if(analytics === false) return console.log(`[Analytics]: Tracking is disabled via settings`);
    console.log(`[Analytics]: sending event ${event} with ${JSON.stringify(data)}`)
    return umami.track(event, data)
}

export const pageView = () => {
    const analytics = SettingsManager.getSetting('analytics');
    if(analytics === false) return console.log(`[Analytics]: PageView Tracking is disabled via settings`);
    return umami.track();
}