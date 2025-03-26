# 飞书表格文件上传工具

这个工具用于将PDF文件批量上传到飞书多维表格中的指定字段。

## 功能特点

- 支持批量上传PDF文件到飞书多维表格
- 自动处理飞书API认证
- 支持指定字段上传附件
- 自动创建新记录并关联附件
- 提供详细的上传状态反馈

## 认证流程

1. **获取访问令牌**
   - 使用应用凭证（APP_ID 和 APP_SECRET）获取 tenant_access_token
   - tenant_access_token 用于后续所有API请求的认证
   - token有效期为2小时，工具会自动获取新token

2. **API认证方式**
   - 所有请求都在 Headers 中携带 `Authorization: Bearer {token}`
   - token为上一步获取的 tenant_access_token

## 上传流程

1. **文件上传**
   - 使用 `/open-apis/drive/v1/medias/upload_all` 接口
   - 将PDF文件上传到飞书云空间
   - 获取文件的 file_token

2. **创建记录**
   - 使用 `/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records` 接口
   - 创建新的数据行
   - 将文件关联到指定字段（默认为"简历"字段）

## 主要接口

1. **上传文件接口**
```http
POST https://open.feishu.cn/open-apis/drive/v1/medias/upload_all