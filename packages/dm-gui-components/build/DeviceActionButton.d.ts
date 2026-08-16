import React from 'react';
import type { ActionBase, DeviceAction } from '@iobroker/dm-utils';
interface DeviceActionButtonProps {
    deviceId: string;
    action: DeviceAction;
    refresh: () => void;
    deviceHandler: (deviceId: string, action: ActionBase, refresh: () => void) => () => void;
    disabled?: boolean;
}
export default function DeviceActionButton(props: DeviceActionButtonProps): React.JSX.Element;
export {};
