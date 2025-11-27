/**
 * Navigation Component
 * Top navigation bar
 */

import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav style={{
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 'var(--z-sticky)',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(20, 20, 30, 0.9)'
        }}>
            <div className="container">
                <div className="flex-between" style={{ padding: 'var(--space-lg) 0' }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h3 style={{
                            margin: 0,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            📊 CSV Transformer
                        </h3>
                    </Link>

                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Link
                            to="/"
                            className={`btn btn-sm ${isActive('/') ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Upload
                        </Link>

                        <Link
                            to="/deposit-map"
                            className={`btn btn-sm ${isActive('/deposit-map') ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Deposit Map
                        </Link>

                        <Link
                            to="/history"
                            className={`btn btn-sm ${isActive('/history') ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            History
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
