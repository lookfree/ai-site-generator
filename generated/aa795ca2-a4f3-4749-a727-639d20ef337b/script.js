document.addEventListener('DOMContentLoaded', function() {
    const greetBtn = document.getElementById('greetBtn');
    const message = document.getElementById('message');

    const greetings = [
        '你好！欢迎来到这里！',
        '很高兴见到你！',
        '祝你今天愉快！',
        '感谢你的访问！',
        '希望你一切顺利！'
    ];

    greetBtn.addEventListener('click', function() {
        const randomIndex = Math.floor(Math.random() * greetings.length);
        message.textContent = greetings[randomIndex];
        message.style.animation = 'none';
        message.offsetHeight;
        message.style.animation = 'fadeIn 0.5s ease';
    });
});
