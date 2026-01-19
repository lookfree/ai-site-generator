import { Link } from 'react-router-dom'

function Services() {
  const services = [
    {
      icon: '💻',
      title: '网站开发',
      description: '从企业官网到电商平台，我们提供全方位的网站开发服务，采用最新技术确保网站高性能、高安全性。',
      features: ['响应式设计', 'SEO优化', '高性能架构', '安全防护'],
    },
    {
      icon: '📱',
      title: '移动应用开发',
      description: '跨平台移动应用开发，一套代码同时支持iOS和Android，降低开发成本，加速产品上线。',
      features: ['原生性能', '跨平台支持', '用户体验优化', '持续维护'],
    },
    {
      icon: '☁️',
      title: '云服务解决方案',
      description: '帮助企业构建稳定、可扩展的云端基础设施，实现业务的弹性扩展和高可用性。',
      features: ['云架构设计', '容器化部署', '自动化运维', '成本优化'],
    },
    {
      icon: '📊',
      title: '数据分析服务',
      description: '从数据采集到可视化展示，提供完整的数据分析解决方案，帮助企业做出数据驱动的决策。',
      features: ['数据仓库', '实时分析', '可视化报表', 'AI预测'],
    },
    {
      icon: '🔒',
      title: '网络安全服务',
      description: '全面的网络安全解决方案，保护企业数据资产，防范各类网络威胁。',
      features: ['安全评估', '渗透测试', '安全加固', '应急响应'],
    },
    {
      icon: '🎓',
      title: '技术咨询与培训',
      description: '为企业提供专业的技术咨询和培训服务，帮助团队提升技术能力。',
      features: ['技术规划', '架构评审', '团队培训', '技术支持'],
    },
  ]

  return (
    <div className="page services-page">
      {/* Page Header */}
      <section className="page-header">
        <h1>我们的服务</h1>
        <p>专业的技术服务，助力企业数字化转型</p>
      </section>

      {/* Services Grid */}
      <section className="services-list">
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul className="service-features">
                {service.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="process">
        <h2>服务流程</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-number">01</div>
            <h4>需求沟通</h4>
            <p>深入了解您的业务需求和目标</p>
          </div>
          <div className="process-step">
            <div className="step-number">02</div>
            <h4>方案设计</h4>
            <p>制定详细的技术方案和实施计划</p>
          </div>
          <div className="process-step">
            <div className="step-number">03</div>
            <h4>开发实施</h4>
            <p>专业团队按计划高效执行</p>
          </div>
          <div className="process-step">
            <div className="step-number">04</div>
            <h4>交付维护</h4>
            <p>完成交付并提供持续支持</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="services-cta">
        <h2>需要定制化解决方案？</h2>
        <p>我们的专家团队随时为您提供咨询服务</p>
        <Link to="/contact" className="btn btn-primary btn-large">
          获取免费咨询
        </Link>
      </section>
    </div>
  )
}

export default Services
