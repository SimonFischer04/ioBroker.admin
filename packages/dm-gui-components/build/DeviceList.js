import React from 'react';
import { IconButton, InputAdornment, TextField, Toolbar, Tooltip, LinearProgress, Select, MenuItem, } from '@mui/material';
import { Clear, QuestionMark, Refresh, FilterAltOff } from '@mui/icons-material';
import { I18n, DeviceTypeIcon } from '@iobroker/adapter-react-v5';
import DeviceCard from './DeviceCard';
import { getTranslation } from './Utils';
import Communication from './Communication';
import InstanceActionButton from './InstanceActionButton';
import de from './i18n/de.json';
import en from './i18n/en.json';
import ru from './i18n/ru.json';
import pt from './i18n/pt.json';
import nl from './i18n/nl.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';
import es from './i18n/es.json';
import pl from './i18n/pl.json';
import uk from './i18n/uk.json';
import zhCn from './i18n/zh-cn.json';
/**
 * Device List Component
 */
export default class DeviceList extends Communication {
    static i18nInitialized = false;
    lastPropsFilter;
    lastInstance;
    lastTriggerLoad = 0;
    filterTimeout;
    language;
    constructor(props) {
        super(props);
        if (!DeviceList.i18nInitialized) {
            DeviceList.i18nInitialized = true;
            I18n.extendTranslations({
                en,
                de,
                ru,
                pt,
                nl,
                fr,
                it,
                es,
                pl,
                uk,
                'zh-cn': zhCn,
            });
        }
        Object.assign(this.state, {
            devices: [],
            filteredDevices: [],
            filter: '',
            instanceInfo: null,
            loading: null,
            alive: null,
            groupKey: '',
        });
        this.lastPropsFilter = this.props.filter;
        this.lastInstance = this.props.selectedInstance;
        this.lastTriggerLoad = this.props.triggerLoad || 0;
        this.filterTimeout = null;
        this.language = I18n.getLanguage();
    }
    async componentDidMount() {
        let alive = false;
        if (this.state.alive === null) {
            try {
                // check if instance is alive
                const stateAlive = await this.props.socket.getState(`system.adapter.${this.props.selectedInstance}.alive`);
                if (stateAlive?.val) {
                    alive = true;
                }
            }
            catch (error) {
                console.error(error);
            }
            this.setState({ alive }, () => this.props.socket.subscribeState(`system.adapter.${this.props.selectedInstance}.alive`, this.aliveHandler));
            if (!alive) {
                return;
            }
        }
        else {
            alive = this.state.alive;
        }
        if (!this.props.embedded && alive) {
            try {
                const instanceInfo = await this.loadInstanceInfos();
                this.setState({ instanceInfo });
            }
            catch (error) {
                console.error(error);
            }
        }
        if (alive) {
            this.loadData();
        }
    }
    componentWillUnmount() {
        this.props.socket.unsubscribeState(`system.adapter.${this.props.selectedInstance}.alive`, this.aliveHandler);
    }
    aliveHandler = (id, state) => {
        if (id === `system.adapter.${this.props.selectedInstance}.alive`) {
            const alive = !!state?.val;
            if (alive !== this.state.alive) {
                this.setState({ alive }, () => {
                    if (alive) {
                        this.componentDidMount().catch(console.error);
                    }
                });
            }
        }
    };
    /**
     * Load devices
     */
    loadData() {
        this.setState({ loading: true }, async () => {
            console.log(`Loading devices for ${this.props.selectedInstance}...`);
            let devices = [];
            try {
                devices = await this.loadDevices();
                if (!devices || !Array.isArray(devices)) {
                    console.error(`Message returned from sendTo() doesn't look like one from DeviceManagement, did you accidentally handle the message in your adapter? ${JSON.stringify(devices)}`);
                    devices = [];
                }
            }
            catch (error) {
                console.error(error);
                devices = [];
            }
            this.setState({ devices, loading: false }, () => this.applyFilter());
        });
    }
    getText(text) {
        if (typeof text === 'object') {
            return text[this.language] || text.en;
        }
        return text;
    }
    applyFilter() {
        const filter = this.props.embedded ? this.props.filter : this.state.filter;
        // filter devices name
        if (filter) {
            const filteredDevices = this.state.devices.filter(device => this.getText(device.name).toLowerCase().includes(filter.toLowerCase()));
            this.setState({ filteredDevices });
        }
        else {
            this.setState({ filteredDevices: this.state.devices });
        }
    }
    handleFilterChange(filter) {
        this.setState({ filter }, () => {
            if (this.filterTimeout) {
                clearTimeout(this.filterTimeout);
            }
            this.filterTimeout = setTimeout(() => {
                this.filterTimeout = null;
                this.applyFilter();
            }, 250);
        });
    }
    renderGroups(groups) {
        if (!groups?.length) {
            return null;
        }
        return (React.createElement(Select, { style: { minWidth: 120, marginRight: 8, marginTop: 12.5 }, variant: "standard", value: this.state.groupKey || '_', renderValue: value => {
                if (value === '_') {
                    value = '';
                }
                const g = groups.find(g => g.value === value);
                return (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    g?.icon || React.createElement("div", { style: { width: 24 } }),
                    g?.name || value));
            }, onChange: e => this.setState({ groupKey: e.target.value === '_' ? '' : e.target.value }) }, groups.map(g => (React.createElement(MenuItem, { value: g.value || '_', key: g.value || '_', style: { display: 'flex', alignItems: 'center', gap: 8 } },
            g.icon || React.createElement("div", { style: { width: 24 } }),
            g.name)))));
    }
    renderContent() {
        const emptyStyle = {
            padding: 25,
        };
        if ((this.props.triggerLoad || 0) !== this.lastTriggerLoad) {
            this.lastTriggerLoad = this.props.triggerLoad || 0;
            setTimeout(() => this.loadData(), 50);
        }
        if (this.props.embedded && this.lastPropsFilter !== this.props.filter) {
            this.lastPropsFilter = this.props.filter;
            setTimeout(() => this.applyFilter(), 50);
        }
        // if instance changed
        if (this.props.embedded && this.lastInstance !== this.props.selectedInstance) {
            this.lastInstance = this.props.selectedInstance;
            setTimeout(() => this.loadData(), 50);
        }
        const deviceGroups = [];
        let list;
        if (!this.props.embedded && !this.state.alive) {
            list = [
                React.createElement("div", { style: emptyStyle, key: "notAlive" },
                    React.createElement("span", null, getTranslation('instanceNotAlive'))),
            ];
        }
        else if (!this.state.devices.length && this.props.selectedInstance) {
            list = [
                React.createElement("div", { style: emptyStyle, key: "notFound" },
                    React.createElement("span", null, getTranslation('noDevicesFoundText'))),
            ];
        }
        else if (this.state.devices.length && !this.state.filteredDevices.length) {
            list = [
                React.createElement("div", { style: emptyStyle, key: "filtered" },
                    React.createElement("span", null, getTranslation('allDevicesFilteredOut'))),
            ];
        }
        else {
            // build a device types list
            let filteredDevices = this.state.filteredDevices;
            if (!this.props.embedded && filteredDevices.find(device => device.group)) {
                deviceGroups.push({
                    name: I18n.t('All'),
                    value: '',
                    count: filteredDevices.length,
                    icon: React.createElement(FilterAltOff, null),
                });
                filteredDevices.forEach(device => {
                    if (device.group) {
                        const type = deviceGroups.find(t => t.value === device.group?.key);
                        if (type) {
                            type.count++;
                        }
                        else {
                            const icon = device.group.icon ? React.createElement(DeviceTypeIcon, { src: device.group.icon }) : null;
                            deviceGroups.push({
                                name: this.getText(device.group.name || device.group.key),
                                value: device.group.key,
                                count: 1,
                                icon,
                            });
                        }
                    }
                });
                const unknown = filteredDevices.filter(device => !device.group);
                if (unknown.length) {
                    deviceGroups.push({
                        name: I18n.t('Unknown'),
                        value: '?',
                        count: unknown.length,
                        icon: React.createElement(QuestionMark, null),
                    });
                }
                if (this.state.groupKey) {
                    // filter out all devices belonging to this group
                    if (this.state.groupKey === '?') {
                        filteredDevices = filteredDevices.filter(device => !device.group?.key);
                    }
                    else {
                        filteredDevices = filteredDevices.filter(device => device.group?.key === this.state.groupKey);
                    }
                    if (!filteredDevices.length) {
                        list = [
                            React.createElement("div", { style: emptyStyle, key: "filtered" },
                                React.createElement("span", null, getTranslation('allDevicesFilteredOut'))),
                        ];
                    }
                }
            }
            if (filteredDevices.length) {
                list = filteredDevices.map(device => (React.createElement(DeviceCard, { alive: !!this.state.alive, key: device.id, id: device.id, title: this.getText(device.name), device: device, instanceId: this.props.selectedInstance, uploadImagesToInstance: this.props.uploadImagesToInstance, deviceHandler: this.deviceHandler, controlHandler: this.controlHandler, controlStateHandler: this.controlStateHandler, socket: this.props.socket, themeName: this.props.themeName, themeType: this.props.themeType, theme: this.props.theme, isFloatComma: this.props.isFloatComma, dateFormat: this.props.dateFormat })));
            }
        }
        if (this.props.embedded) {
            return (React.createElement(React.Fragment, null,
                this.state.loading ? React.createElement(LinearProgress, { style: { width: '100%' } }) : null,
                list));
        }
        return (React.createElement("div", { style: { width: '100%', height: '100%', overflow: 'hidden' } },
            React.createElement(Toolbar, { variant: "dense", style: { backgroundColor: '#777', display: 'flex' } },
                this.props.title,
                this.props.selectedInstance ? (React.createElement(Tooltip, { title: getTranslation('refreshTooltip'), slotProps: { popper: { sx: { pointerEvents: 'none' } } } },
                    React.createElement("span", null,
                        React.createElement(IconButton, { onClick: () => this.loadData(), disabled: !this.state.alive, size: "small" },
                            React.createElement(Refresh, null))))) : null,
                this.state.alive && this.state.instanceInfo?.actions?.length ? (React.createElement("div", { style: { marginLeft: 20 } }, this.state.instanceInfo.actions.map(action => (React.createElement(InstanceActionButton, { key: action.id, action: action, instanceHandler: this.instanceHandler }))))) : null,
                React.createElement("div", { style: { flexGrow: 1 } }),
                this.renderGroups(deviceGroups),
                this.state.alive ? (React.createElement(TextField, { variant: "standard", style: { width: 200 }, size: "small", label: getTranslation('filterLabelText'), onChange: e => this.handleFilterChange(e.target.value), value: this.state.filter, autoComplete: "off", slotProps: {
                        input: {
                            autoComplete: 'new-password',
                            endAdornment: this.state.filter ? (React.createElement(InputAdornment, { position: "end" },
                                React.createElement(IconButton, { tabIndex: -1, onClick: () => this.handleFilterChange(''), edge: "end" },
                                    React.createElement(Clear, null)))) : null,
                        },
                        htmlInput: {
                            autoComplete: 'off',
                        },
                    } })) : null),
            React.createElement("div", { style: {
                    width: '100%',
                    height: 'calc(100% - 56px)',
                    marginTop: 8,
                    overflow: 'auto',
                    // justifyContent: 'center',
                    // alignItems: 'stretch',
                    // display: 'grid',
                    // columnGap: 8,
                    // rowGap: 8,
                    ...this.props.style,
                } },
                this.state.loading ? React.createElement(LinearProgress, { style: { width: '100%' } }) : null,
                list)));
    }
}
//# sourceMappingURL=DeviceList.js.map