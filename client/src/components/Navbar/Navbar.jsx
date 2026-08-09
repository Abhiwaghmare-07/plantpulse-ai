import { NavLink } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import './Navbar.css';

export default function Navbar() {
  const { isConnected } = useSocket();

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        {/* Brand */}
        <NavLink to="/" className="navbar__brand">
          <span className="navbar__logo">⚡</span>
          <div className="navbar__brand-text">
            <span className="navbar__name">PlantPulse AI</span>
            <span className="navbar__tagline">Predictive Maintenance</span>
          </div>
        </NavLink>

        {/* Nav links */}
        <nav className="navbar__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              'navbar__link' + (isActive ? ' navbar__link--active' : '')
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/manual-test"
            className={({ isActive }) =>
              'navbar__link' + (isActive ? ' navbar__link--active' : '')
            }
          >
            Manual Test
          </NavLink>
        </nav>

        {/* Live indicator */}
        <div className="navbar__status">
          <span
            className={'navbar__dot' + (isConnected ? ' navbar__dot--live' : ' navbar__dot--offline')}
          />
          <span className="navbar__status-text">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
