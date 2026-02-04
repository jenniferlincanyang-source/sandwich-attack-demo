// 三明治攻击演示 - 交互脚本

document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航
    initNavigation();
    // 初始化标签页
    initTabs();
    // 初始化模拟器
    initSimulation();
    // 初始化图表
    initChart();
    // 初始化滚动动画
    initScrollAnimations();
});

// 导航功能
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section');

    // 平滑滚动
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 滚动时更新活动链接
    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// 标签页功能
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 添加活动状态
            this.classList.add('active');
            document.getElementById(tabId + '-content').classList.add('active');
        });
    });
}

// 模拟器功能
function initSimulation() {
    const tradeAmountSlider = document.getElementById('tradeAmount');
    const slippageSlider = document.getElementById('slippage');
    const liquiditySlider = document.getElementById('liquidity');
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 更新滑块显示值
    tradeAmountSlider.addEventListener('input', function() {
        document.getElementById('tradeAmountValue').textContent = this.value + ' ETH';
    });

    slippageSlider.addEventListener('input', function() {
        document.getElementById('slippageValue').textContent = this.value + '%';
    });

    liquiditySlider.addEventListener('input', function() {
        document.getElementById('liquidityValue').textContent =
            parseInt(this.value).toLocaleString() + ' ETH';
    });

    // 模拟按钮
    simulateBtn.addEventListener('click', runSimulation);
    resetBtn.addEventListener('click', resetSimulation);
}

// 运行模拟
async function runSimulation() {
    const tradeAmount = parseFloat(document.getElementById('tradeAmount').value);
    const slippage = parseFloat(document.getElementById('slippage').value) / 100;
    const liquidity = parseFloat(document.getElementById('liquidity').value);

    // 初始状态
    const initialPrice = 100; // TOKEN/ETH
    const tokenReserve = liquidity * initialPrice;
    const k = liquidity * tokenReserve; // 恒定乘积

    // 计算用户预期获得的代币（无攻击情况）
    const expectedTokens = calculateOutput(tradeAmount, liquidity, tokenReserve);

    // 攻击者前置交易金额（基于用户交易和滑点）
    const frontrunAmount = Math.min(tradeAmount * 0.5, liquidity * 0.05);

    // 重置交易状态
    resetTransactionStatus();

    // 步骤1: 前置交易
    await animateTransaction('tx1', '执行中...');
    const afterFrontrun = executeSwap(frontrunAmount, liquidity, tokenReserve);
    await updatePoolVisual(afterFrontrun.newEthReserve, afterFrontrun.newTokenReserve, liquidity, tokenReserve);
    completeTransaction('tx1', `买入 ${afterFrontrun.output.toFixed(2)} TOKEN`);

    // 步骤2: 用户交易
    await animateTransaction('tx2', '执行中...');
    const afterVictim = executeSwap(tradeAmount, afterFrontrun.newEthReserve, afterFrontrun.newTokenReserve);
    await updatePoolVisual(afterVictim.newEthReserve, afterVictim.newTokenReserve, liquidity, tokenReserve);
    completeTransaction('tx2', `获得 ${afterVictim.output.toFixed(2)} TOKEN`, true);

    // 步骤3: 后置交易
    await animateTransaction('tx3', '执行中...');
    const backrunTokens = afterFrontrun.output;
    const afterBackrun = executeSellSwap(backrunTokens, afterVictim.newEthReserve, afterVictim.newTokenReserve);
    await updatePoolVisual(afterBackrun.newEthReserve, afterBackrun.newTokenReserve, liquidity, tokenReserve);
    completeTransaction('tx3', `卖出获得 ${afterBackrun.output.toFixed(4)} ETH`);

    // 计算结果
    const userLoss = expectedTokens - afterVictim.output;
    const attackerProfit = afterBackrun.output - frontrunAmount;

    // 显示结果
    displayResults(expectedTokens, afterVictim.output, userLoss, attackerProfit);
}

// 计算输出（AMM 恒定乘积公式）
function calculateOutput(inputAmount, inputReserve, outputReserve) {
    const inputWithFee = inputAmount * 0.997; // 0.3% 手续费
    const numerator = inputWithFee * outputReserve;
    const denominator = inputReserve + inputWithFee;
    return numerator / denominator;
}

// 执行交换（ETH -> TOKEN）
function executeSwap(ethAmount, ethReserve, tokenReserve) {
    const output = calculateOutput(ethAmount, ethReserve, tokenReserve);
    return {
        output: output,
        newEthReserve: ethReserve + ethAmount,
        newTokenReserve: tokenReserve - output
    };
}

// 执行卖出交换（TOKEN -> ETH）
function executeSellSwap(tokenAmount, ethReserve, tokenReserve) {
    const output = calculateOutput(tokenAmount, tokenReserve, ethReserve);
    return {
        output: output,
        newEthReserve: ethReserve - output,
        newTokenReserve: tokenReserve + tokenAmount
    };
}

