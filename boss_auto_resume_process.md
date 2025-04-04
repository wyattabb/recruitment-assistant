# BOSS直聘自动化助手

## 脚本介绍

这是一个为BOSS直聘网站设计的Tampermonkey用户脚本，能够帮助招聘者自动筛选候选人并提高招聘效率。脚本通过技术关键词匹配、毕业年份识别等方式，自动评估候选人简历并对符合条件的候选人发起简历请求。

## 主要功能

- **自动简历浏览**：自动打开候选人在线简历
- **关键词权重打分**：对简历内容进行技术关键词识别和打分
- **毕业年份筛选**：只考虑2022年及以后毕业的候选人（工作经验不超过3年）
- **语义分组去重**：相似技术栈只计算最高分，避免重复计算
- **自动求简历**：对达到分数阈值且符合毕业年份要求的候选人自动发送简历请求
- **评分报告生成**：直观展示候选人得分情况和技能匹配度
- **防检测机制**：随机延迟和模拟人工操作，避免被系统识别为自动化工具

## 安装方法

1. 安装Tampermonkey浏览器扩展（Chrome、Edge、Firefox等浏览器均可）
2. 点击Tampermonkey图标，选择"添加新脚本"
3. 将`boss_enhanced.js`文件的内容复制粘贴到编辑器中
4. 点击"保存"按钮

## 使用方法

1. 登录BOSS直聘招聘者账号
2. 进入人才页面，脚本会自动激活
3. 点击任何候选人，脚本会自动处理：
   - 打开在线简历
   - 分析简历内容和毕业年份
   - 根据关键词和毕业年份进行筛选
   - 对符合条件的候选人自动发送简历请求

## 核心功能详解

### 1. 关键词权重配置

脚本内置了技术关键词权重配置，重点关注：

- 后端核心技能（Java、Spring、MongoDB等）
- 前端技能（React、Vue、TypeScript等）
- 移动端开发（Android、iOS、Flutter等）
- 算法和AI（人工智能、机器学习等）
- 全栈与DevOps技能
- 获奖经历

每个关键词都有对应的权重分数，根据其在岗位中的重要性进行加权。

### 2. 语义分组去重

为避免简单堆砌关键词刷分，脚本实现了语义分组去重：

- 同一语义组内（如"Java"、"Spring"等Java技术栈）只计算最高分的关键词
- 每个关键词无论出现多少次，只计算一次得分
- 通过分组避免同类技术重复计分

### 3. 毕业年份识别

脚本通过多种正则表达式模式识别简历中的毕业年份：
- 常见的"xxxx年毕业"格式
- 学历相关描述中的年份
- 教育经历中的日期范围（如"2018-2022"）

只处理2022年及以后毕业的候选人，确保筛选出符合要求的应届或近几年毕业生。

### 4. 自动化流程

脚本实现了完整的自动化流程：
1. 自动点击"在线简历"
2. 分析简历内容和毕业年份
3. 打分并生成评分报告
4. 对符合条件的候选人自动点击"求简历"和"确定"按钮
5. 处理完成后自动关闭并寻找下一个候选人

### 5. 评分报告

生成详细的评分报告，包括：
- 总分和阈值对比
- 毕业年份信息
- 语义分组得分明细
- 独立关键词得分明细
- 通过/不通过的原因说明

## 脚本参数配置

- `SCORE_THRESHOLD`: 分数阈值（默认为25分），可根据招聘需求调整
- `keywordWeights`: 关键词权重配置
- `keywordGroups`: 语义分组配置，用于去重计算

## 注意事项

1. 该脚本仅供学习和研究使用，请遵守BOSS直聘的用户协议
2. 使用自动化工具可能违反平台规则，请谨慎使用
3. 请根据实际招聘需求调整关键词权重和分数阈值
4. 过于频繁的自动化操作可能导致账号被限制，建议适度使用

## 更新日志

### 版本1.1
- 增加毕业年份检测功能，只处理2022年及以后毕业的候选人
- 优化评分报告显示，添加毕业年份信息
- 改进关键词匹配逻辑，提高精确度
- 增强防检测机制，模拟人工操作

### 版本1.2
- 优化候选人名字提取逻辑，确保从简历内容区域提取正确的名字
- 改进分数报告显示，增加5秒展示时间，使用户有足够时间查看
- 在报告中添加候选人姓名，方便快速识别

### 版本1.3 (当前版本)
- 全面优化毕业年份提取逻辑，现在仅从教育经历部分提取毕业年份
- 改进工作经验计算，严格基于教育经历中的最近毕业年份
- 新增多种教育经历区域识别方法，支持各种简历格式
- 增加详细日志记录，便于调试和验证提取逻辑
- 优化了应届生识别，提高了工作经验计算的准确性
- 特别处理了特殊年份格式和日期范围，如"2018-22"、"2020至今"等
- 修复了之前版本中可能从工作经历或项目经验中错误提取年份的问题

