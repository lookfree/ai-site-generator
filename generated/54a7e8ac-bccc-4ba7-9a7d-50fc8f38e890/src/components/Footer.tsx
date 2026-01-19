import { Link } from 'react-router-dom'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>关于我们</h3>
          <p>我们是一家专注于创新的现代化企业，致力于为客户提供优质的产品和服务。</p>
        </div>

        <div className="footer-section">
          <h3>快速链接</h3>
          <ul>
            <li><Link to="/">首页</Link></li>
            <li><Link to="/about">关于我们</Link></li>
            <li><Link to="/services">服务</Link></li>
            <li><Link to="/contact">联系我们</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>联系方式</h3>
          <ul>
            <li>邮箱: contact@example.com</li>
            <li>电话: +86 123 4567 8900</li>
            <li>地址: 北京市朝阳区</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>关注我们</h3>
          <div className="social-links">
            <a href="#" aria-label="微信">微信</a>
            <a href="#" aria-label="微博">微博</a>
            <a href="#" aria-label="LinkedIn">LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Modern Website. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
