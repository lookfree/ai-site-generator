import { useState, FormEvent } from 'react'

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setSubmitStatus('success')
    setFormData({ name: '', email: '', phone: '', company: '', message: '' })

    setTimeout(() => setSubmitStatus('idle'), 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="page contact-page">
      {/* Page Header */}
      <section className="page-header">
        <h1>联系我们</h1>
        <p>我们期待与您的合作</p>
      </section>

      <div className="contact-content">
        {/* Contact Form */}
        <section className="contact-form-section">
          <h2>发送消息</h2>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">姓名 *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="请输入您的姓名"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">邮箱 *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="请输入您的邮箱"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">电话</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="请输入您的电话"
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">公司名称</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="请输入公司名称"
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label htmlFor="message">留言 *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="请描述您的需求..."
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting ? '发送中...' : '发送消息'}
            </button>
            {submitStatus === 'success' && (
              <p className="form-success">消息已发送成功！我们会尽快与您联系。</p>
            )}
          </form>
        </section>

        {/* Contact Info */}
        <section className="contact-info-section">
          <h2>联系方式</h2>
          <div className="contact-info-list">
            <div className="contact-info-item">
              <span className="info-icon">📍</span>
              <div>
                <h4>地址</h4>
                <p>北京市朝阳区建国路88号<br />SOHO现代城A座18层</p>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="info-icon">📞</span>
              <div>
                <h4>电话</h4>
                <p>+86 123 4567 8900</p>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="info-icon">✉️</span>
              <div>
                <h4>邮箱</h4>
                <p>contact@example.com</p>
              </div>
            </div>
            <div className="contact-info-item">
              <span className="info-icon">🕐</span>
              <div>
                <h4>工作时间</h4>
                <p>周一至周五: 9:00 - 18:00</p>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="map-placeholder">
            <span>🗺️</span>
            <p>地图位置</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Contact
