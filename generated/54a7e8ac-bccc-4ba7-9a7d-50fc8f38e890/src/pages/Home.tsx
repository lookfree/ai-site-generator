import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="page home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>创新驱动未来</h1>
          <p>我们提供专业的解决方案，帮助企业实现数字化转型</p>
          <div className="hero-buttons">
            <Link to="/services" className="btn btn-primary">
              了解服务
            </Link>
            <Link to="/contact" className="btn btn-secondary">
              联系我们
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-shape"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-header">
          <h2>我们的优势</h2>
          <p>为什么选择我们</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>快速高效</h3>
            <p>采用最新技术，确保项目快速交付，不影响质量</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>精准定制</h3>
            <p>根据客户需求量身定制解决方案，满足独特业务需求</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>安全可靠</h3>
            <p>严格的安全标准和质量控制，保障系统稳定运行</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>持续创新</h3>
            <p>不断探索新技术，为客户带来最前沿的解决方案</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">500+</span>
            <span className="stat-label">服务客户</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">98%</span>
            <span className="stat-label">客户满意度</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">10+</span>
            <span className="stat-label">年行业经验</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">50+</span>
            <span className="stat-label">专业团队</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>准备好开始了吗？</h2>
        <p>让我们一起打造您的下一个成功项目</p>
        <Link to="/contact" className="btn btn-primary btn-large">
          立即咨询
        </Link>
      </section>
    </div>
  )
}

export default Home
