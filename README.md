# 招聘助手工具集

这是一个用于简化招聘流程的工具集合，主要包含三个核心功能模块：简历下载、邮件附件处理和飞书表格集中管理。

## 功能概述

### 1. BOSS直聘简历下载增强工具
- 增强BOSS直聘网站的简历下载功能
- 提供更便捷的简历批量下载方式
- 优化下载文件的命名规则

### 2. 企业微信邮箱简历附件下载器
- 自动连接企业微信邮箱（使用IMAP协议）
- 支持按发件人域名过滤（如@service.bosszhipin.com）
- 自动下载PDF格式的简历附件
- 避免重复下载相同文件
- 自动整理文件名，保持可读性
- 支持断点续传（自动跳过已下载文件）

### 3. 飞书表格文件上传工具
- 将PDF文件批量上传到飞书多维表格中的指定字段
- 支持自定义上传字段名称
- 自动处理认证流程
- 提供文件批量处理能力
- 自动生成并显示表格访问链接

## 工作流程

1. **简历获取**：通过BOSS直聘增强工具下载简历
2. **邮件处理**：使用企业微信邮箱下载器自动获取邮件中的简历附件
3. **集中管理**：将获取到的简历自动上传至飞书多维表格进行统一管理

## 使用要求

### 企业微信邮箱下载器
- Python 3.6 或更高版本
- 需要设置环境变量 `EMAIL_PASSWORD`
- 依赖包：tqdm

### 飞书表格上传工具
- 需要配置飞书应用凭证（APP_ID 和 APP_SECRET）
- 支持的文件格式：PDF
- 依赖包：requests

## 认证配置

### 飞书表格认证流程
1. 使用应用凭证（APP_ID 和 APP_SECRET）获取 tenant_access_token
2. tenant_access_token 用于后续所有API请求的认证
3. token有效期为2小时，工具会自动获取新token

## 注意事项

1. 所有工具都支持批量处理，建议合理控制批量规模
2. 飞书表格上传时会自动检查并跳过重复文件
3. 建议定期检查和清理临时文件
4. 请确保网络环境稳定，特别是在批量处理时

## 贡献

欢迎提交Issue和Pull Request来帮助改进这个工具集。