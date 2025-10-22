/// <reference types="vite/client" />
declare global {
    interface Window {
        chatClapper_GM_getValue?: typeof GM_getValue;
        chatClapper_GM_setValue?: typeof GM_setValue;
        chatClapper_isGmReady?: boolean;
        // Add the new function signature
        chatClapper_getRecentMessages?: (limit?: number) => Promise<any[]>;
        unsafeWindow: Window & {
            [key: string]: any;
        };
    }
}
export {};