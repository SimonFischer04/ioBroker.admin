import React, { Component, type JSX } from 'react';
import { type Connection, type ThemeName, type ThemeType, type IobTheme } from '@iobroker/adapter-react-v5';
import { type DeviceDetails, type DeviceInfo, type ActionBase, type ControlBase, type ControlState } from '@iobroker/dm-utils';
interface DeviceCardProps {
    title?: string;
    id: string;
    device: DeviceInfo;
    instanceId: string;
    socket: Connection;
    uploadImagesToInstance?: string;
    deviceHandler: (deviceId: string, action: ActionBase, refresh: () => void) => () => void;
    controlHandler: (deviceId: string, control: ControlBase, state: ControlState) => () => Promise<ioBroker.State | null>;
    controlStateHandler: (deviceId: string, control: ControlBase) => () => Promise<ioBroker.State | null>;
    smallCards?: boolean;
    alive: boolean;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    isFloatComma: boolean;
    dateFormat: string;
}
interface DeviceCardState {
    open: boolean;
    details: DeviceDetails | null;
    data: Record<string, any>;
    icon: string | undefined;
    showControlDialog: boolean;
}
/**
 * Device Card Component
 */
declare class DeviceCard extends Component<DeviceCardProps, DeviceCardState> {
    constructor(props: DeviceCardProps);
    fetchIcon(): Promise<void>;
    componentDidMount(): void;
    /**
     * Load the device details
     */
    loadDetails(): Promise<void>;
    /**
     * Refresh the device details
     */
    refresh: () => void;
    /**
     * Copy the device ID to the clipboard
     */
    copyToClipboard: () => void;
    renderDialog(): JSX.Element | null;
    renderControlDialog(): JSX.Element | null;
    renderControls(): JSX.Element | null;
    renderActions(): JSX.Element[] | null;
    renderSmall(): JSX.Element;
    getCardHeaderStyle(theme: IobTheme, maxWidth?: number): React.CSSProperties;
    renderBig(): JSX.Element;
    render(): JSX.Element;
}
export default DeviceCard;