// 动画交易状态
function animateTransaction(txId, status) {
    return new Promise(resolve => {
        const txElement = document.getElementById(txId);
        txElement.classList.remove('pending');
        txElement.classList.add('executing');
        txElement.querySelector('.tx-detail').textContent = status;
        setTimeout(resolve, 800);
    });
}

// 完成交易
function completeTransaction(txId, detail, isVictim = false) {
    const txElement = document.getElementById(txId);
    txElement.classList.remove('executing');
    txElement.classList.add('completed');
    if (isVictim) {
        txElement.classList.add('victim');
    }
    txElement.querySelector('.tx-detail').textContent = detail;
}

// 重置交易状态
function resetTransactionStatus() {
    ['tx1', 'tx2', 'tx3'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('executing', 'completed', 'victim');
        el.classList.add('pending');
        el.querySelector('.tx-detail').textContent = '等待中...';
    });
}

// 更新池子可视化
function updatePoolVisual(ethReserve, tokenReserve, initialEth, initialToken) {
    return new Promise(resolve => {
        const ethBar = document.getElementById('ethBar');
        const tokenBar = document.getElementById('tokenBar');
        const priceDisplay = document.getElementById('currentPrice');

        const ethPercent = (ethReserve / (initialEth * 1.5)) * 100;
        const tokenPercent = (tokenReserve / (initialToken * 1.5)) * 100;

        ethBar.style.height = Math.min(ethPercent, 100) + '%';
        tokenBar.style.height = Math.min(tokenPercent, 100) + '%';

        const price = tokenReserve / ethReserve;
        priceDisplay.textContent = price.toFixed(2);

        setTimeout(resolve, 500);
    });
}

// 显示结果
function displayResults(expected, actual, loss, profit) {
    document.getElementById('expectedTokens').textContent = expected.toFixed(2) + ' TOKEN';
    document.getElementById('actualTokens').textContent = actual.toFixed(2) + ' TOKEN';
    document.getElementById('userLoss').textContent = loss.toFixed(2) + ' TOKEN';
    document.getElementById('attackerProfit').textContent = profit.toFixed(4) + ' ETH';

    // 添加动画效果
    document.getElementById('simResults').style.animation = 'fadeIn 0.5s ease';
}

// 重置模拟
function resetSimulation() {
    resetTransactionStatus();

    const ethBar = document.getElementById('ethBar');
    const tokenBar = document.getElementById('tokenBar');
    ethBar.style.height = '50%';
    tokenBar.style.height = '50%';

    document.getElementById('currentPrice').textContent = '100';
    document.getElementById('expectedTokens').textContent = '-';
    document.getElementById('actualTokens').textContent = '-';
    document.getElementById('userLoss').textContent = '-';
    document.getElementById('attackerProfit').textContent = '-';
}

// 初始化图表
function initChart() {
    const canvas = document.getElementById('basicChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 设置画布大小
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    // 绘制价格影响图
    drawPriceImpactChart(ctx, canvas.width, canvas.height);
}

// 绘制价格影响图表
function drawPriceImpactChart(ctx, width, height) {
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 清除画布
    ctx.fillStyle = '#313244';
    ctx.fillRect(0, 0, width, height);

    // 绘制坐标轴
    ctx.strokeStyle = '#6c7086';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // 标签
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('时间', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('价格', 0, 0);
    ctx.restore();

    // 数据点
    const points = [
        { x: 0, y: 0.5, label: '初始价格' },
        { x: 0.25, y: 0.65, label: '前置交易后' },
        { x: 0.5, y: 0.75, label: '用户交易后' },
        { x: 0.75, y: 0.55, label: '后置交易后' },
        { x: 1, y: 0.52, label: '最终价格' }
    ];

    // 绘制线条
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((point, i) => {
        const x = padding + point.x * chartWidth;
        const y = height - padding - point.y * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // 绘制点和标签
    points.forEach((point, i) => {
        const x = padding + point.x * chartWidth;
        const y = height - padding - point.y * chartHeight;

        // 点
        ctx.fillStyle = i === 2 ? '#ef4444' : '#6366f1';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // 标签
        ctx.fillStyle = '#cdd6f4';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x, y - 15);
    });

    // 图例
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 20, 12, 12);
    ctx.fillStyle = '#cdd6f4';
    ctx.textAlign = 'left';
    ctx.fillText('用户交易点', width - 130, 30);

    // 标注受害区域
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    const victimX1 = padding + 0.25 * chartWidth;
    const victimX2 = padding + 0.5 * chartWidth;
    ctx.fillRect(victimX1, padding, victimX2 - victimX1, chartHeight);
}

// 滚动动画
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 观察所有卡片和步骤
    document.querySelectorAll('.flow-step, .bot-card, .node-card, .protection-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

// 窗口大小改变时重绘图表
window.addEventListener('resize', function() {
    initChart();
});
