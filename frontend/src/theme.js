import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#059669',
            dark: '#047857',
            light: '#10B981',
            contrastText: '#fff',
        },
        secondary: {
            main: '#6366F1',
            dark: '#4F46E5',
            light: '#818CF8',
            contrastText: '#fff',
        },
        error: {
            main: '#F43F5E',
            light: '#FFF1F2',
        },
        warning: {
            main: '#F59E0B',
            light: '#FFFBEB',
        },
        success: {
            main: '#059669',
            light: '#ECFDF5',
        },
        info: {
            main: '#3B82F6',
            light: '#EFF6FF',
        },
        background: {
            default: '#F7FAF8',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1E293B',
            secondary: '#475569',
            disabled: '#94A3B8',
        },
        divider: '#E2E8F0',
    },
    typography: {
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontWeight: 800, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.015em' },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600, fontSize: '0.92rem' },
        subtitle2: { fontWeight: 600, fontSize: '0.82rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' },
        body1: { fontSize: '0.9rem', lineHeight: 1.6 },
        body2: { fontSize: '0.82rem', lineHeight: 1.5 },
        caption: { fontSize: '0.72rem', color: '#94A3B8' },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: '-0.01em' },
    },
    shape: {
        borderRadius: 10,
    },
    shadows: [
        'none',
        '0 1px 2px rgba(0,0,0,0.04)',
        '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        '0 8px 24px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.03)',
        '0 12px 32px rgba(0,0,0,0.08)',
        ...Array(19).fill('0 12px 32px rgba(0,0,0,0.08)'),
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 20px',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    boxShadow: '0 4px 14px rgba(5,150,105,0.2)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                        boxShadow: '0 6px 20px rgba(5,150,105,0.3)',
                        transform: 'translateY(-1px)',
                    },
                },
                outlined: {
                    borderColor: '#E2E8F0',
                    color: '#475569',
                    '&:hover': {
                        borderColor: '#CBD5E1',
                        background: '#F7FAF8',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
                    '&:hover': {
                        borderColor: '#CBD5E1',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    },
                    transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    height: 24,
                    borderRadius: 6,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    background: '#1E293B',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    borderRadius: 6,
                    padding: '6px 12px',
                },
                arrow: {
                    color: '#1E293B',
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                    fontSize: '0.84rem',
                },
                standardError: {
                    background: '#FFF1F2',
                    border: '1px solid #FECDD3',
                    color: '#F43F5E',
                },
                standardSuccess: {
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#059669',
                },
                standardWarning: {
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                },
                standardInfo: {
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#3B82F6',
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    height: 6,
                    backgroundColor: '#E2E8F0',
                },
                barColorPrimary: {
                    background: 'linear-gradient(90deg, #059669, #10B981)',
                    borderRadius: 4,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    borderBottom: '2px solid #E2E8F0',
                    padding: '12px 16px',
                },
                body: {
                    fontSize: '0.84rem',
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 14,
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                },
            },
        },
        MuiSkeleton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
