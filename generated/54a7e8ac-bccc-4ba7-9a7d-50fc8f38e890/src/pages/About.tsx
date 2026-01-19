function About() {
  return (
    <div className="page about-page">
      {/* Page Header */}
      <section className="page-header">
        <h1>关于我们</h1>
        <p>了解我们的故事、使命和愿景</p>
      </section>

      {/* Story Section */}
      <section className="about-story">
        <div className="story-content">
          <h2>我们的故事</h2>
          <p>
            自2014年创立以来，我们始终专注于为客户提供最优质的数字化解决方案。
            从一个小团队发展到今天，我们已经服务了超过500家企业客户，
            帮助他们在数字化转型的道路上取得成功。
          </p>
          <p>
            我们相信技术的力量可以改变世界，而我们的使命就是让每一个企业
            都能享受到技术带来的便利和效率提升。
          </p>
        </div>
        <div className="story-image">
          <div className="image-placeholder">
            <span>🏢</span>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mission-vision">
        <div className="mv-card">
          <h3>我们的使命</h3>
          <p>
            通过创新的技术解决方案，帮助企业实现数字化转型，
            提升运营效率，创造更大价值。
          </p>
        </div>
        <div className="mv-card">
          <h3>我们的愿景</h3>
          <p>
            成为最受信赖的数字化转型合作伙伴，
            引领行业创新，推动社会进步。
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="values">
        <h2>核心价值观</h2>
        <div className="values-grid">
          <div className="value-item">
            <span className="value-icon">⭐</span>
            <h4>卓越品质</h4>
            <p>追求极致，精益求精</p>
          </div>
          <div className="value-item">
            <span className="value-icon">🤝</span>
            <h4>诚信为本</h4>
            <p>言行一致，值得信赖</p>
          </div>
          <div className="value-item">
            <span className="value-icon">💪</span>
            <h4>团队协作</h4>
            <p>携手共进，共创辉煌</p>
          </div>
          <div className="value-item">
            <span className="value-icon">🌱</span>
            <h4>持续成长</h4>
            <p>学无止境，不断超越</p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team">
        <h2>领导团队</h2>
        <div className="team-grid">
          <div className="team-member">
            <div className="member-avatar">👤</div>
            <h4>张明</h4>
            <p>创始人 & CEO</p>
          </div>
          <div className="team-member">
            <div className="member-avatar">👤</div>
            <h4>李华</h4>
            <p>技术总监</p>
          </div>
          <div className="team-member">
            <div className="member-avatar">👤</div>
            <h4>王芳</h4>
            <p>运营总监</p>
          </div>
          <div className="team-member">
            <div className="member-avatar">👤</div>
            <h4>陈伟</h4>
            <p>市场总监</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
