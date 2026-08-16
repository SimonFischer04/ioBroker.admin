import React, { Component } from 'react';
import { type Connection, type ThemeName, type ThemeType, type IobTheme } from '@iobroker/adapter-react-v5';
import type { ActionBase, ControlBase, ControlState, DeviceInfo, InstanceDetails, JsonFormSchema, ActionButton } from '@iobroker/dm-utils';
declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        grey: true;
    }
}
export type CommunicationProps = {
    /** Socket connection */
    socket: Connection;
    /** Instance to communicate with device-manager backend, like `adapterName.X` */
    selectedInstance: string;
    registerHandler?: (handler: null | ((command: string) => void)) => void;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    isFloatComma: boolean;
    dateFormat: string;
};
interface CommunicationForm {
    title?: ioBroker.StringOrTranslated | null | undefined;
    label?: ioBroker.StringOrTranslated | null | undefined;
    noTranslation?: boolean;
    schema: JsonFormSchema;
    data?: Record<string, any>;
    buttons?: (ActionButton | 'apply' | 'cancel' | 'close')[];
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Minimal width of the dialog */
    minWidth?: number;
}
interface CommunicationFormInState extends CommunicationForm {
    handleClose?: (data?: Record<string, any>) => void;
    originalData: string;
    changed: boolean;
}
interface InputAction extends ActionBase {
    /** If it is a device action */
    deviceId?: string;
    /** Optional refresh function to execute */
    refresh?: () => void;
}
export type CommunicationState = {
    showSpinner: boolean;
    showToast: string | null;
    message: {
        message: string;
        handleClose: () => void;
    } | null;
    confirm: {
        message: string;
        handleClose: (confirmation?: boolean) => void;
    } | null;
    form: CommunicationFormInState | null;
    progress: {
        open: boolean;
        progress: number;
    } | null;
    showConfirmation: InputAction | null;
    showInput: InputAction | null;
    inputValue: string | boolean | number | null;
};
interface Message {
    actionId?: string;
    deviceId?: string;
    value?: unknown;
    origin?: string;
    confirm?: boolean;
    data?: any;
    /** Inform backend, how long the frontend will wait for an answer */
    timeout?: number;
}
/**
 * Device List Component
 */
declare class Communication<P extends CommunicationProps, S extends CommunicationState> extends Component<P, S> {
    private responseTimeout;
    instanceHandler: (action: ActionBase) => () => void;
    deviceHandler: (deviceId: string, action: ActionBase, refresh: () => void) => () => void;
    controlHandler: (deviceId: string, control: ControlBase, state: ControlState) => () => Promise<ioBroker.State | null>;
    controlStateHandler: (deviceId: string, control: ControlBase) => () => Promise<ioBroker.State | null>;
    constructor(props: P);
    componentWillUnmount(): void;
    loadData(): void;
    sendActionToInstance: (command: `dm:${string}`, messageToSend: Message, refresh?: () => void) => void;
    sendControlToInstance: (command: string, messageToSend: {
        deviceId: string;
        controlId: string;
        state?: ControlState;
    }) => Promise<null | ioBroker.State>;
    loadDevices(): Promise<DeviceInfo[]>;
    loadInstanceInfos(): Promise<InstanceDetails>;
    renderMessageDialog(): React.JSX.Element | null;
    renderConfirmDialog(): React.JSX.Element | null;
    renderSnackbar(): React.JSX.Element;
    getOkButton(button?: ActionButton | 'apply' | 'cancel' | 'close'): React.JSX.Element;
    getCancelButton(button?: ActionButton | 'apply' | 'cancel' | 'close'): React.JSX.Element;
    renderFormDialog(): React.JSX.Element | null;
    renderProgressDialog(): React.JSX.Element | null;
    renderContent(): React.JSX.Element | React.JSX.Element[] | null;
    renderSpinner(): React.JSX.Element | null;
    renderConfirmationDialog(): React.JSX.Element | null;
    onShowInputOk(): void;
    renderInputDialog(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export default Communication;
