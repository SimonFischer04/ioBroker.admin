import React from 'react';
import type { ControlBase } from '@iobroker/dm-utils/build/types/base';
import type { ActionBase } from '@iobroker/dm-utils/build/types/api';
export declare function renderControlIcon(action: ControlBase, colors?: {
    primary: string;
    secondary: string;
}, value?: string | number | boolean | null): React.JSX.Element | null;
export declare function renderActionIcon(action: ActionBase): React.JSX.Element | null;
/**
 * Get Translation
 */
export declare function getTranslation(
/** Text to translate */
text: ioBroker.StringOrTranslated, noTranslation?: boolean): string;
