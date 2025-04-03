// ==UserScript==
// @name         BOSS直聘延迟点击在线简历增强版
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  当点击"geek-item-top"元素时，延迟后自动点击"在线简历"并根据关键词权重打分
// @author       Your name
// @match        *://*.zhipin.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('BOSS直聘延迟点击在线简历增强版脚本已加载');

    // 显示加载信息到界面上
    const debugElement = document.createElement('div');
    debugElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        z-index: 10000;
        font-size: 14px;
    `;
    debugElement.textContent = 'BOSS增强脚本已加载';
    document.body.appendChild(debugElement);

    // 直接添加日志按钮（而不是通过initialize）
    const logButton = document.createElement('button');
    logButton.textContent = '查看筛选日志';
    logButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 9999;
    `;
    logButton.onclick = showScreeningLog;
    document.body.appendChild(logButton);

    // 直接添加必要的CSS样式（而不是通过addStyles函数）
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .score-report-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        }

        .score-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 9999;
        }

        .toast-message {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }

        .keyword-highlight {
            color: red !important;
            font-weight: bold !important;
            font-size: 1.2em !important;
            background-color: yellow !important;
            padding: 0 3px !important;
            border-radius: 3px !important;
            display: inline-block !important;
            animation: pulse 1s infinite alternate !important;
        }

        .keyword-highlight::after {
            content: attr(data-weight);
            font-size: 0.7em;
            vertical-align: super;
            margin-left: 2px;
            color: #E91E63;
        }

        @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(styleElement);

    // 在页面上添加手动触发按钮，替代自动监控
    const triggerButton = document.createElement('button');
    triggerButton.textContent = '分析当前简历';
    triggerButton.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 9999;
    `;
    triggerButton.onclick = analyzeResumeContent;
    document.body.appendChild(triggerButton);

    // 显示初始化成功提示
    showToast('BOSS直聘自动化助手已启动', 3000);

    // 关键词权重配置
    const keywordWeights = {
        // 后端核心技能（加权）
        'Java': 6,
        'Spring': 5,
        'MongoDB': 4,
        'Redis': 4,
        '大数据': 5,

        // 前端技能（加分项）
        'React': 4,
        'Vue': 4,
        'Angular': 3,
        'TypeScript': 3,
        'JavaScript': 3,


        // 移动端（加分项）
        'Android': 3,
        'iOS': 3,
        'Flutter': 3,
        'React Native': 3,

        // 算法和AI（有价值的技能）
        '人工智能': 8,
        '机器学习': 3,
        'AI': 6,
        '算法': 3,

        // 通用/全栈（高价值）
        '全栈': 8,
        'DevOps': 3,
        'Cursor': 6,
        'Trae': 6,

        // 获奖相关（小加分）
        '获奖': 1,
        '奖项': 1,
        '第一名': 2,
        '冠军': 2,
        '金奖': 2,
        '竞赛': 1,
        '比赛': 1
    };

    // 关键词语义分组（用于去重计算）
    const keywordGroups = [
        // 后端角色类（只计算最高分的一个）
        // Java技术栈
        ['Java', 'Spring', 'SpringBoot', 'SpringCloud', 'JVM'],
        // Python相关
        ['Python', 'Django', 'Flask'],
        // 数据库通用与SQL类
        ['MySQL', 'SQL', 'PostgreSQL'],
        // NoSQL数据库
        ['MongoDB', 'Redis', 'Elasticsearch'],
        // 前端框架
        ['React', 'Vue', 'Angular'],
        // 移动开发
        ['Android', 'iOS',  'Flutter', 'React Native'],
        // 容器与云
        ['Docker', 'Kubernetes'],
        // AI/机器学习
        ['人工智能', 'AI人工智能', '机器学习', '深度学习'],
        // 获奖相关
        ['获奖', '奖项', '竞赛', '比赛'],
        // 获奖级别
        ['第一名', '冠军', '金奖']
    ];

    /*
     * 打分逻辑说明：
     * 1. 扎实的后端技术栈（约23-28分）：
     *    - 核心角色（后端/服务端）：6分
     *    - Java技术栈（Java+Spring）：约11分
     *    - 分布式/微服务：6分
     *    - 数据库技术：5-9分（数据库5分+具体实现4分）
     *    - 容器/云原生：5-6分
     *
     * 2. 前端或AI技能加分（约4-8分）：
     *    - 前端框架（React/Vue）：4分
     *    - AI/算法相关：8分(AI) 或 3分(具体算法实现)
     *
     * 3. 特殊技能加分：
     *    - 全栈：8分
     *    - Cursor/Trae：5分
     *
     * 4. 获奖经历小幅加分（约1-2分）
     *
     * 5. 关键词语义去重：同一语义组内只计算分值最高的关键词
     *    - 例如"后端"、"服务端"同时出现时，只计算6分而非12分
     *    - 避免简单堆砌关键词刷分
     *
     * 6. 每个关键词只计算一次，无论出现多少次
     *    - 减少了重复内容的权重
     *    - 降低了总体分数
     *    - 使分数计算更加精准
     *
     * 理想候选人画像：
     * - 资深后端工程师：具备完整后端技术栈(~20分) + 部分前端或AI能力(~4分) + 有竞赛获奖经历(~1分)
     * - 全栈开发者：后端基础(~12分) + 全栈经验(8分) + 前端技能(~4分) + 云原生经验(~5分)
     * - AI后端专家：后端技能(~12分) + AI专长(~8分) + 算法能力(~3分) + 容器技术(~5分)
     *
     * 调整后的阈值为25分，符合要求的候选人仍需要有多种技能组合
     */
    const SCORE_THRESHOLD = 25; // 由于每个关键词只计算一次，阈值相应调低

    // 添加点击事件监听器
    document.addEventListener('click', function(event) {
        // 检查是否点击了geek-item-top元素或其子元素
        let targetElement = event.target;
        let geekItemTop = null;

        // 检查点击的元素或其父元素是否为geek-item-top
        while (targetElement && targetElement !== document.body) {
            if (targetElement.classList && targetElement.classList.contains('geek-item-wrap')) {
                geekItemTop = targetElement;
                break;
            }
            targetElement = targetElement.parentElement;
        }

        // 如果找到geek-item-top元素
        if (geekItemTop) {
            console.log('点击了geek-item-top元素，3秒后将点击"在线简历"');

            // 防止重复处理
            if (geekItemTop.dataset.processed) return;
            geekItemTop.dataset.processed = 'true';

            // 生成1-3秒的随机延迟时间
            const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
            setTimeout(function() {
                // 查找并点击"在线简历"元素
                findAndClickOnlineResume();

                // 重置处理标记
                setTimeout(() => {
                    geekItemTop.dataset.processed = '';
                }, 1000);
            }, randomDelay);
        }
    });

    // 查找并点击"在线简历"元素
    function findAndClickOnlineResume() {
        // 方法1：通过文本内容查找
        let found = findElementsByText('在线简历');

        // 方法2：可能的特定选择器（根据网站结构可能需要调整）
        if (!found) {
            const possibleSelectors = [
                '.resume-btn',                  // 可能的类名
                'a[href*="resume"]',            // 可能的链接
                '.resume-view-btn',             // 可能的查看简历按钮
                '.online-resume-btn',           // 可能的在线简历按钮
                'button:contains("在线简历")',  // jQuery风格选择器（油猴中不工作，仅作参考）
                '.btn-container .btn-primary'   // 可能在主按钮容器内
            ];

            for (const selector of possibleSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element.textContent && element.textContent.includes('在线简历')) {
                        found = element;
                        break;
                    }
                }
                if (found) break;
            }
        }

        // 如果找到了"在线简历"元素，点击它
        if (found) {
            console.log('找到"在线简历"元素，现在点击它', found);
            found.click();

            // 添加延迟1-3秒后分析简历内容
            const analysisDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
            setTimeout(analyzeResumeContent, analysisDelay);
        } else {
            console.log('未找到"在线简历"元素');
        }
    }

    // 通过文本内容查找元素的辅助函数
    function findElementsByText(text) {
        const elements = [];

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function(node) {
                    if (node.textContent && node.textContent.includes(text)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        // 遍历可点击元素
        let clickableElements = ['A', 'BUTTON', 'INPUT', 'SPAN', 'DIV'];
        let current = walker.nextNode();

        while (current) {
            // 检查元素是否可点击
            if (clickableElements.includes(current.tagName) &&
                current.textContent.trim() === text) {
                return current; // 立即返回完全匹配的元素
            }

            // 检查子元素
            for (let i = 0; i < current.children.length; i++) {
                const child = current.children[i];
                if (child.textContent.trim() === text &&
                    clickableElements.includes(child.tagName)) {
                    return child; // 返回匹配的子元素
                }
            }

            elements.push(current);
            current = walker.nextNode();
        }

        // 如果没有精确匹配，返回第一个包含文本的元素
        for (const el of elements) {
            if (el.textContent.includes(text) &&
                (el.tagName === 'A' || el.tagName === 'BUTTON' ||
                 el.onclick || el.style.cursor === 'pointer')) {
                return el;
            }
        }

        return null;
    }

    // 分析简历内容并高亮关键词，增加权重打分系统
    function analyzeResumeContent() {
        console.log('开始分析简历内容...');

        // 查找resume-box元素
        const resumeBoxes = document.querySelectorAll('.resume-box');
        if (resumeBoxes.length === 0) {
            console.log('未找到resume-box元素');
            closePopup(); // 如果没有找到简历框，直接关闭弹窗
            return;
        }

        // 排除"其他名校毕业的牛人"板块
        const filteredResumeBoxes = Array.from(resumeBoxes).filter(box => {
            // 检查是否包含"其他名校毕业的牛人"标题
            const hasOtherGraduatesTitle = box.textContent.includes('其他名校毕业的牛人');

            // 检查是否是推荐候选人区域
            const isRecommendationSection = box.querySelector('.recommend-header') ||
                                          box.closest('.recommend-container') ||
                                          box.classList.contains('recommend-container');

            // 如果是推荐区域，记录日志并排除
            if (hasOtherGraduatesTitle || isRecommendationSection) {
                console.log('排除"其他名校毕业的牛人"或推荐候选人板块，避免信息混淆');
                return false;
            }
            return true;
        });

        console.log(`找到${resumeBoxes.length}个简历框，排除推荐区域后剩余${filteredResumeBoxes.length}个`);

        // 获取所有简历内容用于年份筛选和调试，但排除其他候选人信息
        const allResumeText = filteredResumeBoxes.map(box => box.textContent).join(' ');
        console.log("简历总内容长度: ", allResumeText.length);

        // 提取候选人姓名
        const candidateName = extractCandidateName();
        console.log("【重要信息】候选人姓名: ", candidateName || "未识别");

        // ====== 第一道关卡：毕业年份与工作经验筛选 ======
        console.log("第一道关卡：毕业年份与工作经验筛选");
        console.log("- 要求2022年及以后毕业的候选人");
        console.log("- 【强制要求】工作经验不超过3年");

        // 扫描页面查找年龄信息
        const ageMatch = allResumeText.match(/(\d+)\s*岁/);
        const age = ageMatch ? parseInt(ageMatch[1]) : null;
        console.log("检测到的年龄: ", age ? age + "岁" : "未检测到");

        // 使用增强版工作经验提取，优先从顶部标签获取
        const labelElements = document.querySelectorAll('.label-text');
        console.log("发现标签元素数量：", labelElements.length);

        // 严格检查毕业年份，优先从教育经历区域获取
        const graduationYear = extractGraduationYear(allResumeText);
        console.log("【重要信息】检测到的毕业年份: ", graduationYear || "未检测到");

        // 在这里添加严格的毕业年份筛选 - 必须是2022年及以后
        if (graduationYear && graduationYear < 2022) {
            console.log(`【筛选结果】❌ 候选人 ${candidateName || "未知"} 的毕业年份 ${graduationYear} 早于2022年，不符合要求`);

            // 显示简短原因
            showBriefRejection(`毕业年份 ${graduationYear} 早于2022年，不符合要求`);
            return;
        }

        // 使用增强的工作经验提取函数
        const experience = improvedExtractExperience(allResumeText, labelElements);
        console.log(`【重要信息】候选人 ${candidateName || "未知"} 毕业年份: ${graduationYear || "未检测"}, 计算工作经验: ${formatExperienceDisplay(experience)}`);

        // 在页面上添加调试信息
        const debugInfo = `
            <div style="position:fixed; top:10px; right:10px; background:#f8d7da; border:1px solid #f5c6cb; padding:10px; z-index:10000; border-radius:4px; max-width:300px;">
                <h4 style="margin:0 0 5px 0; color:#721c24;">筛选调试信息</h4>
                <p style="margin:3px 0; font-size:12px;">姓名: ${candidateName || '未检测'}</p>
                <p style="margin:3px 0; font-size:12px;">毕业年份: ${graduationYear || '未检测'} ${graduationYear && graduationYear < 2022 ? '❌' : '✅'}</p>
                <p style="margin:3px 0; font-size:12px;">工作经验: ${formatExperienceDisplay(experience)} ${experience > 3 ? '❌' : '✅'} [强制 ≤ 3年]</p>
                <p style="margin:3px 0; font-size:12px;">年龄: ${age || '未检测'} 岁</p>
            </div>
        `;

        // 添加调试信息到页面
        const debugDiv = document.createElement('div');
        debugDiv.innerHTML = debugInfo;
        document.body.appendChild(debugDiv);

        // 记录筛选结果到日志文件或本地存储 (用于后续校验)
        const logEntry = {
            date: new Date().toISOString(),
            name: candidateName || "未识别",
            graduationYear: graduationYear || "未检测",
            experience: formatExperienceDisplay(experience),
            age: age || "未检测",
            status: (graduationYear && graduationYear < 2022) ? "拒绝-毕业年份" :
                    (experience > 3 ? "拒绝-工作经验" : "继续评估")
        };

        // 将日志存储到localStorage，最多保存100条记录
        let screeningLog = JSON.parse(localStorage.getItem('boss_screening_log') || '[]');
        screeningLog.unshift(logEntry); // 在开头添加新记录
        if (screeningLog.length > 100) screeningLog = screeningLog.slice(0, 100); // 只保留最近100条
        localStorage.setItem('boss_screening_log', JSON.stringify(screeningLog));
        console.log("【筛选日志】已记录筛选结果: ", logEntry);

        // 检查工作年限是否符合要求 - 这是强制要求，第一优先级
        const experienceCheck = experience <= 3;
        if (!experienceCheck) {
            console.log(`【筛选结果】❌ 候选人 ${candidateName || "未知"} 工作经验 ${formatExperienceDisplay(experience)}，超过3年，不符合要求`);

            // 显示简短原因而不是详细报告
            showBriefRejection(`工作经验 ${formatExperienceDisplay(experience)}，超过3年，不符合要求`);
            return;
        }

        // 如果没有检测到毕业年份，进行更深入检查
        if (!graduationYear) {
            console.log("未检测到明确的毕业年份，检查是否为应届生...");

            // 检查标签中是否包含"应届"字样
            const hasGraduateLabel = Array.from(document.querySelectorAll('.label-text')).some(
                label => label.textContent.includes('应届') || label.textContent.includes('毕业生')
            );

            // 从简历文本中查找"应届"相关词汇
            const isNewGraduate = allResumeText.includes('应届生') ||
                                  allResumeText.includes('应届毕业') ||
                                  allResumeText.includes('应届本科') ||
                                  allResumeText.includes('应届硕士') ||
                                  allResumeText.includes('应届博士');

            // 检查右侧信息栏
            const infoPanel = document.querySelector('.confirm-adjust-info');
            const hasGraduateInfo = infoPanel && infoPanel.textContent.includes('毕业年份');

            if (hasGraduateLabel || isNewGraduate || hasGraduateInfo) {
                console.log(`【筛选结果】✅ 候选人 ${candidateName || "未知"} 检测到应届生标记，可能是未来毕业生，允许通过`);
            } else {
                console.log(`【筛选结果】⚠️ 候选人 ${candidateName || "未知"} 未检测到毕业年份且无应届生标记，无法确定是否符合要求`);

                // 显示警告但不自动关闭
                showBriefRejection(`未检测到毕业年份信息，无法确定是否符合要求`, false);

                // 5秒后移除警告标记但不关闭简历
                setTimeout(() => {
                    const warningElements = document.querySelectorAll('.brief-rejection-warning');
                    warningElements.forEach(el => {
                        if (el.parentNode) el.parentNode.removeChild(el);
                    });
                }, 5000);
            }
        }

        console.log(`【筛选结果】✅ 候选人 ${candidateName || "未知"} 毕业年份和工作经验检查通过，继续进行关键词分析`);

        // ====== 第二道关卡：关键词匹配与打分 ======
        console.log("第二道关卡：关键词匹配与打分 (阈值: " + SCORE_THRESHOLD + ")");

        // 关键词计数和分数计算
        let foundKeywords = [];
        let totalScore = 0;
        let keywordCounts = {};
        let groupScores = {}; // 记录每个语义组的最高分

        // 调试：显示所有可匹配的关键词
        console.log("可匹配的关键词: ", Object.keys(keywordWeights).join(", "));

        // 初始化语义组得分
        for (let i = 0; i < keywordGroups.length; i++) {
            groupScores[i] = { keyword: null, maxScore: 0 };
        }

        // 对简历内容进行关键词高亮处理 - 使用红色高亮样式
        resumeBoxes.forEach(box => {
            highlightKeywords(box, keywordWeights);
        });

        // 根据权重扫描关键词并计分
        resumeBoxes.forEach(box => {
            const text = box.textContent;

            for (const keyword in keywordWeights) {
                // 使用更精确的匹配，确保找到的是完整单词或专业术语
                if (text.includes(keyword)) {
                    if (!keywordCounts[keyword]) {
                        keywordCounts[keyword] = 0;
                        foundKeywords.push(keyword);
                    }

                    // 计数加1
                    keywordCounts[keyword]++;
                }
            }
        });

        // 根据各组最高分计算总分
        for (const keyword of foundKeywords) {
            const weight = keywordWeights[keyword];

            // 查找关键词所在组
            let groupIndex = -1;
            for (let i = 0; i < keywordGroups.length; i++) {
                if (keywordGroups[i].includes(keyword)) {
                    groupIndex = i;
                    break;
                }
            }

            // 如果在某个语义组内
            if (groupIndex >= 0) {
                // 更新语义组的最高分
                if (weight > groupScores[groupIndex].maxScore) {
                    groupScores[groupIndex] = { keyword: keyword, maxScore: weight };
                }
            } else {
                // 不在任何组内的关键词直接计分一次（无论出现多少次）
                totalScore += weight;
                console.log(`计分：${keyword} 不在任何语义组中，直接计 ${weight} 分 (出现${keywordCounts[keyword]}次)`);
            }
        }

        // 将各组的最高分加入总分
        let groupScoreTotal = 0;
        for (const groupIndex in groupScores) {
            if (groupScores[groupIndex].maxScore > 0) {
                groupScoreTotal += groupScores[groupIndex].maxScore;
                console.log(`计分：组 ${groupIndex} 使用关键词 ${groupScores[groupIndex].keyword} 计 ${groupScores[groupIndex].maxScore} 分`);
            }
        }
        totalScore += groupScoreTotal;

        // 打印关键词统计数据
        console.log(`关键词统计:`);
        for (let keyword in keywordCounts) {
            console.log(`${keyword}: 出现${keywordCounts[keyword]}次，得分: ${keywordWeights[keyword]}分`);
        }

        console.log(`总分: ${totalScore}，阈值: ${SCORE_THRESHOLD}`);

        // 检查是否满足所有筛选条件
        const passGraduationCheck = !graduationYear || graduationYear >= 2022;
        const passExperienceCheck = !experience || experience <= 3;
        const passScoreCheck = totalScore >= SCORE_THRESHOLD;

        // 检查是否有Java技能
        const hasJavaSkill = keywordCounts['Java'] !== undefined;

        // 必须满足Java技能要求且分数达标才能通过
        const passAllChecks = passGraduationCheck && passExperienceCheck && passScoreCheck && hasJavaSkill;

        // 根据分数判断是否显示详细报告
        if (passScoreCheck && passAllChecks) {
            // 分数足够，显示详细报告
            console.log("✅ 分数达标，显示详细评分报告");
            const reportHtml = generateScoreReport(keywordCounts, totalScore, groupScores, graduationYear, age, experience, candidateName);
            const reportElement = appendScoreReport(reportHtml);
            console.log("已添加评分报告到界面");
        } else {
            // 分数不够或没有Java技能，只显示简短原因
            console.log("❌ 筛选未通过，显示简短原因");
            if (!hasJavaSkill) {
                showBriefRejection(`缺少Java技能，无法通过筛选`);
            } else if (!passScoreCheck) {
                showBriefRejection(`技能分数 ${totalScore} 分未达标（需 ${SCORE_THRESHOLD} 分）`);
            } else if (!passGraduationCheck) {
                showBriefRejection(`毕业年份不符合要求（需2022年及以后毕业）`);
            } else if (!passExperienceCheck) {
                showBriefRejection(`工作经验超过3年，不符合要求`);
            }
        }
    }

    // 提取候选人姓名的函数
    function extractCandidateName() {
        console.log("开始提取候选人姓名...");

        // 方法1：优先从简历内容区域提取
        const resumeBoxes = document.querySelectorAll('.resume-box');
        if (resumeBoxes && resumeBoxes.length > 0) {
            console.log("找到简历内容区域，从中提取姓名");

            // 在简历框的第一个框中，通常包含候选人基本信息
            const firstBox = resumeBoxes[0];

            // 查找简历中较大字号的文本元素，通常是名字
            const nameElements = firstBox.querySelectorAll('h1, h2, h3, .name, .resume-name, .candidate-name, .resume-header strong, b');
            for (const el of nameElements) {
                const text = el.textContent.trim();
                // 名字通常很短，而且不会包含特殊符号
                if (text && text.length >= 1 && text.length < 10 && !/[,，.。:：]/.test(text)) {
                    console.log(`从简历内容区域找到可能的姓名: "${text}"`);
                    return text;
                }
            }

            // 查找简历顶部第一行文本
            const firstLineElements = firstBox.querySelectorAll('p, div, span');
            for (const el of firstLineElements) {
                if (el.offsetTop < 100) { // 只考虑顶部的元素
                    const text = el.textContent.trim();
                    if (text && text.length >= 1 && text.length < 10 && !/[,，.。:：]/.test(text)) {
                        console.log(`从简历顶部找到可能的姓名: "${text}"`);
                        return text;
                    }
                }
            }
        }

        // 方法2：查找简历头部区域中的明显名字标记
        const headerElements = document.querySelectorAll('.resume-header, .header, .candidate-header');
        for (const header of headerElements) {
            // 只在明确是简历头部的元素内查找
            if (header.closest('.resume-box') || header.closest('.boss-popup')) {
                const nameElements = header.querySelectorAll('h1, h2, h3, .name, strong, b');
                for (const el of nameElements) {
                    const text = el.textContent.trim();
                    if (text && text.length >= 1 && text.length < 10 && !/[,，.。:：]/.test(text)) {
                        console.log(`从简历头部找到可能的姓名: "${text}"`);
                        return text;
                    }
                }
            }
        }

        // 方法3：从信息面板中提取（确保是简历的信息面板，不是页面的其他部分）
        const infoPanels = document.querySelectorAll('.resume-info, .user-info, .candidate-info');
        for (const panel of infoPanels) {
            // 确保这个面板是简历内的
            if (panel.closest('.resume-box') || panel.closest('.boss-popup')) {
                const children = panel.children;
                if (children && children.length > 0) {
                    const text = children[0].textContent.trim();
                    if (text && text.length >= 1 && text.length < 10) {
                        console.log(`从信息面板找到可能的姓名: "${text}"`);
                        return text;
                    }
                }
            }
        }

        // 方法4：从页面标题提取（有些简历页面标题会包含姓名）
        const pageTitle = document.title;
        const titleMatch = pageTitle.match(/(.+)的简历/);
        if (titleMatch && titleMatch[1] && titleMatch[1].length < 10) {
            console.log(`从页面标题找到可能的姓名: "${titleMatch[1]}"`);
            return titleMatch[1];
        }

        console.log("未能找到候选人姓名");
        return "未知候选人";
    }

    // 修改评分报告生成函数，增加候选人姓名
    function generateScoreReport(keywordCounts, totalScore, groupScores, graduationYear, age, experience, candidateName) {
        let report = `<div class="score-report">
            <h3>${candidateName ? candidateName + ' - ' : ''}候选人评分报告</h3>
            <div class="total-score-box">
                总分: <strong>${totalScore}</strong> / 阈值: ${SCORE_THRESHOLD}
            </div>

            <div class="candidate-info-box">
                ${candidateName ? `<div class="candidate-name">姓名: ${candidateName}</div>` : ''}
                ${graduationYear ? `<div class="graduation-year">毕业年份: ${graduationYear} ${graduationYear < 2022 ? '❌' : '✓'}</div>` : ''}
                ${experience !== null ? `<div class="experience">工作经验: ${formatExperienceDisplay(experience)} ${experience > 3 ? '❌' : '✓'}</div>` : ''}
                ${age ? `<div class="age">年龄: ${age}岁</div>` : ''}
            </div>

            <div class="score-explanation-box">
                <p>分数说明：每个关键词只计算一次，无论出现多少次。语义相似关键词只计算最高分的一个，例如"React"、"Vue"同时出现只计算得分最高的一个。</p>
                <p>筛选条件：要求2022年及以后毕业的候选人（工作经验不超过3年）。<strong>必须有Java技能</strong>，且技能分数达到${SCORE_THRESHOLD}分。</p>
            </div>

            <div class="semantic-groups-section">
                <h4>语义分组得分</h4>
                <table class="keyword-scores">
                    <tr>
                        <th>分组类型</th>
                        <th>选用关键词</th>
                        <th>权重</th>
                        <th>出现次数</th>
                        <th>得分</th>
                    </tr>`;

        // 显示每个语义组的得分情况（只显示有得分的组）
        let hasGroupScores = false;
        // 按分数从高到低排序
        const groupIndices = Object.keys(groupScores)
            .map(index => parseInt(index))
            .sort((a, b) => {
                const scoreA = groupScores[a].maxScore || 0;
                const scoreB = groupScores[b].maxScore || 0;
                return scoreB - scoreA;
            });

        groupIndices.forEach(index => {
            const groupData = groupScores[index];
            if (groupData && groupData.keyword) {
                hasGroupScores = true;
                const keyword = groupData.keyword;
                const count = keywordCounts[keyword];
                const weight = keywordWeights[keyword];
                const score = weight; // 只算1次权重

                // 确定组名
                let groupName = "";
                if (index === 0) groupName = "Java技术栈";
                else if (index === 1) groupName = "Python相关";
                else if (index === 2) groupName = "SQL数据库";
                else if (index === 3) groupName = "NoSQL数据库";
                else if (index === 4) groupName = "前端框架";
                else if (index === 5) groupName = "移动开发";
                else if (index === 6) groupName = "容器与云";
                else if (index === 7) groupName = "AI/机器学习";
                else if (index === 8) groupName = "获奖相关";
                else if (index === 9) groupName = "获奖级别";
                else groupName = `组 ${index+1}`;

                report += `<tr>
                    <td>${groupName}</td>
                    <td class="keyword-selected">${keyword}</td>
                    <td>${weight}</td>
                    <td>${count} (计算: 1)</td>
                    <td class="score-cell">${score}</td>
                </tr>`;

                // 显示其他被忽略的同组关键词
                const group = keywordGroups[index];
                const otherKeywords = group.filter(k => k !== keyword && keywordCounts[k]);
                if (otherKeywords.length > 0) {
                    report += `<tr class="ignored-keywords">
                        <td colspan="5">
                            <small>⚠️ 同组忽略: ${otherKeywords.map(k => `${k} (${keywordWeights[k]}分×1次=${keywordWeights[k]}分)`).join(', ')}</small>
                        </td>
                    </tr>`;
                }
            }
        });

        // 没有任何组得分的提示
        if (!hasGroupScores) {
            report += `<tr>
                <td colspan="5">无分组关键词得分</td>
            </tr>`;
        }

        report += `</table>
        </div>

        <div class="independent-keywords-section">
            <h4>独立关键词得分</h4>
            <table class="keyword-scores">
                <tr>
                    <th>关键词</th>
                    <th>权重</th>
                    <th>出现次数</th>
                    <th>得分</th>
                </tr>`;

        // 查找所有不在任何组内的关键词
        let foundIndependentKeywords = false;
        let processedGroupKeywords = new Set();

        // 收集所有语义组内的关键词
        keywordGroups.forEach(group => {
            group.forEach(k => processedGroupKeywords.add(k));
        });

        // 获取所有独立关键词并按分数排序
        const independentKeywords = Object.keys(keywordCounts)
            .filter(k => !processedGroupKeywords.has(k))
            .sort((a, b) => {
                return keywordWeights[b] - keywordWeights[a];
            });

        // 显示独立关键词（不在任何语义组内）
        for (const keyword of independentKeywords) {
            foundIndependentKeywords = true;
            const count = keywordCounts[keyword];
            const weight = keywordWeights[keyword];
            const score = weight; // 每个关键词只计算一次

            report += `<tr>
                <td class="keyword-independent">${keyword}</td>
                <td>${weight}</td>
                <td>${count} (计算: 1)</td>
                <td class="score-cell">${score}</td>
            </tr>`;
        }

        // 没有独立关键词的提示
        if (!foundIndependentKeywords) {
            report += `<tr>
                <td colspan="4">无独立关键词得分</td>
            </tr>`;
        }

        // 根据毕业年份、工作经验和分数决定最终结果
        const passGraduationCheck = !graduationYear || graduationYear >= 2022;
        const passExperienceCheck = !experience || experience <= 3;
        const passScoreCheck = totalScore >= SCORE_THRESHOLD;
        const passCondition = passGraduationCheck && passExperienceCheck && passScoreCheck;

        report += `</table>
        </div>

        <div class="screening-results-section">
            <h4>筛选结果</h4>
            <ul class="screening-results-list">
                <li class="${passGraduationCheck ? 'pass-check' : 'fail-check'}">
                    毕业年份筛选: ${passGraduationCheck ? '通过' : '不通过'} (${graduationYear ? graduationYear : '未检测到'})
                </li>
                <li class="${passExperienceCheck ? 'pass-check' : 'fail-check'}">
                    工作经验筛选: ${passExperienceCheck ? '通过' : '不通过'} (${experience !== null ? formatExperienceDisplay(experience) : '未检测到'})
                </li>
                <li class="${passScoreCheck ? 'pass-check' : 'fail-check'}">
                    技能分数筛选: ${passScoreCheck ? '通过' : '不通过'} (${totalScore}/${SCORE_THRESHOLD})
                </li>
            </ul>
        </div>

        <div class="result-button ${passCondition ? 'pass' : 'fail'}">
            ${passCondition ? '✓ 通过筛选，建议求简历' : '❌ 未通过筛选，不建议求简历'}
        </div>
    </div>`;

    return report;
}

    // 创建简短拒绝理由的弹窗
    function showBriefRejection(reason, autoClose = true) {
        // 创建一个简短拒绝理由的弹窗
        const rejectionBanner = document.createElement('div');
        rejectionBanner.className = 'brief-rejection-warning';

        // 在弹窗中添加倒计时元素
        const countdownHTML = autoClose ? `<div class="rejection-countdown" style="font-size:14px; margin-top:8px; color:#ffcdd2;">5秒后自动关闭</div>` : '';

        rejectionBanner.innerHTML = `
            <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);
                        background-color:#f44336; color:white; padding:20px;
                        border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.2); z-index:10000;
                        font-size:18px; font-weight:bold; text-align:center;">
                ❌ 不符合筛选条件<br>
                ${reason}<br>
                ${autoClose ? '脚本将自动关闭此简历' : '请手动确认是否继续查看'}
                ${countdownHTML}
            </div>
        `;
        document.body.appendChild(rejectionBanner);

        // 标记为正在处理中，避免同时处理多个候选人
        window.skipFindNext = true;

        // 如果设置了自动关闭，则自动淡出效果
        if (autoClose) {
            // 添加倒计时
            let secondsLeft = 5;
            const countdownElement = rejectionBanner.querySelector('.rejection-countdown');

            const countdownInterval = setInterval(() => {
                secondsLeft--;
                if (countdownElement && secondsLeft > 0) {
                    countdownElement.textContent = `${secondsLeft}秒后自动关闭`;
                } else {
                    clearInterval(countdownInterval);
                }
            }, 1000);

            // 5秒后添加淡出效果
            setTimeout(() => {
                rejectionBanner.style.transition = 'opacity 0.3s';
                rejectionBanner.style.opacity = '0';

                // 淡出后移除元素
                setTimeout(() => {
                    if (rejectionBanner.parentNode) {
                        document.body.removeChild(rejectionBanner);
                    }

                    // 等待3秒后再关闭简历，确保用户有足够时间查看
                    setTimeout(() => {
                        // 重置标记，允许继续处理下一个候选人
                        window.skipFindNext = false;

                        // 关闭当前简历弹窗
                        closePopup();
                    }, 3000);
                }, 300);
            }, 5000);  // 显示5秒
        }

        return rejectionBanner;
    }

    // 修改附加评分报告的函数，只对分数足够的显示详细报告
    function appendScoreReport(reportHtml, targetElement) {
        // 首先检查并移除已存在的报告
        const existingOverlays = document.querySelectorAll('.score-report-overlay');
        if (existingOverlays.length > 0) {
            console.log(`发现${existingOverlays.length}个已存在的评分报告，先移除`);
            existingOverlays.forEach(overlay => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            });
        }

        // 创建一个覆盖整个屏幕的半透明背景
        const overlay = document.createElement('div');
        overlay.className = 'score-report-overlay';
        overlay.id = 'current-score-report'; // 添加唯一ID便于识别
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // 创建评分报告容器
        const reportContainer = document.createElement('div');
        reportContainer.className = 'score-report-container';
        reportContainer.innerHTML = reportHtml;
        reportContainer.style.cssText = `
            width: 680px;
            max-height: 90%;
            overflow-y: auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            animation: fadeInScale 0.3s ease-out;
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInScale {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .score-report-container {
                font-family: Arial, sans-serif;
                border: 1px solid #ddd;
            }

            .score-report h3 {
                color: #333;
                text-align: center;
                margin: 0;
                font-size: 18px;
                padding: 15px;
                background-color: #42b983;
                color: white;
            }

            .total-score-box {
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin: 0;
                padding: 15px;
                background-color: #f2f7f2;
            }

            .total-score-box strong {
                color: #333;
            }

            .candidate-info-box {
                padding: 10px 15px;
            }

            .candidate-info-box div {
                margin: 5px 0;
                font-size: 14px;
            }

            .score-explanation-box {
                background-color: #fff9c4;
                padding: 15px;
                margin: 0;
            }

            .score-explanation-box p {
                margin: 5px 0;
                font-size: 14px;
            }

            .semantic-groups-section,
            .independent-keywords-section {
                padding: 0;
                margin: 0;
                background-color: #f5f5f5;
            }

            .score-report h4 {
                margin: 0;
                padding: 10px 15px;
                font-size: 16px;
                color: #333;
                background-color: #e8eaf6;
            }

            .keyword-scores {
                width: 100%;
                border-collapse: collapse;
                margin: 0;
            }

            .keyword-scores th {
                background-color: #e8eaf6;
                padding: 10px;
                text-align: left;
                font-weight: bold;
                border: 1px solid #ddd;
            }

            .keyword-scores td {
                padding: 10px;
                border: 1px solid #ddd;
            }

            .keyword-selected {
                color: #2196F3;
                font-weight: bold;
            }

            .keyword-independent {
                color: #9C27B0;
                font-weight: bold;
            }

            .score-cell {
                font-weight: bold;
                text-align: center;
            }

            .ignored-keywords {
                background-color: #ffebee;
            }

            .ignored-keywords small {
                color: #757575;
                font-style: italic;
            }

            .screening-results-section {
                background-color: #f0f4f8;
                padding: 0;
                margin: 0;
            }

            .screening-results-list {
                list-style-type: none;
                padding: 0;
                margin: 0;
            }

            .screening-results-list li {
                padding: 10px 15px;
                margin: 0;
            }

            .pass-check {
                background-color: #c8e6c9;
                color: #2e7d32;
            }

            .fail-check {
                background-color: #ffcdd2;
                color: #c62828;
            }

            .result-button {
                padding: 15px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                color: white;
            }

            .result-button.pass {
                background-color: #4CAF50;
            }

            .result-button.fail {
                background-color: #F44336;
            }

            /* 添加一个倒计时指示器 */
            .countdown-timer {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.6);
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);

        // 将报告容器添加到覆盖层
        overlay.appendChild(reportContainer);

        // 添加倒计时指示器
        const countdownTimer = document.createElement('div');
        countdownTimer.className = 'countdown-timer';
        countdownTimer.textContent = '8s';
        reportContainer.appendChild(countdownTimer);

        // 将覆盖层添加到文档中
        document.body.appendChild(overlay);

        console.log("已添加评分报告弹窗，将显示8秒");

        // 设置倒计时
        let secondsLeft = 8;
        const countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft > 0) {
                countdownTimer.textContent = secondsLeft + 's';
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);

        // 设置标记，控制处理流程
        window.skipFindNext = true;

        // 设置8秒后自动关闭
        const autoCloseTimer = setTimeout(() => {
            // 检查报告是否仍然存在
            if (!document.getElementById('current-score-report')) {
                console.log("报告已不存在，跳过自动关闭");
                return;
            }

            // 添加淡出动画
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';

            // 动画结束后移除元素
            setTimeout(() => {
                // 清除倒计时
                clearInterval(countdownInterval);

                // 在移除元素前先获取分数
                const scoreElement = reportContainer.querySelector('.total-score-box strong');
                const score = scoreElement ? parseInt(scoreElement.textContent) : 0;

                document.body.removeChild(overlay);
                console.log("评分报告已自动关闭");

                // 移除调试信息
                const debugDiv = document.querySelector('div[style*="筛选调试信息"]');
                if (debugDiv && debugDiv.parentNode) {
                    document.body.removeChild(debugDiv);
                }

                // 延迟8秒后再请求简历，确保用户有足够时间查看评分报告
                console.log("分数达标，将在8秒后请求此简历");
                setTimeout(() => {
                    requestResume();

                    // 再等待8秒后才处理下一个简历，确保当前简历完全处理完成
                    setTimeout(() => {
                        console.log("当前简历处理完毕，准备处理下一个");
                        // 设置标记，表明是从评分报告流程中调用closePopup
                        window.skipFindNext = false; // 重置标记，允许closePopup中处理下一个简历
                        closePopup(); // 关闭当前简历
                    }, 8000);
                }, 8000);
            }, 300);
        }, 8000);  // 显示8秒

        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerText = '关闭报告';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeButton.onclick = function() {
            clearTimeout(autoCloseTimer); // 清除自动关闭的定时器
            clearInterval(countdownInterval); // 清除倒计时

            // 添加淡出动画
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';

            // 动画结束后移除元素
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                console.log("评分报告已手动关闭");

                // 重置处理流程标记
                window.skipFindNext = false;
            }, 300);
        };
        reportContainer.appendChild(closeButton);

        return reportContainer;
    }

    // 对简历内容进行关键词高亮处理，红色高亮样式
    function highlightKeywords(box, keywordWeights) {
        const originalHTML = box.innerHTML;
        let highlightedHTML = originalHTML;

        // 先排序关键词，长词优先匹配，避免部分匹配问题
        const sortedKeywords = Object.keys(keywordWeights).sort((a, b) => b.length - a.length);

        for (const keyword of sortedKeywords) {
            // 创建一个安全的正则表达式模式
            const escKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let regex;

            // 对于英文关键词使用单词边界
            if (/^[a-zA-Z0-9_]+$/.test(keyword)) {
                regex = new RegExp(`\\b${escKeyword}\\b`, 'g');
            } else {
                regex = new RegExp(escKeyword, 'g');
            }

            // 避免高亮已经高亮过的内容
            if (highlightedHTML.includes(`data-highlighted="${keyword}"`)) {
                continue;
            }

            // 高亮替换 - 使用红色高亮样式
            highlightedHTML = highlightedHTML.replace(regex, match => {
                const weight = keywordWeights[keyword];
                return `<span data-highlighted="${keyword}" style="display: inline-block; background-color: #ffeb3b; color: #d50000; padding: 0 3px; border-radius: 3px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${match}<sup style="font-size:11px; color:#1565C0; margin-left:2px;">[${weight}分]</sup></span>`;
            });
        }

        // 更新内容
        if (highlightedHTML !== originalHTML) {
            box.innerHTML = highlightedHTML;
        }
    }

    // 增强工作经验识别功能，优先使用简历顶部信息
    function improvedExtractExperience(text, labelElements) {
        console.log("开始提取工作经验信息...");
        let experienceFromLabel = null;
        let experienceFromEducation = null;

        // 方法1：优先从教育经历提取最晚毕业年份
        console.log("优先从教育经历提取毕业年份计算工作经验");
        const graduationYear = extractGraduationYear(text);
        if (graduationYear) {
            console.log(`提取到最晚毕业年份: ${graduationYear}`);
            const currentYear = new Date().getFullYear();

            // 判断是否为应届生
            if (graduationYear > currentYear) {
                console.log(`毕业年份在未来 ${graduationYear}，判定为应届生`);
                return 0.5; // 应届生，表示为<1年
            }

            // 计算工作经验年限
            experienceFromEducation = Math.max(0, currentYear - graduationYear);
            console.log(`根据毕业年份 ${graduationYear} 计算工作经验: ${experienceFromEducation}年`);

            // 直接返回基于教育经历计算的工作经验
            return experienceFromEducation;
        } else {
            console.log("未能从教育经历提取到有效的毕业年份");
        }

        // 方法2：从顶部标签提取工作经验（作为备用方法）
        console.log("从顶部标签提取工作经验作为备用");
        if (labelElements && labelElements.length >= 3) {
            // 打印所有标签内容，便于调试
            let allLabels = [];
            for (let i = 0; i < labelElements.length; i++) {
                const labelText = labelElements[i].textContent.trim();
                allLabels.push(`"${labelText}"`);
            }
            console.log(`所有标签: ${allLabels.join(', ')}`);

            // 找到年龄标签的位置
            let ageIndex = -1;
            for (let i = 0; i < labelElements.length; i++) {
                const labelText = labelElements[i].textContent.trim();
                if (labelText.includes('岁')) {
                    ageIndex = i;
                    console.log(`找到年龄标签: "${labelText}", 位置: ${ageIndex+1}`);
                    break;
                }
            }

            // 如果找到年龄标签，直接获取其后的标签作为工作经验
            if (ageIndex >= 0 && ageIndex + 1 < labelElements.length) {
                const expLabel = labelElements[ageIndex + 1].textContent.trim();
                console.log(`年龄标签后面的标签: "${expLabel}"`);

                // 检查是否为应届生标签
                if (expLabel.includes('应届')) {
                    console.log(`检测到应届生标记: "${expLabel}"`);
                    return 0.5; // 应届毕业生
                }

                // 检查是否包含"1年以内"等表述
                if (expLabel.includes('1年以内') ||
                    expLabel.includes('不足1年') ||
                    expLabel.includes('少于1年') ||
                    expLabel.includes('1年以下') ||
                    expLabel.includes('低于1年')) {
                    console.log(`检测到"1年以内"表述: "${expLabel}"`);
                    return 0.8; // 1年以内
                }

                // 提取年数，优先匹配"X年"格式
                const yearMatch = expLabel.match(/(\d+)\s*年/);
                if (yearMatch && yearMatch[1]) {
                    experienceFromLabel = parseInt(yearMatch[1]);
                    console.log(`从标签提取到工作经验: ${experienceFromLabel}年`);
                    return experienceFromLabel;
                }

                // 如果是纯数字，也视为工作年限
                const numMatch = expLabel.match(/^(\d+)$/);
                if (numMatch && numMatch[1]) {
                    experienceFromLabel = parseInt(numMatch[1]);
                    console.log(`从标签提取到工作经验(纯数字): ${experienceFromLabel}年`);
                    return experienceFromLabel;
                }

                // 如果无法解析，但确认是经验标签（在年龄后面的位置）
                console.log(`无法从标签 "${expLabel}" 提取数字，默认为1年经验`);
                return 1;
            } else {
                console.log("未找到年龄标签或年龄标签后没有更多标签");
            }
        } else {
            console.log("标签元素不足，无法从标签栏提取工作经验");
        }

        // 如果以上方法都失败，默认返回1年
        console.log("无法从教育经历或标签提取工作经验，使用默认值: 1年");
        return 1;
    }

    // 确保生成报告时正确显示工作经验
    function formatExperienceDisplay(experience) {
        if (experience === 0.5) {
            return '<1年(应届)';
        } else if (experience === 0.8) {
            return '<1年';
        } else {
            return experience + '年';
        }
    }

    // 添加自动请求简历的函数
    function requestResume() {
        // 查找并点击"求简历"按钮
        console.log('尝试点击"求简历"按钮');

        // 尝试常见的"求简历"按钮选择器
        const requestSelectors = [
            'button:contains("求简历")',
            '.request-resume-btn',
            '.btn-request',
            '.btn-primary:contains("求简历")',
            'a:contains("求简历")',
            '[data-text="求简历"]',
            '.btn-outline:contains("求简历")'
        ];

        let requestButton = null;

        // 先通过文本内容查找
        requestButton = findElementsByText('求简历');

        // 如果没找到，尝试使用选择器
        if (!requestButton) {
            for (const selector of requestSelectors) {
                try {
                    const elements = document.querySelectorAll(selector.replace(':contains', ''));
                    for (const element of elements) {
                        if (element.textContent && element.textContent.includes('求简历')) {
                            requestButton = element;
                            break;
                        }
                    }
                    if (requestButton) break;
                } catch (e) {
                    // 忽略选择器错误
                }
            }
        }

        // 如果找到了"求简历"按钮，点击它
        if (requestButton) {
            console.log('找到"求简历"按钮，点击它', requestButton);
            requestButton.click();

            // 延迟500ms后点击"确定"按钮
            setTimeout(clickConfirmButton, 500);
        } else {
            console.log('未找到"求简历"按钮');

            // 即使没找到求简历按钮，也尝试处理下一个
            setTimeout(findAndClickNextBadge, 2000);
        }
    }

    // 添加点击确认按钮的函数
    function clickConfirmButton() {
        console.log('尝试点击确认按钮');

        // 给确认弹窗一些时间出现
        setTimeout(() => {
            // 尝试常见的确认按钮选择器
            const confirmSelectors = [
                'button:contains("确定")',
                '.confirm-btn',
                '.modal-confirm',
                '.modal-footer .btn-primary',
                '.dialog-footer .btn-primary',
                'a:contains("确定")',
                '[data-text="确定"]'
            ];

            let confirmButton = null;

            // 先通过文本内容查找
            confirmButton = findElementsByText('确定');

            // 如果没找到，尝试其他常见确认文本
            if (!confirmButton) {
                confirmButton = findElementsByText('确认');
            }

            // 如果没找到，尝试使用选择器
            if (!confirmButton) {
                for (const selector of confirmSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector.replace(':contains', ''));
                        for (const element of elements) {
                            if (element.textContent && (element.textContent.includes('确定') || element.textContent.includes('确认'))) {
                                confirmButton = element;
                                break;
                            }
                        }
                        if (confirmButton) break;
                    } catch (e) {
                        // 忽略选择器错误
                    }
                }
            }

            // 如果找到了确认按钮，点击它
            if (confirmButton) {
                console.log('找到确认按钮，点击它', confirmButton);
                confirmButton.click();

                // 显示成功提示
                setTimeout(() => {
                    showToast('✅ 已自动发送求简历请求！', 3000);

                    // 在确认请求简历后，延迟一定时间再处理下一个
                    const nextDelay = Math.floor(Math.random() * 2000) + 3000; // 3-5秒随机延迟
                    console.log(`将在 ${nextDelay/1000} 秒后查找下一个待处理项`);
                    setTimeout(findAndClickNextBadge, nextDelay);
                }, 1000);
            } else {
                console.log('未找到确认按钮');

                // 即使没找到确认按钮，也尝试处理下一个
                const nextDelay = Math.floor(Math.random() * 2000) + 4000; // 4-6秒随机延迟
                setTimeout(findAndClickNextBadge, nextDelay);
            }
        }, 300); // 等待弹窗出现
    }

    // 创建并显示toast提示
    function showToast(message, duration) {
        // 检查是否已存在toast元素
        let toast = document.getElementById('keyword-toast');
        if (!toast) {
            // 创建toast元素
            toast = document.createElement('div');
            toast.id = 'keyword-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: rgba(220, 0, 0, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                font-size: 16px;
                font-weight: bold;
                z-index: 10000;
                max-width: 80%;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
                transform: translateY(-20px);
            `;
            document.body.appendChild(toast);
        }

        // 更新toast内容
        toast.textContent = message;

        // 显示toast
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // 设置自动隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';

            // 移除元素
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // 添加关闭弹窗的函数
    function closePopup() {
        console.log('尝试关闭弹窗');

        // 标记当前状态，避免重复处理
        if (window.isClosingPopup) {
            console.log('已经在关闭弹窗过程中，避免重复操作');
            return;
        }
        window.isClosingPopup = true;

        // 在函数结束时移除标记
        const clearFlag = () => {
            setTimeout(() => {
                window.isClosingPopup = false;
            }, 1000);
        };

        // 查找关闭按钮
        const closeButton = document.querySelector('.boss-popup__close');

        if (closeButton) {
            console.log('找到关闭按钮，点击它', closeButton);
            closeButton.click();

            // 检查是否需要处理下一个
            if (!window.skipFindNext) {
                // 在关闭弹窗后延迟一定时间再处理下一个简历
                const nextDelay = Math.floor(Math.random() * 2000) + 3000; // 3-5秒随机延迟
                console.log(`将在 ${nextDelay/1000} 秒后查找下一个待处理项`);
                setTimeout(findAndClickNextBadge, nextDelay);
            } else {
                console.log('跳过查找下一个候选人，等待评分报告完成处理');
                window.skipFindNext = false; // 重置标记
            }
            clearFlag();
        } else {
            console.log('未找到关闭按钮，尝试其他方法关闭');

            // 尝试其他可能的关闭按钮
            const alternativeCloseSelectors = [
                '.modal-close',
                '.close-btn',
                '.dialog-close',
                '.modal .close',
                '.popup-close',
                'button[aria-label="关闭"]',
                'i.close-icon',
                '.modal-header .close'
            ];

            let found = false;
            for (const selector of alternativeCloseSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`通过选择器 ${selector} 找到关闭按钮`);
                    element.click();
                    found = true;
                    break;
                }
            }

            // 如果还是没找到，尝试ESC键关闭
            if (!found) {
                console.log('尝试使用ESC键关闭');
                const escEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true,
                    cancelable: true
                });
                document.body.dispatchEvent(escEvent);
            }

            // 检查是否需要处理下一个
            if (!window.skipFindNext) {
                // 在尝试关闭后也设置延迟查找下一个
                const nextDelay = Math.floor(Math.random() * 2000) + 3000; // 3-5秒随机延迟
                console.log(`将在 ${nextDelay/1000} 秒后查找下一个待处理项`);
                setTimeout(findAndClickNextBadge, nextDelay);
            } else {
                console.log('跳过查找下一个候选人，等待评分报告完成处理');
                window.skipFindNext = false; // 重置标记
            }
            clearFlag();
        }
    }

    // 添加查找并点击下一个带有badge-count的geek-item-wrap元素
    function findAndClickNextBadge() {
        console.log('尝试查找下一个带有badge-count的geek-item-wrap元素');

        // 查找所有geek-item-wrap元素，并筛选出包含badge-count的元素
        const geekItems = Array.from(document.querySelectorAll('.geek-item-wrap')).filter(item => {
            return item.querySelector('.badge-count') !== null;
        });

        if (geekItems && geekItems.length > 0) {
            console.log(`找到 ${geekItems.length} 个带有badge-count的geek-item-wrap元素`);

            // 查找未处理过的第一个元素
            let nextElement = geekItems.find(item => item.dataset.autoProcessed !== 'true');

            if (nextElement) {
                console.log('找到未处理的geek-item-wrap元素，准备点击', nextElement);

                // 标记为已处理
                nextElement.dataset.autoProcessed = 'true';

                // 将页面滚动到元素位置
                nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // 延迟点击，模拟人工操作
                const clickDelay = Math.floor(Math.random() * 1000) + 1000; // 1-2秒随机延迟
                setTimeout(() => {
                    // 查找最近的可点击父元素
                    let clickTarget = nextElement;
                    for (let i = 0; i < 5; i++) {
                        if (!clickTarget) break;

                        if (clickTarget.tagName === 'A' ||
                            clickTarget.tagName === 'BUTTON' ||
                            clickTarget.classList.contains('geek-item-wrap')) {
                            break;
                        }
                        clickTarget = clickTarget.parentElement;
                    }

                    // 执行点击
                    console.log('点击元素', clickTarget);
                    clickTarget.click();

                    showToast('🔄 正在处理下一个候选人...', 2000);
                }, clickDelay);
            } else {
                console.log('所有geek-item-wrap元素已处理完毕');
                showToast('✅ 已完成所有候选人处理', 3000);

                // 延迟后重置所有标记，允许再次处理
                setTimeout(() => {
                    console.log('重置所有处理标记');
                    document.querySelectorAll('[data-auto-processed="true"]').forEach(el => {
                        el.dataset.autoProcessed = 'false';
                    });

                    // 刷新页面或执行其他操作
                    showToast('🔄 已重置，可以开始新一轮处理', 3000);
                }, 10000); // 10秒后重置
            }
        } else {
            console.log('未找到带有badge-count的geek-item-wrap元素');
            showToast('⚠️ 未找到更多候选人', 3000);
        }
    }

    // 添加防检测随机延迟函数
    function addRandomDelay(callback, minDelay = 1000, maxDelay = 3000) {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
        console.log(`添加 ${delay/1000} 秒随机延迟`);
        return setTimeout(callback, delay);
    }

    // 增加防检测鼠标移动模拟
    function simulateHumanInteraction() {
        // 创建一个函数，在页面上随机移动鼠标
        const moveMouseRandomly = () => {
            if (Math.random() > 0.7) { // 70%的概率执行，避免过于频繁
                const x = Math.floor(Math.random() * window.innerWidth);
                const y = Math.floor(Math.random() * window.innerHeight);

                // 创建并分发鼠标移动事件
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y
                });
                document.body.dispatchEvent(mouseMoveEvent);
            }
        };

        // 定期执行随机鼠标移动
        setInterval(moveMouseRandomly, 3000); // 每3秒可能执行一次
    }

    // 在脚本初始化时启动鼠标模拟
    simulateHumanInteraction();

    // 增强从简历内容中提取毕业年份的函数
    function extractGraduationYear(text) {
        console.log("开始提取毕业年份...");

        // 1. 严格查找教育经历板块
        const educationSections = findEducationSection();
        console.log(`找到教育背景区域: ${educationSections ? '是' : '否'}`);

        if (!educationSections) {
            console.log("未找到教育经历区域，无法提取毕业年份");
            return null;
        }

        // 确保educationSections是数组
        let validEducationSections = Array.isArray(educationSections) ? educationSections : [educationSections];
        console.log(`处理的教育背景区域数量: ${validEducationSections.length}`);

        let years = [];

        // 2. 只从教育经历区域提取年份
        for (const section of validEducationSections) {
            const sectionText = section.textContent;
            console.log("教育经历区域文本:", sectionText);

            // 优先匹配标准格式的年份范围 (2017-2020)
            const yearRangePattern = /(\d{4})\s*[-~至到]\s*(\d{4})/g;
            const matches = Array.from(sectionText.matchAll(yearRangePattern));

            for (const match of matches) {
                const endYear = parseInt(match[2]);
                if (endYear >= 1980 && endYear <= 2030) {
                    console.log(`找到毕业年份区间: ${match[0]}, 毕业年份: ${endYear}`);
                    years.push(endYear);
                }
            }

            // 如果没找到标准格式，再尝试其他格式
            if (years.length === 0) {
                // 查找"xxxx年毕业"格式
                const graduationPattern = /(\d{4})(?:年|\s)?(?:毕业|结束|完成)/g;
                const gradMatches = Array.from(sectionText.matchAll(graduationPattern));

                for (const match of gradMatches) {
                    const year = parseInt(match[1]);
                    if (year >= 1980 && year <= 2030) {
                        console.log(`找到毕业年份标记: ${match[0]}, 年份: ${year}`);
                        years.push(year);
                    }
                }

                // 查找"毕业年份: xxxx"格式
                const yearLabelPattern = /(?:毕业|学历)(?:年份|时间)[：:]\s*(\d{4})/g;
                const labelMatches = Array.from(sectionText.matchAll(yearLabelPattern));

                for (const match of labelMatches) {
                    const year = parseInt(match[1]);
                    if (year >= 1980 && year <= 2030) {
                        console.log(`找到带标签的毕业年份: ${match[0]}, 年份: ${year}`);
                        years.push(year);
                    }
                }
            }
        }

        if (years.length === 0) {
            console.log("未能从教育经历中提取到任何毕业年份");
            return null;
        }

        // 返回最近的毕业年份
        const latestYear = Math.max(...years);
        console.log(`提取到的最近毕业年份: ${latestYear} (从 ${years.join(', ')} 中)`);
        return latestYear;
    }

    function findEducationSection() {
        console.log("查找教育经历区域...");

        // 1. 通过明确的标题查找
        const educationTitles = [
            "教育经历", "教育背景", "学历信息", "学历经历", "教育信息",
            "教育培训", "学历", "教育", "学业经历", "学习经历", "学业信息"
        ];

        // 优先查找section标题
        for (const title of educationTitles) {
            // 查找包含此标题的section或div
            const sections = document.querySelectorAll('section, div, h2, h3, h4, p');
            for (const section of sections) {
                if (section.textContent && section.textContent.includes(title)) {
                    console.log(`找到教育经历区域标题: "${title}" 在元素: `, section);

                    // 获取包含此标题的整个区域
                    const parentSection = findParentSection(section);
                    if (parentSection) {
                        return parentSection;
                    }

                    // 如果无法获取父区域，则返回当前节点
                    return section;
                }
            }
        }

        // 2. 通过查找教育经历相关项查找区域
        const educationKeywords = [
            "毕业院校", "学校", "大学", "学院", "专业", "学位",
            "学士", "硕士", "博士", "本科", "研究生", "博士生"
        ];

        // 查找包含多个教育关键词的div或section
        const divs = document.querySelectorAll('div, section');
        for (const div of divs) {
            let keywordCount = 0;
            for (const keyword of educationKeywords) {
                if (div.textContent && div.textContent.includes(keyword)) {
                    keywordCount++;
                }
            }

            // 如果包含至少3个教育关键词，认为这是教育经历区域
            if (keywordCount >= 3) {
                console.log(`通过关键词匹配找到可能的教育经历区域: `, div);
                return div;
            }
        }

        // 3. 从简历正文中查找教育经历区块
        const resumeBoxes = document.querySelectorAll('.resume-box');
        for (const box of resumeBoxes) {
            const boxText = box.textContent;

            // 检查是否包含教育相关标题
            let isEducationSection = false;
            for (const title of educationTitles) {
                if (boxText.includes(title)) {
                    isEducationSection = true;
                    break;
                }
            }

            // 检查是否包含多个教育关键词
            if (!isEducationSection) {
                let keywordCount = 0;
                for (const keyword of educationKeywords) {
                    if (boxText.includes(keyword)) {
                        keywordCount++;
                    }
                }
                isEducationSection = keywordCount >= 3;
            }

            if (isEducationSection) {
                console.log("从简历框中找到教育经历区域: ", box);
                return box;
            }
        }

        console.log("未找到明确的教育经历区域");
        return null;
    }

    function findParentSection(element) {
        // 向上查找最多5层父元素
        let current = element;
        for (let i = 0; i < 5; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;

            // 如果找到section, .module, .card, .info-group等明显是区域的元素
            if (current.tagName === 'SECTION' ||
                current.classList.contains('module') ||
                current.classList.contains('card') ||
                current.classList.contains('info-group') ||
                current.classList.contains('resume-box')) {
                return current;
            }
        }
        return null;
    }

    // 从教育经历区域提取毕业年份
    function extractYearFromEducationSection(educationSection) {
        console.log("从教育经历区域提取毕业年份...");
        const sectionText = educationSection.textContent;

        // 提取所有的年份范围
        const yearRanges = [];

        // 1. 提取明确的年份范围
        const yearRangePatterns = [
            /(\d{4})\s*[-~至到]\s*(\d{4})/g,                      // 2018-2022, 2018至2022
            /(\d{4})[\.年]\d{1,2}[\.月]?\s*[-~至到]\s*(\d{4})/g,  // 2018.9-2022, 2018年9月至2022
            /(\d{4})\s*[-~至到]\s*(?:至今|现在|进行中)/g,        // 2018-至今, 2018至现在
            /(\d{4})\s*[-~至到]\s*(\d{2,4})/g,                   // 2018-22(简写)
            /\b(\d{4})\/(\d{4})\b/g,                              // 2018/2022
            /\b(\d{4})-(\d{4})\b/g                                // 2018-2022
        ];

        for (const pattern of yearRangePatterns) {
            const matches = Array.from(sectionText.matchAll(pattern));
            for (const match of matches) {
                let startYear = parseInt(match[1]);
                let endYear;

                // 处理"至今"的情况
                if (match[0].includes('至今') || match[0].includes('现在') || match[0].includes('进行中')) {
                    endYear = new Date().getFullYear();
                }
                // 处理简写年份
                else if (match[2] && match[2].length <= 2) {
                    const prefix = match[1].substring(0, match[1].length - match[2].length);
                    endYear = parseInt(prefix + match[2]);
                }
                // 标准情况
                else if (match[2]) {
                    endYear = parseInt(match[2]);
                }

                if (startYear >= 1980 && endYear <= 2030 && endYear > startYear) {
                    yearRanges.push({
                        start: startYear,
                        end: endYear,
                        text: match[0]
                    });
                }
            }
        }

        // 2. 获取子元素中的日期范围，更精确地处理多段教育经历
        const educationEntries = [];
        const dateElements = educationSection.querySelectorAll('time, .date, .time, .period, .year, .edu-year, span, div');
        for (const element of dateElements) {
            if (!element.textContent) continue;

            // 检查是否包含年份范围
            const text = element.textContent.trim();
            for (const pattern of yearRangePatterns) {
                const matches = Array.from(text.matchAll(pattern));
                for (const match of matches) {
                    let startYear = parseInt(match[1]);
                    let endYear;

                    // 处理"至今"的情况
                    if (match[0].includes('至今') || match[0].includes('现在') || match[0].includes('进行中')) {
                        endYear = new Date().getFullYear();
                    }
                    // 处理简写年份
                    else if (match[2] && match[2].length <= 2) {
                        const prefix = match[1].substring(0, match[1].length - match[2].length);
                        endYear = parseInt(prefix + match[2]);
                    }
                    // 标准情况
                    else if (match[2]) {
                        endYear = parseInt(match[2]);
                    }

                    if (startYear >= 1980 && endYear <= 2030 && endYear >= startYear) {
                        educationEntries.push({
                            element: element,
                            start: startYear,
                            end: endYear,
                            text: match[0]
                        });
                    }
                }
            }
        }

        // 合并两个来源的年份数据
        const allEntries = [...yearRanges, ...educationEntries];

        if (allEntries.length > 0) {
            console.log("从教育经历区域提取到以下年份范围：");
            allEntries.forEach((entry, index) => {
                console.log(`${index+1}. ${entry.start}-${entry.end} (文本: "${entry.text}")`);
            });

            // 按结束年份从大到小排序
            allEntries.sort((a, b) => b.end - a.end);

            // 返回最大的结束年份（最近的毕业年份）
            console.log(`选择最近的毕业年份: ${allEntries[0].end} (从 ${allEntries[0].start}-${allEntries[0].end})`);
            return allEntries[0].end;
        }

        // 如果没有找到明确的教育经历日期范围，查找单独的年份
        const singleYearPattern = /[学校院][^，,。]*?(\d{4})/g;
        const yearMatches = Array.from(sectionText.matchAll(singleYearPattern));

        if (yearMatches.length > 0) {
            const years = yearMatches
                .map(match => parseInt(match[1]))
                .filter(year => year >= 1980 && year <= 2030);

            if (years.length > 0) {
                const maxYear = Math.max(...years);
                console.log(`使用教育区域中找到的最大年份: ${maxYear}`);
                return maxYear;
            }
        }

        console.log("教育经历区域未能找到有效的毕业年份");
        return null;
    }

    // 添加一个查看筛选日志的功能
    function showScreeningLog() {
        console.log("显示筛选日志...");

        // 从localStorage获取日志记录
        const screeningLog = JSON.parse(localStorage.getItem('boss_screening_log') || '[]');

        if (screeningLog.length === 0) {
            alert("暂无筛选记录");
            return;
        }

        // 创建一个悬浮窗口来显示日志
        const logWindow = document.createElement('div');
        logWindow.style.cssText = `
            position: fixed;
            top: 10%;
            left: 10%;
            width: 80%;
            height: 80%;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0,0,0,0.3);
            z-index: 10001;
            padding: 20px;
            overflow: auto;
            font-family: Arial, sans-serif;
        `;

        // 创建标题和关闭按钮
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        `;

        const title = document.createElement('h2');
        title.textContent = '候选人筛选日志记录';
        title.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        `;
        closeButton.onclick = () => document.body.removeChild(logWindow);

        header.appendChild(title);
        header.appendChild(closeButton);
        logWindow.appendChild(header);

        // 添加清空日志按钮
        const clearButton = document.createElement('button');
        clearButton.textContent = '清空日志';
        clearButton.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 15px;
        `;
        clearButton.onclick = () => {
            if (confirm('确定要清空所有筛选日志吗？此操作不可恢复。')) {
                localStorage.removeItem('boss_screening_log');
                document.body.removeChild(logWindow);
                alert('日志已清空');
            }
        };
        logWindow.appendChild(clearButton);

        // 创建表格显示日志内容
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        `;

        // 添加表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">时间</th>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">姓名</th>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">毕业年份</th>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">工作经验</th>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">年龄</th>
                <th style="padding: 8px; border-bottom: 2px solid #dee2e6;">筛选结果</th>
            </tr>
        `;
        table.appendChild(thead);

        // 添加表格内容
        const tbody = document.createElement('tbody');
        screeningLog.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white';

            // 格式化日期
            const date = new Date(entry.date);
            const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

            // 根据状态设置行颜色
            if (entry.status.includes('拒绝')) {
                row.style.color = '#dc3545';
            } else if (entry.status === '继续评估') {
                row.style.color = '#28a745';
            }

            row.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${formattedDate}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.graduationYear}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.experience}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.age}</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${entry.status}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        logWindow.appendChild(table);
        document.body.appendChild(logWindow);
    }
})();