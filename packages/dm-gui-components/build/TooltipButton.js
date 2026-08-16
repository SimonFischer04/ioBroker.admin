import React from 'react';
import { IconButton, Tooltip, Typography } from '@mui/material';
export default function TooltipButton(props) {
    const { tooltip, label, disabled, Icon, onClick } = props;
    const text = !!label && (React.createElement(Typography, { variant: "button", style: { marginLeft: 4 } }, label));
    if (tooltip) {
        return (React.createElement(Tooltip, { title: tooltip, slotProps: { popper: { sx: { pointerEvents: 'none' } } } },
            React.createElement("span", null,
                React.createElement(IconButton, { onClick: onClick, disabled: disabled, size: "small" },
                    Icon,
                    text))));
    }
    return (React.createElement(IconButton, { onClick: onClick, disabled: disabled, size: "small" },
        Icon,
        text));
}
//# sourceMappingURL=TooltipButton.js.map