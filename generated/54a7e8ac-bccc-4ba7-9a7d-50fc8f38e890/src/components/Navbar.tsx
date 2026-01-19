import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">Modern</span>
        </Link>

        <button
          className={`navbar-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <li>
            <NavLink to="/" onClick={() => setIsMenuOpen(false)}>
              首页
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" onClick={() => setIsMenuOpen(false)}>
              关于我们
            </NavLink>
          </li>
          <li>
            <NavLink to="/services" onClick={() => setIsMenuOpen(false)}>
              服务
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact" onClick={() => setIsMenuOpen(false)}>
              联系我们
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
